"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import "../manager-shared.css";
import "./bookings.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaFolderOpen,
  FaSearch,
  FaTimesCircle,
  FaUndo,
  FaUser,
} from "react-icons/fa";

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Building Manager";
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  if (dateValue.toDate) {
    return dateValue.toDate().toLocaleDateString("en-GB");
  }

  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-GB");
}

function getBookingSearchText(booking) {
  return [
    booking.residentName,
    booking.residentEmail,
    booking.residentApartment,
    booking.residentBuilding,
    booking.resourceName,
    booking.resourceType,
    booking.bookingDate,
    booking.startTime,
    booking.endTime,
    booking.purpose,
    booking.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getStatusClass(status) {
  return String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getBookingTime(booking) {
  const startTime = booking.startTime || "—";
  const endTime = booking.endTime || "—";

  return `${startTime} - ${endTime}`;
}

export default function BookingsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [actionBookingId, setActionBookingId] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribeBookings = () => {};

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

        unsubscribeBookings();

        const bookingsQuery = query(
          collection(db, "bookings"),
          orderBy("createdAt", "desc"),
        );

        unsubscribeBookings = onSnapshot(
          bookingsQuery,
          (snapshot) => {
            const bookingList = snapshot.docs.map((bookingDoc) => ({
              id: bookingDoc.id,
              ...bookingDoc.data(),
            }));

            setBookings(bookingList);
            setIsLoading(false);
          },
          () => {
            setLoadError("Bookings could not be loaded.");
            setIsLoading(false);
          },
        );
      } catch {
        setLoadError("Bookings could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeBookings();
    };
  }, [router]);

  const filteredBookings = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return bookings;
    }

    return bookings.filter((booking) =>
      getBookingSearchText(booking).includes(cleanSearchTerm),
    );
  }, [bookings, searchTerm]);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "pending"),
    [bookings],
  );

  const approvedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "approved"),
    [bookings],
  );

  const rejectedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "rejected"),
    [bookings],
  );

  async function handleStatusChange(bookingId, nextStatus) {
    if (!managerProfile) {
      setPageMessage("Manager profile is not loaded.");
      return;
    }

    try {
      setActionBookingId(bookingId);
      setPageMessage("");

      const bookingRef = doc(db, "bookings", bookingId);

      await updateDoc(bookingRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: managerProfile.id,
        reviewedByName: getFullName(managerProfile),
      });

      if (nextStatus === "approved") {
        setPageMessage("Booking approved.");
      } else if (nextStatus === "rejected") {
        setPageMessage("Booking rejected.");
      } else if (nextStatus === "completed") {
        setPageMessage("Booking completed.");
      } else {
        setPageMessage("Booking updated.");
      }
    } catch {
      setPageMessage("Booking could not be updated.");
    } finally {
      setActionBookingId("");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading bookings...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="bookings"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Bookings"
          subtitle="Review and manage shared resource reservations."
        />

        {(pageMessage || loadError) && (
          <p className="manager-message">{pageMessage || loadError}</p>
        )}

        <section className="bookings-hero">
          <div>
            <span>Resource Reservations</span>
            <h2>Booking Requests</h2>
            <p>Approve, reject or complete resident booking requests.</p>
          </div>

          <div className="bookings-hero-icon">
            <FaCalendarCheck />
          </div>
        </section>

        <section className="bookings-summary-grid">
          <article className="bookings-summary-card">
            <div>
              <FaClipboardList />
            </div>
            <h3>{bookings.length}</h3>
            <p>Total bookings</p>
          </article>

          <article className="bookings-summary-card">
            <div>
              <FaClock />
            </div>
            <h3>{pendingBookings.length}</h3>
            <p>Pending review</p>
          </article>

          <article className="bookings-summary-card">
            <div>
              <FaCheckCircle />
            </div>
            <h3>{approvedBookings.length}</h3>
            <p>Approved</p>
          </article>

          <article className="bookings-summary-card">
            <div>
              <FaTimesCircle />
            </div>
            <h3>{rejectedBookings.length}</h3>
            <p>Rejected</p>
          </article>
        </section>

        <section className="manager-panel bookings-panel">
          <div className="manager-panel-heading">
            <div>
              <FaCalendarCheck />
              <h2>Booking Requests</h2>
            </div>

            <span>{filteredBookings.length} shown</span>
          </div>

          <div className="bookings-toolbar">
            <div className="bookings-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by resident, resource, date, purpose or status..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <p className="manager-empty-text">No booking requests yet.</p>
          ) : (
            <div className="manager-table-wrap">
              <table className="manager-table bookings-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Resource</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <div className="booking-person-cell">
                          <FaUser />
                          <div>
                            <strong>{booking.residentName || "—"}</strong>
                            <span>
                              {booking.residentApartment
                                ? `Apartment ${booking.residentApartment}`
                                : "Apartment —"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="booking-resource-cell">
                          <FaFolderOpen />
                          <div>
                            <strong>{booking.resourceName || "—"}</strong>
                            <span>{booking.resourceType || "Resource"}</span>
                          </div>
                        </div>
                      </td>

                      <td>{formatDate(booking.bookingDate)}</td>
                      <td>{getBookingTime(booking)}</td>
                      <td>{booking.purpose || "—"}</td>

                      <td>
                        <span
                          className={`booking-status-badge status-${getStatusClass(
                            booking.status,
                          )}`}
                        >
                          {booking.status || "pending"}
                        </span>
                      </td>

                      <td>
                        <div className="manager-table-actions">
                          {booking.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="approve-btn"
                                disabled={actionBookingId === booking.id}
                                onClick={() =>
                                  handleStatusChange(booking.id, "approved")
                                }
                              >
                                <FaCheckCircle />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                className="reject-btn"
                                disabled={actionBookingId === booking.id}
                                onClick={() =>
                                  handleStatusChange(booking.id, "rejected")
                                }
                              >
                                <FaTimesCircle />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {booking.status === "approved" && (
                            <button
                              type="button"
                              className="complete-btn"
                              disabled={actionBookingId === booking.id}
                              onClick={() =>
                                handleStatusChange(booking.id, "completed")
                              }
                            >
                              <FaCheckCircle />
                              <span>Complete</span>
                            </button>
                          )}

                          {booking.status === "rejected" && (
                            <button
                              type="button"
                              className="restore-btn"
                              disabled={actionBookingId === booking.id}
                              onClick={() =>
                                handleStatusChange(booking.id, "pending")
                              }
                            >
                              <FaUndo />
                              <span>Restore</span>
                            </button>
                          )}

                          {booking.status === "completed" && (
                            <span className="booking-action-text">
                              Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
