"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../../../lib/firebase";

import {
  FaBell,
  FaBullhorn,
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardList,
} from "react-icons/fa";

/* Default notification read state */
const DEFAULT_SEEN_STATE = {
  announcements: 0,
  bookings: 0,
  issues: 0,
};

/* Normalise text values */
function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/* Convert Firestore or JavaScript dates to milliseconds */
function getTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 0;
  }

  return parsedDate.getTime();
}

/* Get the most recent change time for an announcement */
function getAnnouncementTimestamp(announcement) {
  return Math.max(
    getTimestampValue(announcement.updatedAt),
    getTimestampValue(announcement.publishedAt),
    getTimestampValue(announcement.createdAt),
  );
}

/* Get the most recent change time for a booking */
function getBookingTimestamp(booking) {
  return Math.max(
    getTimestampValue(booking.updatedAt),
    getTimestampValue(booking.reviewedAt),
    getTimestampValue(booking.approvedAt),
    getTimestampValue(booking.rejectedAt),
    getTimestampValue(booking.createdAt),
  );
}

/* Get the most recent change time for an issue */
function getIssueTimestamp(issue) {
  return Math.max(
    getTimestampValue(issue.updatedAt),
    getTimestampValue(issue.resolvedAt),
    getTimestampValue(issue.closedAt),
    getTimestampValue(issue.createdAt),
  );
}

/* Decide whether an item is unread */
function isUnreadItem(itemTimestamp, lastSeenTimestamp) {
  if (itemTimestamp > 0) {
    return itemTimestamp > lastSeenTimestamp;
  }

  /*
   * Older documents without timestamp fields are treated as unread
   * only until the resident opens the corresponding section once.
   */
  return lastSeenTimestamp === 0;
}

/* Check whether an announcement is active */
function isAnnouncementActive(announcement) {
  const status = normaliseValue(announcement.status);

  return !["draft", "archived", "inactive", "cancelled"].includes(status);
}

/* Check whether an announcement is visible to the resident */
function isAnnouncementForResident(announcement, residentId) {
  if (!isAnnouncementActive(announcement)) {
    return false;
  }

  const audience = normaliseValue(announcement.audience);

  const isForEveryone =
    !audience ||
    audience === "all" ||
    audience === "all residents" ||
    audience === "all-residents" ||
    audience === "residents" ||
    audience === "community";

  const isSelectedResident =
    announcement.recipientResidentId === residentId ||
    announcement.residentId === residentId;

  return isForEveryone || isSelectedResident;
}

/* Check whether a booking belongs to the resident */
function isResidentBooking(booking, residentId) {
  return booking.residentId === residentId;
}

/* Check whether a booking can create a notification */
function isRelevantBooking(booking) {
  const status = normaliseValue(booking.status);

  return ["pending", "approved", "rejected"].includes(status);
}

/* Check whether an issue belongs to the resident */
function isResidentIssue(issue, residentId) {
  return (
    issue.createdBy === residentId ||
    issue.residentId === residentId ||
    issue.userId === residentId
  );
}

/* Check whether an issue can create a notification */
function isRelevantIssue(issue) {
  const status = normaliseValue(issue.status);

  return [
    "open",
    "pending",
    "in-progress",
    "in progress",
    "resolved",
    "closed",
  ].includes(status);
}

/* Create the resident-specific local storage key */
function getStorageKey(residentId) {
  return `eli-resident-notifications-seen-${residentId}`;
}

