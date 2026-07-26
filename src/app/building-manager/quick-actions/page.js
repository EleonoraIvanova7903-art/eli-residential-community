"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import "../manager-shared.css";
import "./quick-actions.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaBell,
  FaBullhorn,
  FaCalendarCheck,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationCircle,
  FaFolderOpen,
  FaPlus,
  FaRegCalendarAlt,
  FaTasks,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

function normaliseStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function isOpenIssue(issue) {
  const status = normaliseStatus(issue.status);

  return (
    status === "open" ||
    status === "pending" ||
    status === "in-progress" ||
    status === "in progress"
  );
}

function isPendingBooking(booking) {
  return normaliseStatus(booking.status) === "pending";
}

function getPriorityState(count) {
  return count > 0 ? "Needs review" : "Up to date";
}

export default function QuickActionsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [openIssueReports, setOpenIssueReports] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const collectionUnsubscribers = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      try {
        const managerRef = doc(db, "users", currentUser.uid);
        const managerSnap = await getDoc(managerRef);

        if (!managerSnap.exists()) {
          router.push("/login");
          return;
        }

        const profileData = {
          id: managerSnap.id,
          ...managerSnap.data(),
        };

        const isAllowedManager =
          profileData.role === "building-manager" &&
          profileData.status === "approved" &&
          profileData.isActive === true;

        if (!isAllowedManager) {
          router.push("/login");
          return;
        }

        setManagerProfile(profileData);

        collectionUnsubscribers.forEach((unsubscribe) => unsubscribe());
        collectionUnsubscribers.length = 0;

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "users"),
            (snapshot) => {
              const users = snapshot.docs.map((userDoc) => ({
                id: userDoc.id,
                ...userDoc.data(),
              }));

              const pending = users.filter(
                (user) =>
                  user.role === "resident" &&
                  normaliseStatus(user.status) === "pending" &&
                  user.isActive !== false,
              );

              setPendingResidents(pending);
              setIsLoading(false);
            },
            () => {
              setLoadError("Quick actions could not load registrations.");
              setIsLoading(false);
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "bookings"),
            (snapshot) => {
              const bookings = snapshot.docs.map((bookingDoc) => ({
                id: bookingDoc.id,
                ...bookingDoc.data(),
              }));

              setPendingBookings(bookings.filter(isPendingBooking));
            },
            () => {
              setLoadError("Quick actions could not load bookings.");
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "issueReports"),
            (snapshot) => {
              const reports = snapshot.docs.map((issueDoc) => ({
                id: issueDoc.id,
                ...issueDoc.data(),
              }));

              setOpenIssueReports(reports.filter(isOpenIssue));
            },
            () => {
              setLoadError("Quick actions could not load issue reports.");
            },
          ),
        );
      } catch {
        setLoadError("Quick actions could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      collectionUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [router]);

  const urgentActionCount =
    pendingResidents.length + pendingBookings.length + openIssueReports.length;

  const priorityActions = useMemo(
    () => [
      {
        title: "Pending Registrations",
        text:
          pendingResidents.length > 0
            ? `${pendingResidents.length} resident request${
                pendingResidents.length === 1 ? "" : "s"
              } waiting for approval.`
            : "No pending resident registrations.",
        count: pendingResidents.length,
        href: "/building-manager/registrations",
        linkText: "Review Registrations",
        icon: FaUserCheck,
      },
      {
        title: "Booking Requests",
        text:
          pendingBookings.length > 0
            ? `${pendingBookings.length} booking request${
                pendingBookings.length === 1 ? "" : "s"
              } need review.`
            : "No pending booking requests.",
        count: pendingBookings.length,
        href: "/building-manager/bookings",
        linkText: "Review Bookings",
        icon: FaCalendarCheck,
      },
      {
        title: "Open Issue Reports",
        text:
          openIssueReports.length > 0
            ? `${openIssueReports.length} issue report${
                openIssueReports.length === 1 ? "" : "s"
              } need attention.`
            : "No urgent issue reports.",
        count: openIssueReports.length,
        href: "/building-manager/issues",
        linkText: "Review Reports",
        icon: FaClipboardList,
      },
    ],
    [pendingResidents.length, pendingBookings.length, openIssueReports.length],
  );

  const actionCards = [
    {
      title: "Create Announcement",
      description:
        "Send an update to all residents or to one selected resident.",
      href: "/building-manager/announcements",
      label: "Open Announcements",
      icon: FaBullhorn,
      badge: "Communication",
    },
    {
      title: "Manage Residents",
      description: "View approved residents and resident account information.",
      href: "/building-manager/residents",
      label: "Open Residents",
      icon: FaUsers,
      badge: "Directory",
    },
    {
      title: "Manage Resources",
      description:
        "Review shared facilities, equipment and resource availability.",
      href: "/building-manager/resources",
      label: "Open Resources",
      icon: FaFolderOpen,
      badge: "Shared spaces",
    },
    {
      title: "Plan Event",
      description:
        "Create and manage community meetings and resident activities.",
      href: "/building-manager/events",
      label: "Open Events",
      icon: FaRegCalendarAlt,
      badge: "Calendar",
    },
    {
      title: "View Data Analysis",
      description: "Open the management report with community activity charts.",
      href: "/building-manager/data-analysis",
      label: "Open Report",
      icon: FaChartLine,
      badge: "Report",
    },
    {
      title: "Review Dashboard",
      description: "Return to the main Building Manager dashboard overview.",
      href: "/building-manager",
      label: "Open Dashboard",
      icon: FaTasks,
      badge: "Overview",
    },
  ];

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading quick actions...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="quick-actions"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Quick Actions"
          subtitle="Access the most important management tasks from one organised page."
        />

        {loadError && <p className="manager-message">{loadError}</p>}

        <section className="quick-hero">
          <div>
            <span>Action Centre</span>
            <h2>Management Shortcuts</h2>
            <p>
              Review urgent work first, then move quickly to the main community
              management areas.
            </p>
          </div>

          <div className="quick-hero-icon">
            <FaTasks />
          </div>
        </section>

        <section className="quick-summary-grid">
          <article className="quick-summary-card">
            <div>
              <FaBell />
            </div>
            <h3>{urgentActionCount}</h3>
            <p>Items needing attention</p>
          </article>

          <article className="quick-summary-card">
            <div>
              <FaUserCheck />
            </div>
            <h3>{pendingResidents.length}</h3>
            <p>Pending registrations</p>
          </article>

          <article className="quick-summary-card">
            <div>
              <FaCalendarCheck />
            </div>
            <h3>{pendingBookings.length}</h3>
            <p>Pending bookings</p>
          </article>

          <article className="quick-summary-card">
            <div>
              <FaClipboardList />
            </div>
            <h3>{openIssueReports.length}</h3>
            <p>Open issue reports</p>
          </article>
        </section>

        <section className="quick-priority-grid">
          {priorityActions.map((action) => {
            const Icon = action.icon;
            const hasCount = action.count > 0;

            return (
              <article
                key={action.title}
                className={`quick-priority-card ${
                  hasCount ? "quick-priority-warning" : "quick-priority-clear"
                }`}
              >
                <div className="quick-priority-icon">
                  <Icon />
                </div>

                <div className="quick-priority-content">
                  <div>
                    <h3>{action.title}</h3>
                    <span>{getPriorityState(action.count)}</span>
                  </div>

                  <p>{action.text}</p>

                  <Link href={action.href}>{action.linkText}</Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="manager-panel quick-actions-panel">
          <div className="manager-panel-heading">
            <div>
              <FaPlus />
              <h2>Common Actions</h2>
            </div>

            <span>{actionCards.length} shortcuts</span>
          </div>

          <div className="quick-action-grid">
            {actionCards.map((action) => {
              const Icon = action.icon;

              return (
                <article className="quick-action-card" key={action.title}>
                  <div className="quick-action-header">
                    <div className="quick-action-icon">
                      <Icon />
                    </div>

                    <span>{action.badge}</span>
                  </div>

                  <h3>{action.title}</h3>
                  <p>{action.description}</p>

                  <Link href={action.href}>{action.label}</Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="manager-footer-note">
          <FaCheckCircle />
          <p>
            Start with registrations, bookings and issue reports before creating
            new announcements or planning community events.
          </p>

          <span className="quick-footer-status">Recommended workflow</span>
        </section>
      </section>
    </main>
  );
}
