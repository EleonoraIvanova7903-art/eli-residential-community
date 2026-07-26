"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import "./resident-shared.css";
import "./resident.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { auth, db } from "../../lib/firebase";

import ResidentSidebar from "./components/ResidentSidebar";
import ResidentTopbar from "./components/ResidentTopbar";

import {
  FaBullhorn,
  FaRegCalendarAlt,
  FaFolderOpen,
  FaCalendarCheck,
  FaClipboardList,
  FaArrowRight,
  FaPlus,
  FaBuilding,
  FaRegUser,
  FaMapMarkerAlt,
} from "react-icons/fa";

function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normaliseRole(value) {
  return normaliseValue(value).replace(/\s+/g, "-");
}

function formatDate(value) {
  if (!value) {
    return "Date not available";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return String(value);
}

function getDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function isAnnouncementForResident(announcement, residentId) {
  const status = normaliseValue(announcement.status);

  if (["draft", "archived", "inactive", "cancelled"].includes(status)) {
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

function isUpcomingEvent(event) {
  const status = normaliseValue(event.status);

  if (
    status === "cancelled" ||
    status === "completed" ||
    status === "inactive"
  ) {
    return false;
  }

  const eventDate = getDateValue(event.eventDate || event.date);

  if (!eventDate) {
    return true;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate >= today;
}

function isAvailableResource(resource) {
  const status = normaliseValue(resource.status);

  return (status === "available" || !status) && resource.isBookable !== false;
}

function isResidentBooking(booking, residentId) {
  return booking.residentId === residentId;
}

function isResidentIssue(issue, residentId) {
  return (
    issue.createdBy === residentId ||
    issue.residentId === residentId ||
    issue.userId === residentId
  );
}

function isPendingBooking(booking) {
  return normaliseValue(booking.status) === "pending";
}

function isOpenIssue(issue) {
  const status = normaliseValue(issue.status);

  return (
    status === "open" ||
    status === "pending" ||
    status === "in-progress" ||
    status === "in progress"
  );
}

function getStatusClass(status) {
  return normaliseValue(status)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function ResidentDashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [issueReports, setIssueReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadResidentData(residentId, isManagerPreview) {
    try {
      const [
        announcementsSnapshot,
        eventsSnapshot,
        resourcesSnapshot,
        bookingsSnapshot,
        issuesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "announcements")),
        getDocs(collection(db, "events")),
        getDocs(collection(db, "resources")),
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "issueReports")),
      ]);

      const allAnnouncements = announcementsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const allEvents = eventsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const allResources = resourcesSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const allBookings = bookingsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const allIssueReports = issuesSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setAnnouncements(
        allAnnouncements
          .filter((announcement) =>
            isAnnouncementForResident(announcement, residentId),
          )
          .sort((firstItem, secondItem) => {
            const firstDate = getDateValue(firstItem.createdAt)?.getTime() || 0;

            const secondDate =
              getDateValue(secondItem.createdAt)?.getTime() || 0;

            return secondDate - firstDate;
          }),
      );

      setEvents(
        allEvents.filter(isUpcomingEvent).sort((firstItem, secondItem) => {
          const firstDate =
            getDateValue(firstItem.eventDate || firstItem.date)?.getTime() || 0;

          const secondDate =
            getDateValue(secondItem.eventDate || secondItem.date)?.getTime() ||
            0;

          return firstDate - secondDate;
        }),
      );

      setResources(allResources.filter(isAvailableResource));

      if (isManagerPreview) {
        setBookings(
          allBookings
            .sort((firstItem, secondItem) => {
              const firstDate =
                getDateValue(firstItem.createdAt)?.getTime() || 0;

              const secondDate =
                getDateValue(secondItem.createdAt)?.getTime() || 0;

              return secondDate - firstDate;
            })
            .slice(0, 5),
        );

        setIssueReports(
          allIssueReports
            .sort((firstItem, secondItem) => {
              const firstDate =
                getDateValue(firstItem.createdAt)?.getTime() || 0;

              const secondDate =
                getDateValue(secondItem.createdAt)?.getTime() || 0;

              return secondDate - firstDate;
            })
            .slice(0, 5),
        );
      } else {
        setBookings(
          allBookings
            .filter((booking) => isResidentBooking(booking, residentId))
            .sort((firstItem, secondItem) => {
              const firstDate =
                getDateValue(firstItem.createdAt)?.getTime() || 0;

              const secondDate =
                getDateValue(secondItem.createdAt)?.getTime() || 0;

              return secondDate - firstDate;
            }),
        );

        setIssueReports(
          allIssueReports
            .filter((issue) => isResidentIssue(issue, residentId))
            .sort((firstItem, secondItem) => {
              const firstDate =
                getDateValue(firstItem.createdAt)?.getTime() || 0;

              const secondDate =
                getDateValue(secondItem.createdAt)?.getTime() || 0;

              return secondDate - firstDate;
            }),
        );
      }
    } catch (error) {
      console.error("Resident dashboard loading error:", error);

      setMessage("Dashboard information could not be loaded.");
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          await signOut(auth);
          router.push("/login");
          return;
        }

        const userData = userSnapshot.data();

        const userRole = normaliseRole(userData.role);
        const userStatus = normaliseValue(userData.status);
        const accountIsActive = userData.isActive !== false;

        const isApprovedResident =
          userRole === "resident" &&
          userStatus === "approved" &&
          accountIsActive;

        const isApprovedManager =
          userRole === "building-manager" &&
          userStatus === "approved" &&
          accountIsActive;

        if (!isApprovedResident && !isApprovedManager) {
          await signOut(auth);
          router.push("/login");
          return;
        }

        setCurrentUser(user);
        setResidentProfile(userData);
        setPreviewMode(isApprovedManager);

        await loadResidentData(user.uid, isApprovedManager);

        setLoading(false);
      } catch (error) {
        console.error("Resident access error:", error);

        await signOut(auth);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  const pendingBookings = bookings.filter(isPendingBooking);
  const openIssueReports = issueReports.filter(isOpenIssue);

  const latestAnnouncements = announcements.slice(0, 3);
  const upcomingEvents = events.slice(0, 3);
  const recentBookings = bookings.slice(0, 3);
  const recentIssues = issueReports.slice(0, 3);
  const availableResources = resources.slice(0, 4);

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading resident dashboard...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="dashboard"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="Resident Dashboard"
          subtitle={
            previewMode
              ? "Resident area preview"
              : `Welcome back, ${residentProfile?.firstName || "Resident"}.`
          }
          residentId={currentUser?.uid}
        />

        {message && <p className="resident-message">{message}</p>}

        <section className="resident-dashboard-hero">
          <div className="resident-hero-content">
            <span className="resident-hero-label">Community Overview</span>

            <h2>Your community information in one place</h2>

            <p>
              Review announcements, upcoming events, shared resources, booking
              requests and issue report updates.
            </p>

            <div className="resident-home-details">
              <span>
                <FaBuilding />

                {residentProfile?.building || "Eli Residential Community"}
              </span>

              <span>
                <FaRegUser />

                {residentProfile?.apartment
                  ? `Apartment ${residentProfile.apartment}`
                  : previewMode
                    ? "Resident preview"
                    : "Apartment not recorded"}
              </span>
            </div>
          </div>

          <div className="resident-hero-actions">
            <Link href="/resident/bookings">
              <FaCalendarCheck />
              <span>My Bookings</span>
            </Link>

            <Link href="/resident/issues">
              <FaPlus />
              <span>Report an Issue</span>
            </Link>

            <Link href="/resident/announcements">
              <FaBullhorn />
              <span>Announcements</span>
            </Link>

            <Link href="/resident/resources">
              <FaFolderOpen />
              <span>Resources</span>
            </Link>
          </div>
        </section>

        <section className="resident-overview-grid">
          <article className="resident-overview-card">
            <div className="resident-overview-icon">
              <FaBullhorn />
            </div>

            <div>
              <p>Announcements</p>
              <h2>{announcements.length}</h2>
              <span>Current community notices</span>

              <Link href="/resident/announcements">
                View <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="resident-overview-card">
            <div className="resident-overview-icon">
              <FaRegCalendarAlt />
            </div>

            <div>
              <p>Upcoming Events</p>
              <h2>{events.length}</h2>
              <span>Community events ahead</span>

              <Link href="/resident/events">
                View <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="resident-overview-card">
            <div className="resident-overview-icon">
              <FaFolderOpen />
            </div>

            <div>
              <p>Available Resources</p>
              <h2>{resources.length}</h2>
              <span>Bookable shared facilities</span>

              <Link href="/resident/resources">
                View <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="resident-overview-card">
            <div className="resident-overview-icon">
              <FaCalendarCheck />
            </div>

            <div>
              <p>Pending Bookings</p>
              <h2>{pendingBookings.length}</h2>
              <span>Requests awaiting review</span>

              <Link href="/resident/bookings">
                View <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="resident-overview-card">
            <div className="resident-overview-icon warning">
              <FaClipboardList />
            </div>

            <div>
              <p>Open Issues</p>
              <h2>{openIssueReports.length}</h2>
              <span>Reports still in progress</span>

              <Link href="/resident/issues">
                View <FaArrowRight />
              </Link>
            </div>
          </article>
        </section>

        <section className="resident-focus-grid">
          <article className="resident-panel">
            <div className="resident-panel-heading">
              <div>
                <FaBullhorn />
                <h2>Latest Announcements</h2>
              </div>

              <Link href="/resident/announcements">View all</Link>
            </div>

            <div className="resident-announcement-list">
              {latestAnnouncements.length === 0 ? (
                <p className="resident-empty-text">
                  No announcements are available at the moment.
                </p>
              ) : (
                latestAnnouncements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="resident-announcement-item"
                  >
                    <div className="resident-announcement-icon">
                      <FaBullhorn />
                    </div>

                    <div>
                      <div className="resident-item-heading">
                        <h3>
                          {announcement.title || "Community announcement"}
                        </h3>

                        <span>{announcement.priority || "Standard"}</span>
                      </div>

                      <p>
                        {announcement.message ||
                          announcement.description ||
                          "No additional information provided."}
                      </p>

                      <small>{formatDate(announcement.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <div className="resident-side-stack">
            <article className="resident-mini-panel">
              <div className="resident-mini-heading">
                <FaRegCalendarAlt />
                <h2>Next Community Event</h2>
              </div>

              {upcomingEvents[0] ? (
                <>
                  <h3>{upcomingEvents[0].title || "Community event"}</h3>

                  <p>
                    {formatDate(
                      upcomingEvents[0].eventDate || upcomingEvents[0].date,
                    )}
                  </p>

                  <span>
                    <FaMapMarkerAlt />

                    {upcomingEvents[0].location || "Location to be confirmed"}
                  </span>

                  <Link href="/resident/events">
                    View events <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>No upcoming events are currently scheduled.</p>

                  <Link href="/resident/events">
                    Open events <FaArrowRight />
                  </Link>
                </>
              )}
            </article>

            <article className="resident-mini-panel">
              <div className="resident-mini-heading">
                <FaCalendarCheck />
                <h2>Latest Booking</h2>
              </div>

              {recentBookings[0] ? (
                <>
                  <h3>
                    {recentBookings[0].resourceName || "Resource booking"}
                  </h3>

                  <p>
                    {formatDate(
                      recentBookings[0].bookingDate ||
                        recentBookings[0].createdAt,
                    )}
                  </p>

                  <span
                    className={`resident-status ${getStatusClass(
                      recentBookings[0].status,
                    )}`}
                  >
                    {recentBookings[0].status || "Pending"}
                  </span>

                  <Link href="/resident/bookings">
                    View bookings <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>You have not submitted any booking requests.</p>

                  <Link href="/resident/bookings">
                    Open bookings <FaArrowRight />
                  </Link>
                </>
              )}
            </article>
          </div>
        </section>

        <section className="resident-content-grid">
          <article className="resident-panel">
            <div className="resident-panel-heading">
              <div>
                <FaRegCalendarAlt />
                <h2>Upcoming Events</h2>
              </div>

              <span>{events.length} scheduled</span>
            </div>

            <div className="resident-list">
              {upcomingEvents.length === 0 ? (
                <p className="resident-empty-text">
                  No upcoming community events.
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <div className="resident-list-row" key={event.id}>
                    <div className="resident-date-box">
                      <strong>
                        {formatDate(event.eventDate || event.date)}
                      </strong>
                    </div>

                    <div>
                      <h3>{event.title || "Community event"}</h3>
                      <p>{event.location || "Location not recorded"}</p>
                    </div>

                    <span>{event.eventTime || event.time || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="resident-panel">
            <div className="resident-panel-heading">
              <div>
                <FaFolderOpen />
                <h2>Available Resources</h2>
              </div>

              <span>{resources.length} available</span>
            </div>

            <div className="resident-list">
              {availableResources.length === 0 ? (
                <p className="resident-empty-text">
                  No resources are currently available.
                </p>
              ) : (
                availableResources.map((resource) => (
                  <div className="resident-list-row" key={resource.id}>
                    <div className="resident-list-icon">
                      <FaFolderOpen />
                    </div>

                    <div>
                      <h3>
                        {resource.name || resource.title || "Shared resource"}
                      </h3>

                      <p>{resource.location || "Location not recorded"}</p>
                    </div>

                    <span>{resource.status || "Available"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="resident-panel">
            <div className="resident-panel-heading">
              <div>
                <FaCalendarCheck />
                <h2>My Recent Bookings</h2>
              </div>

              <span>{bookings.length} total</span>
            </div>

            <div className="resident-list">
              {recentBookings.length === 0 ? (
                <p className="resident-empty-text">
                  You have not submitted any booking requests.
                </p>
              ) : (
                recentBookings.map((booking) => (
                  <div className="resident-list-row" key={booking.id}>
                    <div className="resident-list-icon">
                      <FaCalendarCheck />
                    </div>

                    <div>
                      <h3>{booking.resourceName || "Resource booking"}</h3>

                      <p>
                        {formatDate(booking.bookingDate || booking.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`resident-status ${getStatusClass(
                        booking.status,
                      )}`}
                    >
                      {booking.status || "Pending"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="resident-panel">
            <div className="resident-panel-heading">
              <div>
                <FaClipboardList />
                <h2>My Issue Reports</h2>
              </div>

              <span>{issueReports.length} total</span>
            </div>

            <div className="resident-list">
              {recentIssues.length === 0 ? (
                <p className="resident-empty-text">
                  You have not submitted any issue reports.
                </p>
              ) : (
                recentIssues.map((issue) => (
                  <div className="resident-list-row" key={issue.id}>
                    <div className="resident-list-icon warning">
                      <FaClipboardList />
                    </div>

                    <div>
                      <h3>{issue.title || "Community issue"}</h3>
                      <p>{issue.location || "Location not recorded"}</p>
                    </div>

                    <span
                      className={`resident-status ${getStatusClass(
                        issue.status,
                      )}`}
                    >
                      {issue.status || "Open"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="resident-footer-note">
          <FaBuilding />

          <p>
            Keep your contact details, booking requests and issue reports
            accurate and up to date.
          </p>

          <Link href="/resident/profile">
            <FaRegUser />
            <span>Open Profile</span>
          </Link>
        </section>
      </section>
    </main>
  );
}