export default function ResidentNotifications({ residentId }) {
  const pathname = usePathname();

  const [showNotifications, setShowNotifications] = useState(false);

  const [announcements, setAnnouncements] = useState([]);

  const [bookings, setBookings] = useState([]);
  const [issues, setIssues] = useState([]);

  const [seenState, setSeenState] = useState(DEFAULT_SEEN_STATE);

  const [storageReady, setStorageReady] = useState(false);

  const [loadError, setLoadError] = useState(false);

  /* Load the resident notification read state */
  useEffect(() => {
    if (!residentId) {
      setSeenState(DEFAULT_SEEN_STATE);
      setStorageReady(false);
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(
        getStorageKey(residentId),
      );

      if (!storedValue) {
        setSeenState(DEFAULT_SEEN_STATE);
        setStorageReady(true);
        return;
      }

      const parsedValue = JSON.parse(storedValue);

      setSeenState({
        announcements: Number(parsedValue.announcements) || 0,

        bookings: Number(parsedValue.bookings) || 0,

        issues: Number(parsedValue.issues) || 0,
      });
    } catch (error) {
      console.error("Resident notification state loading error:", error);

      setSeenState(DEFAULT_SEEN_STATE);
    } finally {
      setStorageReady(true);
    }
  }, [residentId]);

  /* Save one notification category as seen */
  const markCategoryAsSeen = useCallback(
    (category) => {
      if (
        !residentId ||
        !storageReady ||
        !Object.prototype.hasOwnProperty.call(DEFAULT_SEEN_STATE, category)
      ) {
        return;
      }

      const seenTimestamp = Date.now();

      setSeenState((currentState) => {
        const updatedState = {
          ...currentState,
          [category]: seenTimestamp,
        };

        try {
          window.localStorage.setItem(
            getStorageKey(residentId),
            JSON.stringify(updatedState),
          );
        } catch (error) {
          console.error("Resident notification state saving error:", error);
        }

        return updatedState;
      });
    },
    [residentId, storageReady],
  );

  /* Load announcements, bookings and issue reports */
  useEffect(() => {
    if (!residentId) {
      return undefined;
    }

    setLoadError(false);

    const unsubscribeAnnouncements = onSnapshot(
      collection(db, "announcements"),
      (snapshot) => {
        const allAnnouncements = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setAnnouncements(
          allAnnouncements.filter((announcement) =>
            isAnnouncementForResident(announcement, residentId),
          ),
        );
      },
      (error) => {
        console.error("Resident announcements notification error:", error);

        setLoadError(true);
      },
    );

    const unsubscribeBookings = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const allBookings = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setBookings(
          allBookings.filter(
            (booking) =>
              isResidentBooking(booking, residentId) &&
              isRelevantBooking(booking),
          ),
        );
      },
      (error) => {
        console.error("Resident bookings notification error:", error);

        setLoadError(true);
      },
    );

    const unsubscribeIssues = onSnapshot(
      collection(db, "issueReports"),
      (snapshot) => {
        const allIssues = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setIssues(
          allIssues.filter(
            (issue) =>
              isResidentIssue(issue, residentId) && isRelevantIssue(issue),
          ),
        );
      },
      (error) => {
        console.error("Resident issues notification error:", error);

        setLoadError(true);
      },
    );

    return () => {
      unsubscribeAnnouncements();
      unsubscribeBookings();
      unsubscribeIssues();
    };
  }, [residentId]);

  /*
   * Opening a resident section marks the corresponding
   * notifications as seen.
   */
  useEffect(() => {
    if (!storageReady || !pathname) {
      return;
    }

    if (pathname.startsWith("/resident/announcements")) {
      markCategoryAsSeen("announcements");
    }

    if (pathname.startsWith("/resident/bookings")) {
      markCategoryAsSeen("bookings");
    }

    if (pathname.startsWith("/resident/issues")) {
      markCategoryAsSeen("issues");
    }

    setShowNotifications(false);
  }, [pathname, storageReady, markCategoryAsSeen]);

  /* Keep only unseen announcements */
  const unreadAnnouncements = useMemo(() => {
    if (!storageReady) {
      return [];
    }

    return announcements.filter((announcement) =>
      isUnreadItem(
        getAnnouncementTimestamp(announcement),
        seenState.announcements,
      ),
    );
  }, [announcements, seenState.announcements, storageReady]);

  /* Keep only unseen booking updates */
  const unreadBookings = useMemo(() => {
    if (!storageReady) {
      return [];
    }

    return bookings.filter((booking) =>
      isUnreadItem(getBookingTimestamp(booking), seenState.bookings),
    );
  }, [bookings, seenState.bookings, storageReady]);

  /* Keep only unseen issue updates */
  const unreadIssues = useMemo(() => {
    if (!storageReady) {
      return [];
    }

    return issues.filter((issue) =>
      isUnreadItem(getIssueTimestamp(issue), seenState.issues),
    );
  }, [issues, seenState.issues, storageReady]);

  /* Build the notification dropdown items */
  const notificationItems = useMemo(() => {
    const items = [];

    if (unreadAnnouncements.length > 0) {
      items.push({
        id: "resident-announcements",
        category: "announcements",
        icon: FaBullhorn,
        title: "Community announcements",
        text: `${unreadAnnouncements.length} new ${
          unreadAnnouncements.length === 1 ? "announcement" : "announcements"
        } available.`,
        linkText: "View announcements",
        href: "/resident/announcements",
      });
    }

    if (unreadBookings.length > 0) {
      items.push({
        id: "resident-bookings",
        category: "bookings",
        icon: FaCalendarCheck,
        title: "Booking updates",
        text: `${unreadBookings.length} new ${
          unreadBookings.length === 1 ? "booking update" : "booking updates"
        } available.`,
        linkText: "View my bookings",
        href: "/resident/bookings",
      });
    }

    if (unreadIssues.length > 0) {
      items.push({
        id: "resident-issues",
        category: "issues",
        icon: FaClipboardList,
        title: "Issue report updates",
        text: `${unreadIssues.length} new ${
          unreadIssues.length === 1 ? "issue update" : "issue updates"
        } available.`,
        linkText: "View issue reports",
        href: "/resident/issues",
      });
    }

    return items;
  }, [unreadAnnouncements, unreadBookings, unreadIssues]);

  /* Count only unread notifications */
  const notificationCount =
    unreadAnnouncements.length + unreadBookings.length + unreadIssues.length;

  return (
    <div className="resident-notification-wrap">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={showNotifications}
        className="resident-notification-button"
        onClick={() => setShowNotifications((currentValue) => !currentValue)}
      >
        <FaBell />

        {notificationCount > 0 && <span>{notificationCount}</span>}
      </button>

      {showNotifications && (
        <div className="resident-notification-dropdown">
          <div className="resident-notification-header">
            <h3>Notifications</h3>
            <p>Your unread community updates</p>
          </div>

          {loadError ? (
            <div className="resident-notification-empty">
              <FaClipboardList />

              <h4>Notifications could not be loaded.</h4>

              <p>Please refresh the page and try again.</p>
            </div>
          ) : notificationItems.length === 0 ? (
            <div className="resident-notification-empty">
              <FaCheckCircle />

              <h4>No unread notifications.</h4>

              <p>Your community information is up to date.</p>
            </div>
          ) : (
            <div className="resident-notification-list">
              {notificationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="resident-notification-item"
                    onClick={() => {
                      markCategoryAsSeen(item.category);

                      setShowNotifications(false);
                    }}
                  >
                    <div className="resident-notification-icon">
                      <Icon />
                    </div>

                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.text}</p>
                      <strong>{item.linkText}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
