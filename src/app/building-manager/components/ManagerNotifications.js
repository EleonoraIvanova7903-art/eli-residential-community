"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

import {
  FaBell,
  FaUserCheck,
  FaClipboardList,
  FaCheckCircle,
  FaCalendarCheck,
} from "react-icons/fa";

function isOpenIssueStatus(status) {
  return (
    status === "pending" ||
    status === "in-progress" ||
    status === "open" ||
    status === "Pending" ||
    status === "In Progress" ||
    status === "Open"
  );
}

function isPendingBookingStatus(status) {
  return status === "pending" || status === "Pending";
}

export default function ManagerNotifications() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [openIssueReports, setOpenIssueReports] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users = snapshot.docs.map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }));

        const pending = users.filter(
          (user) => user.role === "resident" && user.status === "pending",
        );

        setPendingResidents(pending);
      },
      () => {
        setLoadError(true);
      },
    );

    const unsubscribeIssues = onSnapshot(
      collection(db, "issueReports"),
      (snapshot) => {
        const issues = snapshot.docs.map((issueDoc) => ({
          id: issueDoc.id,
          ...issueDoc.data(),
        }));

        const openIssues = issues.filter((issue) =>
          isOpenIssueStatus(issue.status),
        );

        setOpenIssueReports(openIssues);
      },
      () => {
        setLoadError(true);
      },
    );

    const unsubscribeBookings = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const bookings = snapshot.docs.map((bookingDoc) => ({
          id: bookingDoc.id,
          ...bookingDoc.data(),
        }));

        const pending = bookings.filter((booking) =>
          isPendingBookingStatus(booking.status),
        );

        setPendingBookings(pending);
      },
      () => {
        setLoadError(true);
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeIssues();
      unsubscribeBookings();
    };
  }, []);

  const notificationItems = useMemo(() => {
    const items = [];

    if (pendingResidents.length > 0) {
      items.push({
        id: "pending-registrations",
        icon: FaUserCheck,
        title: "Pending registrations",
        text: `${pendingResidents.length} resident ${
          pendingResidents.length === 1 ? "request" : "requests"
        } waiting for approval.`,
        linkText: "Open registrations",
        href: "/building-manager/registrations",
      });
    }

    if (pendingBookings.length > 0) {
      items.push({
        id: "pending-bookings",
        icon: FaCalendarCheck,
        title: "Pending bookings",
        text: `${pendingBookings.length} booking ${
          pendingBookings.length === 1 ? "request needs" : "requests need"
        } review.`,
        linkText: "Open bookings",
        href: "/building-manager/bookings",
      });
    }

    if (openIssueReports.length > 0) {
      items.push({
        id: "open-issues",
        icon: FaClipboardList,
        title: "Open issue reports",
        text: `${openIssueReports.length} issue ${
          openIssueReports.length === 1 ? "report needs" : "reports need"
        } attention.`,
        linkText: "Open issue reports",
        href: "/building-manager/issues",
      });
    }

    return items;
  }, [pendingResidents, pendingBookings, openIssueReports]);

  const notificationCount =
    pendingResidents.length + pendingBookings.length + openIssueReports.length;

  return (
    <div className="manager-notification-wrap">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={showNotifications}
        className="manager-notification-button"
        onClick={() => setShowNotifications((currentValue) => !currentValue)}
      >
        <FaBell />
        {notificationCount > 0 && <span>{notificationCount}</span>}
      </button>

      {showNotifications && (
        <div className="manager-notification-dropdown">
          <div className="manager-notification-header">
            <h3>Notifications</h3>
            <p>Items that need manager attention</p>
          </div>

          {loadError ? (
            <div className="manager-notification-empty">
              <FaClipboardList />
              <h4>Notifications could not be loaded.</h4>
              <p>Please refresh the page and try again.</p>
            </div>
          ) : notificationItems.length === 0 ? (
            <div className="manager-notification-empty">
              <FaCheckCircle />
              <h4>No new notifications.</h4>
              <p>Everything is up to date at the moment.</p>
            </div>
          ) : (
            <div className="manager-notification-list">
              {notificationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="manager-notification-item"
                    onClick={() => setShowNotifications(false)}
                  >
                    <div className="manager-notification-icon">
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
