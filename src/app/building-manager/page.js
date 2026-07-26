"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./manager-shared.css";
import "./building-manager.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../lib/firebase";

import ManagerSidebar from "./components/ManagerSidebar";
import ManagerTopbar from "./components/ManagerTopbar";

import {
  FaRegUser,
  FaUsers,
  FaUserCheck,
  FaClipboardList,
  FaBullhorn,
  FaRegCalendarAlt,
  FaCalendarCheck,
  FaToolbox,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaWrench,
  FaFolderOpen,
  FaExclamationTriangle,
  FaBuilding,
  FaChartLine,
} from "react-icons/fa";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (typeof value === "string") {
    return value;
  }

  return "—";
}

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Unnamed User";
}

function getPercentage(value, total) {
  if (!total || total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getChartWidth(value, maxValue) {
  if (!maxValue || maxValue === 0) {
    return "0%";
  }

  return `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;
}

function isOpenIssueStatus(status) {
  const cleanStatus = String(status || "").toLowerCase();

  return (
    cleanStatus === "pending" ||
    cleanStatus === "in-progress" ||
    cleanStatus === "open"
  );
}

function isPendingBookingStatus(status) {
  return String(status || "").toLowerCase() === "pending";
}

export default function BuildingManagerPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [managerProfile, setManagerProfile] = useState(null);

  const [pendingResidents, setPendingResidents] = useState([]);
  const [approvedResidents, setApprovedResidents] = useState([]);
  const [rejectedResidents, setRejectedResidents] = useState([]);

  const [issueReports, setIssueReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboardData() {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));

      const allUsers = usersSnapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data(),
      }));

      const pending = allUsers.filter(
        (user) => user.role === "resident" && user.status === "pending",
      );

      const approved = allUsers.filter(
        (user) => user.role === "resident" && user.status === "approved",
      );

      const rejected = allUsers.filter(
        (user) => user.role === "resident" && user.status === "rejected",
      );

      setPendingResidents(pending);
      setApprovedResidents(approved);
      setRejectedResidents(rejected);

      const issuesSnapshot = await getDocs(collection(db, "issueReports"));
      const announcementsSnapshot = await getDocs(
        collection(db, "announcements"),
      );
      const eventsSnapshot = await getDocs(collection(db, "events"));
      const resourcesSnapshot = await getDocs(collection(db, "resources"));
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));

      setIssueReports(
        issuesSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );

      setAnnouncements(
        announcementsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );

      setEvents(
        eventsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );

      setResources(
        resourcesSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );

      setBookings(
        bookingsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );
    } catch (error) {
      setMessage("Dashboard data could not be loaded.");
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
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await signOut(auth);
          router.push("/login");
          return;
        }

        const userData = userSnap.data();

        if (
          userData.role !== "building-manager" ||
          userData.status !== "approved" ||
          userData.isActive !== true
        ) {
          await signOut(auth);
          router.push("/login");
          return;
        }

        setCurrentUser(user);
        setManagerProfile(userData);

        await loadDashboardData();

        setLoading(false);
      } catch (error) {
        await signOut(auth);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleApproveResident(residentId) {
    if (!currentUser) {
      return;
    }

    setMessage("");

    try {
      await updateDoc(doc(db, "users", residentId), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        rejectedAt: null,
        rejectedBy: null,
      });

      setMessage("Resident registration approved.");
      await loadDashboardData();
    } catch (error) {
      setMessage("Could not approve resident.");
    }
  }

  async function handleRejectResident(residentId) {
    if (!currentUser) {
      return;
    }

    setMessage("");

    try {
      await updateDoc(doc(db, "users", residentId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        approvedAt: null,
        approvedBy: null,
      });

      setMessage("Resident registration rejected.");
      await loadDashboardData();
    } catch (error) {
      setMessage("Could not reject resident.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  const openIssueReports = issueReports.filter((issue) =>
    isOpenIssueStatus(issue.status),
  );

  const pendingBookings = bookings.filter((booking) =>
    isPendingBookingStatus(booking.status),
  );

  const approvedBookings = bookings.filter(
    (booking) => String(booking.status || "").toLowerCase() === "approved",
  );

  const totalResidentApplications =
    pendingResidents.length +
    approvedResidents.length +
    rejectedResidents.length;

  const approvalRate = getPercentage(
    approvedResidents.length,
    totalResidentApplications,
  );

  const rejectionRate = getPercentage(
    rejectedResidents.length,
    totalResidentApplications,
  );

  const pendingRate = getPercentage(
    pendingResidents.length,
    totalResidentApplications,
  );

  const registrationMaxValue = Math.max(
    pendingResidents.length,
    approvedResidents.length,
    rejectedResidents.length,
    1,
  );

  const platformMaxValue = Math.max(
    announcements.length,
    events.length,
    resources.length,
    bookings.length,
    issueReports.length,
    1,
  );

  const latestAnnouncement = announcements[0];
  const latestEvent = events[0];
  const latestResource = resources[0];
  const latestBooking = bookings[0];

  if (loading) {
    return (
      <main className="manager-loading-page">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="dashboard"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Building Manager Dashboard"
          subtitle={`Welcome back, ${managerProfile?.firstName || "Manager"}.`}
        />

        {message && <p className="manager-message">{message}</p>}

        <section id="quick-actions" className="manager-dashboard-hero">
          <div className="manager-hero-content">
            <span className="manager-hero-label">Daily Overview</span>

            <h2>Today&apos;s Management Summary</h2>

            <p>
              Review resident access, booking requests, issue reports and
              community updates from one place.
            </p>
          </div>

          <div className="manager-hero-actions">
            <Link href="/building-manager/registrations">
              <FaUserCheck />
              <span>Registrations</span>
            </Link>

            <Link href="/building-manager/bookings">
              <FaCalendarCheck />
              <span>Bookings</span>
            </Link>

            <Link href="/building-manager/issues">
              <FaClipboardList />
              <span>Issue Reports</span>
            </Link>

            <Link href="/building-manager/resources">
              <FaFolderOpen />
              <span>Resources</span>
            </Link>
          </div>
        </section>

        <section className="manager-overview-grid">
          <article className="manager-overview-card">
            <div className="manager-overview-icon">
              <FaClock />
            </div>

            <div>
              <p>Pending Registrations</p>
              <h2>{pendingResidents.length}</h2>
              <span>Awaiting approval</span>

              <Link href="/building-manager/registrations">
                Open <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="manager-overview-card">
            <div className="manager-overview-icon">
              <FaCalendarCheck />
            </div>

            <div>
              <p>Pending Bookings</p>
              <h2>{pendingBookings.length}</h2>
              <span>Awaiting review</span>

              <Link href="/building-manager/bookings">
                Open <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="manager-overview-card">
            <div className="manager-overview-icon warning">
              <FaExclamationTriangle />
            </div>

            <div>
              <p>Open Issue Reports</p>
              <h2>{openIssueReports.length}</h2>
              <span>Require attention</span>

              <Link href="/building-manager/issues">
                Open <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="manager-overview-card">
            <div className="manager-overview-icon">
              <FaRegCalendarAlt />
            </div>

            <div>
              <p>Events</p>
              <h2>{events.length}</h2>
              <span>Community schedule</span>

              <Link href="/building-manager/events">
                Open <FaArrowRight />
              </Link>
            </div>
          </article>

          <article className="manager-overview-card">
            <div className="manager-overview-icon">
              <FaToolbox />
            </div>

            <div>
              <p>Resources</p>
              <h2>{resources.length}</h2>
              <span>Shared facilities</span>

              <Link href="/building-manager/resources">
                Open <FaArrowRight />
              </Link>
            </div>
          </article>
        </section>

        <section className="manager-focus-grid">
          <article className="manager-panel manager-attention-panel">
            <div className="manager-panel-heading">
              <div>
                <FaClipboardList />
                <h2>Needs Attention</h2>
              </div>

              <span>Priority overview</span>
            </div>

            <div className="manager-attention-list">
              {pendingResidents.length === 0 &&
              pendingBookings.length === 0 &&
              openIssueReports.length === 0 ? (
                <p className="manager-empty-text">
                  No pending actions at the moment.
                </p>
              ) : (
                <>
                  {pendingResidents.length > 0 && (
                    <Link
                      href="/building-manager/registrations"
                      className="manager-attention-row"
                    >
                      <div className="manager-attention-icon">
                        <FaUserCheck />
                      </div>

                      <div>
                        <h3>Resident registrations</h3>
                        <p>
                          {pendingResidents.length} request
                          {pendingResidents.length === 1 ? "" : "s"} awaiting
                          review.
                        </p>
                      </div>

                      <strong>Open</strong>
                    </Link>
                  )}

                  {pendingBookings.length > 0 && (
                    <Link
                      href="/building-manager/bookings"
                      className="manager-attention-row"
                    >
                      <div className="manager-attention-icon">
                        <FaCalendarCheck />
                      </div>

                      <div>
                        <h3>Booking requests</h3>
                        <p>
                          {pendingBookings.length} request
                          {pendingBookings.length === 1 ? "" : "s"} awaiting
                          review.
                        </p>
                      </div>

                      <strong>Open</strong>
                    </Link>
                  )}

                  {openIssueReports.length > 0 && (
                    <Link
                      href="/building-manager/issues"
                      className="manager-attention-row"
                    >
                      <div className="manager-attention-icon warning">
                        <FaWrench />
                      </div>

                      <div>
                        <h3>Issue reports</h3>
                        <p>
                          {openIssueReports.length} open report
                          {openIssueReports.length === 1 ? "" : "s"}.
                        </p>
                      </div>

                      <strong>Open</strong>
                    </Link>
                  )}
                </>
              )}
            </div>
          </article>

          <div className="manager-side-stack">
            <article className="manager-mini-panel">
              <div className="manager-mini-heading">
                <FaBullhorn />
                <h2>Latest Announcement</h2>
              </div>

              {latestAnnouncement ? (
                <>
                  <h3>{latestAnnouncement.title || "Untitled announcement"}</h3>
                  <p>{formatDate(latestAnnouncement.createdAt)}</p>

                  <Link href="/building-manager/announcements">
                    View announcements <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>No announcements yet.</p>

                  <Link href="/building-manager/announcements">
                    Open announcements <FaArrowRight />
                  </Link>
                </>
              )}
            </article>

            <article className="manager-mini-panel">
              <div className="manager-mini-heading">
                <FaRegCalendarAlt />
                <h2>Next Event</h2>
              </div>

              {latestEvent ? (
                <>
                  <h3>{latestEvent.title || "Untitled event"}</h3>
                  <p>{latestEvent.location || "No location added"}</p>

                  <Link href="/building-manager/events">
                    View events <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>No events yet.</p>

                  <Link href="/building-manager/events">
                    Open events <FaArrowRight />
                  </Link>
                </>
              )}
            </article>

            <article className="manager-mini-panel">
              <div className="manager-mini-heading">
                <FaCalendarCheck />
                <h2>Latest Booking</h2>
              </div>

              {latestBooking ? (
                <>
                  <h3>{latestBooking.resourceName || "Booking request"}</h3>
                  <p>{latestBooking.status || "pending"}</p>

                  <Link href="/building-manager/bookings">
                    View bookings <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>No booking requests yet.</p>

                  <Link href="/building-manager/bookings">
                    Open bookings <FaArrowRight />
                  </Link>
                </>
              )}
            </article>

            <article className="manager-mini-panel">
              <div className="manager-mini-heading">
                <FaFolderOpen />
                <h2>Latest Resource</h2>
              </div>

              {latestResource ? (
                <>
                  <h3>{latestResource.title || "Untitled resource"}</h3>
                  <p>{latestResource.category || "No category added"}</p>

                  <Link href="/building-manager/resources">
                    View resources <FaArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <p>No resources yet.</p>

                  <Link href="/building-manager/resources">
                    Open resources <FaArrowRight />
                  </Link>
                </>
              )}
            </article>
          </div>
        </section>

        <section className="manager-content-grid">
          <article
            id="pending-registrations"
            className="manager-panel manager-large-panel"
          >
            <div className="manager-panel-heading">
              <div>
                <FaUserCheck />
                <h2>Pending Registrations</h2>
              </div>

              <span>{pendingResidents.length} pending</span>
            </div>

            <div className="manager-table-wrap">
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Email</th>
                    <th>Building</th>
                    <th>Apartment</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingResidents.length === 0 ? (
                    <tr>
                      <td colSpan="6">No pending registrations.</td>
                    </tr>
                  ) : (
                    pendingResidents.map((resident) => (
                      <tr key={resident.id}>
                        <td>{getFullName(resident)}</td>
                        <td>{resident.email || "—"}</td>
                        <td>{resident.building || "—"}</td>
                        <td>{resident.apartment || "—"}</td>
                        <td>{formatDate(resident.createdAt)}</td>
                        <td>
                          <div className="manager-table-actions">
                            <button
                              type="button"
                              className="approve-btn"
                              onClick={() => handleApproveResident(resident.id)}
                            >
                              <FaCheckCircle />
                              Approve
                            </button>

                            <button
                              type="button"
                              className="reject-btn"
                              onClick={() => handleRejectResident(resident.id)}
                            >
                              <FaTimesCircle />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article id="bookings" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaCalendarCheck />
                <h2>Bookings</h2>
              </div>

              <span>{bookings.length} total</span>
            </div>

            <div className="manager-list">
              {bookings.length === 0 ? (
                <p className="manager-empty-text">No booking requests yet.</p>
              ) : (
                bookings.slice(0, 4).map((booking) => (
                  <div className="manager-list-row" key={booking.id}>
                    <div className="manager-list-icon">
                      <FaCalendarCheck />
                    </div>

                    <div>
                      <h3>{booking.resourceName || "Booking request"}</h3>
                      <p>{booking.residentName || "Resident not recorded"}</p>
                    </div>

                    <span>{booking.status || "pending"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article id="issues" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaClipboardList />
                <h2>Issue Reports</h2>
              </div>

              <span>{issueReports.length} total</span>
            </div>

            <div className="manager-list">
              {issueReports.length === 0 ? (
                <p className="manager-empty-text">No issue reports yet.</p>
              ) : (
                issueReports.slice(0, 4).map((issue) => (
                  <div className="manager-list-row" key={issue.id}>
                    <div className="manager-list-icon">
                      <FaWrench />
                    </div>

                    <div>
                      <h3>{issue.title || "Untitled issue"}</h3>
                      <p>{issue.location || "No location added"}</p>
                    </div>

                    <span>{issue.status || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article id="announcements" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaBullhorn />
                <h2>Announcements</h2>
              </div>

              <span>{announcements.length} total</span>
            </div>

            <div className="manager-list">
              {announcements.length === 0 ? (
                <p className="manager-empty-text">No announcements yet.</p>
              ) : (
                announcements.slice(0, 4).map((announcement) => (
                  <div className="manager-list-row" key={announcement.id}>
                    <div className="manager-list-icon">
                      <FaBullhorn />
                    </div>

                    <div>
                      <h3>{announcement.title || "Untitled announcement"}</h3>
                      <p>{formatDate(announcement.createdAt)}</p>
                    </div>

                    <span>{announcement.status || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article id="events" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaRegCalendarAlt />
                <h2>Events</h2>
              </div>

              <span>{events.length} total</span>
            </div>

            <div className="manager-list">
              {events.length === 0 ? (
                <p className="manager-empty-text">No events yet.</p>
              ) : (
                events.slice(0, 4).map((event) => (
                  <div className="manager-list-row" key={event.id}>
                    <div className="manager-date-box">
                      <strong>{formatDate(event.date)}</strong>
                    </div>

                    <div>
                      <h3>{event.title || "Untitled event"}</h3>
                      <p>{event.location || "No location added"}</p>
                    </div>

                    <span>{event.status || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article id="resources" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaFolderOpen />
                <h2>Resources</h2>
              </div>

              <span>{resources.length} total</span>
            </div>

            <div className="manager-list">
              {resources.length === 0 ? (
                <p className="manager-empty-text">No resources yet.</p>
              ) : (
                resources.slice(0, 4).map((resource) => (
                  <div className="manager-list-row" key={resource.id}>
                    <div className="manager-list-icon">
                      <FaToolbox />
                    </div>

                    <div>
                      <h3>{resource.title || "Untitled resource"}</h3>
                      <p>{resource.category || "No category added"}</p>
                    </div>

                    <span>{resource.status || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article id="residents" className="manager-panel">
            <div className="manager-panel-heading">
              <div>
                <FaUsers />
                <h2>Approved Residents</h2>
              </div>

              <span>{approvedResidents.length} total</span>
            </div>

            <div className="manager-list">
              {approvedResidents.length === 0 ? (
                <p className="manager-empty-text">No approved residents yet.</p>
              ) : (
                approvedResidents.slice(0, 5).map((resident) => (
                  <div className="manager-list-row" key={resident.id}>
                    <div className="manager-list-icon">
                      <FaRegUser />
                    </div>

                    <div>
                      <h3>{getFullName(resident)}</h3>
                      <p>{resident.email || "No email added"}</p>
                    </div>

                    <span>{resident.apartment || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section id="analytics" className="manager-analytics-panel">
          <div className="manager-panel-heading">
            <div>
              <FaChartLine />
              <h2>Data Analysis Report</h2>
            </div>

            <span>Current overview</span>
          </div>

          <div className="manager-analytics-summary">
            <article>
              <p>Total resident applications</p>
              <h3>{totalResidentApplications}</h3>
            </article>

            <article>
              <p>Approval rate</p>
              <h3>{approvalRate}%</h3>
            </article>

            <article>
              <p>Pending rate</p>
              <h3>{pendingRate}%</h3>
            </article>

            <article>
              <p>Rejected rate</p>
              <h3>{rejectionRate}%</h3>
            </article>
          </div>

          <div className="manager-chart-grid">
            <article className="manager-chart-card">
              <h3>Resident registration status</h3>

              <div className="manager-bar-chart">
                <div className="manager-bar-row">
                  <span>Approved</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill"
                      style={{
                        width: getChartWidth(
                          approvedResidents.length,
                          registrationMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{approvedResidents.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Pending</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill pending"
                      style={{
                        width: getChartWidth(
                          pendingResidents.length,
                          registrationMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{pendingResidents.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Rejected</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill rejected"
                      style={{
                        width: getChartWidth(
                          rejectedResidents.length,
                          registrationMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{rejectedResidents.length}</strong>
                </div>
              </div>
            </article>

            <article className="manager-chart-card">
              <h3>Community activity overview</h3>

              <div className="manager-bar-chart">
                <div className="manager-bar-row">
                  <span>Announcements</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill"
                      style={{
                        width: getChartWidth(
                          announcements.length,
                          platformMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{announcements.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Events</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill"
                      style={{
                        width: getChartWidth(events.length, platformMaxValue),
                      }}
                    />
                  </div>

                  <strong>{events.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Resources</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill"
                      style={{
                        width: getChartWidth(
                          resources.length,
                          platformMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{resources.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Bookings</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill"
                      style={{
                        width: getChartWidth(bookings.length, platformMaxValue),
                      }}
                    />
                  </div>

                  <strong>{bookings.length}</strong>
                </div>

                <div className="manager-bar-row">
                  <span>Issue Reports</span>

                  <div className="manager-bar-track">
                    <div
                      className="manager-bar-fill pending"
                      style={{
                        width: getChartWidth(
                          issueReports.length,
                          platformMaxValue,
                        ),
                      }}
                    />
                  </div>

                  <strong>{issueReports.length}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="manager-footer-note">
          <FaBuilding />

          <p>
            Keep resident access, shared resources, bookings, events and reports
            up to date.
          </p>

          <Link href="/">
            <FaArrowLeft />
            <span>Back to Home</span>
          </Link>
        </section>
      </section>
    </main>
  );
}
