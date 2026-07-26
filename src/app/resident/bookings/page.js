"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./bookings.css";

import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ResidentSidebar from "../components/ResidentSidebar";
import ResidentTopbar from "../components/ResidentTopbar";

import {
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaFolderOpen,
  FaHourglassHalf,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPlus,
  FaRegCalendarAlt,
  FaSearch,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";

/* Normalise text values */
function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/* Normalise role names */
function normaliseRole(value) {
  return normaliseValue(value).replace(/\s+/g, "-");
}

/* Build resident full name */
function getFullName(profile) {
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Resident";
}

/* Get resource display name */
function getResourceName(resource) {
  return (
    resource?.name ||
    resource?.title ||
    resource?.resourceName ||
    "Shared resource"
  );
}

/* Get resource category */
function getResourceType(resource) {
  return (
    resource?.category ||
    resource?.resourceType ||
    resource?.bookingType ||
    "Shared resource"
  );
}

/* Convert Firestore or string date */
function getDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const cleanValue = String(value).trim();

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(cleanValue)
    ? new Date(`${cleanValue}T00:00:00`)
    : new Date(cleanValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

/* Get sortable date timestamp */
function getTimestamp(value) {
  const date = getDateValue(value);

  return date ? date.getTime() : 0;
}

/* Format date for the interface */
function formatDate(value) {
  const date = getDateValue(value);

  if (!date) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* Format booking time */
function formatTimeRange(startTime, endTime) {
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return start;
  }

  return "Time not recorded";
}

/* Create safe status class */
function getStatusClass(status) {
  return normaliseValue(status || "pending")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* Check if resource can be booked */
function isAvailableResource(resource) {
  const status = normaliseValue(resource.status);

  const unavailableStatuses = [
    "maintenance",
    "unavailable",
    "inactive",
    "closed",
    "archived",
  ];

  return resource.isBookable !== false && !unavailableStatuses.includes(status);
}

/* Get local date for the HTML input */
function getTodayInputValue() {
  const today = new Date();

  const timezoneOffset = today.getTimezoneOffset() * 60 * 1000;

  return new Date(today.getTime() - timezoneOffset).toISOString().split("T")[0];
}

export default function ResidentBookingsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);

  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let unsubscribeResources = () => {};
    let unsubscribeBookings = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setPageError("");

        const userReference = doc(db, "users", user.uid);

        const userSnapshot = await getDoc(userReference);

        if (!userSnapshot.exists()) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        const userData = userSnapshot.data();

        const userRole = normaliseRole(userData.role);

        const userStatus = normaliseValue(userData.status);

        const isActive = userData.isActive === true;

        const isApprovedResident =
          userRole === "resident" && userStatus === "approved" && isActive;

        const isApprovedManager =
          userRole === "building-manager" &&
          userStatus === "approved" &&
          isActive;

        if (isApprovedManager) {
          router.replace("/building-manager");
          return;
        }

        if (!isApprovedResident) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        setCurrentUser(user);

        setResidentProfile({
          id: userSnapshot.id,
          ...userData,
        });

        unsubscribeResources = onSnapshot(
          collection(db, "resources"),
          (snapshot) => {
            const resourceList = snapshot.docs
              .map((resourceDocument) => ({
                id: resourceDocument.id,
                ...resourceDocument.data(),
              }))
              .filter(isAvailableResource)
              .sort((firstResource, secondResource) =>
                getResourceName(firstResource).localeCompare(
                  getResourceName(secondResource),
                ),
              );

            setResources(resourceList);
          },
          (error) => {
            console.error("Resources loading error:", error);

            setPageError("Available resources could not be loaded.");
          },
        );

        unsubscribeBookings = onSnapshot(
          collection(db, "bookings"),
          (snapshot) => {
            const residentBookings = snapshot.docs
              .map((bookingDocument) => ({
                id: bookingDocument.id,
                ...bookingDocument.data(),
              }))
              .filter((booking) => booking.residentId === user.uid)
              .sort((firstBooking, secondBooking) => {
                const firstDate =
                  getTimestamp(firstBooking.createdAt) ||
                  getTimestamp(firstBooking.bookingDate);

                const secondDate =
                  getTimestamp(secondBooking.createdAt) ||
                  getTimestamp(secondBooking.bookingDate);

                return secondDate - firstDate;
              });

            setBookings(residentBookings);
            setLoading(false);
          },
          (error) => {
            console.error("Bookings loading error:", error);

            setPageError("Your booking requests could not be loaded.");

            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Bookings page access error:", error);

        setPageError("The bookings page could not be opened.");

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeResources();
      unsubscribeBookings();
    };
  }, [router]);

  const filteredBookings = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const bookingStatus = normaliseValue(booking.status);

      const matchesStatus =
        selectedStatus === "all" ||
        bookingStatus === normaliseValue(selectedStatus);

      const searchableText = [
        booking.resourceName,
        booking.resourceType,
        booking.resourceLocation,
        booking.bookingDate,
        booking.startTime,
        booking.endTime,
        booking.purpose,
        booking.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !cleanSearchTerm || searchableText.includes(cleanSearchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, searchTerm, selectedStatus]);

  const pendingBookings = bookings.filter(
    (booking) => normaliseValue(booking.status) === "pending",
  );

  const approvedBookings = bookings.filter(
    (booking) => normaliseValue(booking.status) === "approved",
  );

  const completedBookings = bookings.filter(
    (booking) => normaliseValue(booking.status) === "completed",
  );

  const rejectedBookings = bookings.filter(
    (booking) => normaliseValue(booking.status) === "rejected",
  );

  async function handleBookingSubmit(event) {
    event.preventDefault();

    if (!currentUser || !residentProfile) {
      setFeedback({
        type: "error",
        message: "Your resident profile is not available.",
      });

      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const resourceId = String(formData.get("resourceId") || "").trim();

    const bookingDate = String(formData.get("bookingDate") || "").trim();

    const startTime = String(formData.get("startTime") || "").trim();

    const endTime = String(formData.get("endTime") || "").trim();

    const purpose = String(formData.get("purpose") || "").trim();

    const numberOfGuestsValue = Number(formData.get("numberOfGuests") || 1);

    const numberOfGuests =
      Number.isFinite(numberOfGuestsValue) && numberOfGuestsValue > 0
        ? Math.floor(numberOfGuestsValue)
        : 1;

    setFeedback(null);

    const selectedResource = resources.find(
      (resource) => resource.id === resourceId,
    );

    if (!selectedResource) {
      setFeedback({
        type: "error",
        message: "Please select an available resource.",
      });

      return;
    }

    if (!bookingDate) {
      setFeedback({
        type: "error",
        message: "Please select a booking date.",
      });

      return;
    }

    const selectedDate = new Date(`${bookingDate}T00:00:00`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setFeedback({
        type: "error",
        message: "The booking date cannot be in the past.",
      });

      return;
    }

    if (!startTime || !endTime) {
      setFeedback({
        type: "error",
        message: "Please enter the start and end time.",
      });

      return;
    }

    if (startTime >= endTime) {
      setFeedback({
        type: "error",
        message: "The end time must be later than the start time.",
      });

      return;
    }

    if (!purpose) {
      setFeedback({
        type: "error",
        message: "Please enter the purpose of the booking.",
      });

      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "bookings"), {
        residentId: currentUser.uid,

        residentName: getFullName(residentProfile),

        residentEmail: residentProfile.email || currentUser.email || "",

        residentApartment: residentProfile.apartment || "",

        residentBuilding: residentProfile.building || "",

        resourceId: selectedResource.id,

        resourceName: getResourceName(selectedResource),

        resourceType: getResourceType(selectedResource),

        resourceLocation: selectedResource.location || "",

        bookingDate,
        startTime,
        endTime,
        purpose,
        numberOfGuests,

        status: "pending",

        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,

        reviewedAt: null,
        reviewedBy: null,

        updatedAt: serverTimestamp(),
      });

      form.reset();

      setFeedback({
        type: "success",
        message:
          "Your booking request has been submitted for Building Manager review.",
      });
    } catch (error) {
      console.error("Booking request creation error:", error);

      setFeedback({
        type: "error",
        message:
          "The booking request could not be submitted. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading your bookings...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="bookings"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="My Bookings"
          subtitle="Request shared resources and track the progress of your bookings."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-bookings-page-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-bookings-hero">
          <div>
            <span>Shared Resource Access</span>

            <h2>Plan and manage your bookings</h2>

            <p>
              Submit a request for an available community resource and follow
              its approval status from your account.
            </p>
          </div>

          <div className="resident-bookings-hero-icon">
            <FaCalendarCheck />
          </div>
        </section>

        <section className="resident-bookings-summary">
          <article>
            <div>
              <FaHourglassHalf />
            </div>

            <section>
              <span>Pending</span>
              <strong>{pendingBookings.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaCheckCircle />
            </div>

            <section>
              <span>Approved</span>
              <strong>{approvedBookings.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaCalendarCheck />
            </div>

            <section>
              <span>Completed</span>
              <strong>{completedBookings.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaTimesCircle />
            </div>

            <section>
              <span>Rejected</span>
              <strong>{rejectedBookings.length}</strong>
            </section>
          </article>
        </section>

        <section className="resident-bookings-grid">
          <article className="resident-booking-form-panel">
            <div className="resident-bookings-section-heading">
              <div>
                <FaPlus />

                <section>
                  <h2>New Booking Request</h2>

                  <p>Select a resource, date and suitable time.</p>
                </section>
              </div>
            </div>

            <form
              className="resident-booking-form"
              onSubmit={handleBookingSubmit}
            >
              <div className="resident-booking-field">
                <label htmlFor="resourceId">Resource</label>

                <div className="resident-booking-input">
                  <FaFolderOpen />

                  <select
                    id="resourceId"
                    name="resourceId"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select an available resource
                    </option>

                    {resources.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {getResourceName(resource)}

                        {resource.location ? ` - ${resource.location}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {resources.length === 0 && (
                  <p className="resident-booking-field-note">
                    No bookable resources are currently available.
                  </p>
                )}
              </div>

              <div className="resident-booking-field">
                <label htmlFor="bookingDate">Booking date</label>

                <div className="resident-booking-input">
                  <FaRegCalendarAlt />

                  <input
                    id="bookingDate"
                    name="bookingDate"
                    type="date"
                    min={getTodayInputValue()}
                    required
                  />
                </div>
              </div>

              <div className="resident-booking-two-columns">
                <div className="resident-booking-field">
                  <label htmlFor="startTime">Start time</label>

                  <div className="resident-booking-input">
                    <FaClock />

                    <input
                      id="startTime"
                      name="startTime"
                      type="time"
                      required
                    />
                  </div>
                </div>

                <div className="resident-booking-field">
                  <label htmlFor="endTime">End time</label>

                  <div className="resident-booking-input">
                    <FaClock />

                    <input id="endTime" name="endTime" type="time" required />
                  </div>
                </div>
              </div>

              <div className="resident-booking-field">
                <label htmlFor="numberOfGuests">Number of people</label>

                <div className="resident-booking-input">
                  <FaUsers />

                  <input
                    id="numberOfGuests"
                    name="numberOfGuests"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>
              </div>

              <div className="resident-booking-field">
                <label htmlFor="purpose">Purpose</label>

                <textarea
                  id="purpose"
                  name="purpose"
                  rows="4"
                  placeholder="Briefly describe how the resource will be used."
                  required
                />
              </div>

              <div className="resident-booking-info">
                <FaInfoCircle />

                <p>
                  New requests are submitted with a pending status and must be
                  reviewed by the Building Manager.
                </p>
              </div>

              {feedback && (
                <div
                  className={`resident-booking-feedback ${feedback.type}`}
                  role={feedback.type === "error" ? "alert" : "status"}
                >
                  {feedback.type === "success" ? (
                    <FaCheckCircle />
                  ) : (
                    <FaExclamationTriangle />
                  )}

                  <p>{feedback.message}</p>
                </div>
              )}

              <button
                type="submit"
                className="resident-booking-submit"
                disabled={submitting || resources.length === 0}
              >
                <FaCalendarCheck />

                <span>
                  {submitting
                    ? "Submitting request..."
                    : "Submit Booking Request"}
                </span>
              </button>
            </form>
          </article>

          <article className="resident-booking-history-panel">
            <div className="resident-bookings-section-heading">
              <div>
                <FaCalendarCheck />

                <section>
                  <h2>Booking History</h2>

                  <p>
                    {filteredBookings.length} request
                    {filteredBookings.length === 1 ? "" : "s"} shown
                  </p>
                </section>
              </div>
            </div>

            <div className="resident-bookings-toolbar">
              <label className="resident-bookings-search">
                <FaSearch />

                <input
                  type="search"
                  placeholder="Search your bookings"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="resident-bookings-filter">
                <FaFilter />

                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>

                  <option value="pending">Pending</option>

                  <option value="approved">Approved</option>

                  <option value="rejected">Rejected</option>

                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="resident-bookings-empty">
                <FaCalendarCheck />

                <h3>No booking requests found</h3>

                <p>Your submitted booking requests will appear here.</p>
              </div>
            ) : (
              <div className="resident-bookings-list">
                {filteredBookings.map((booking) => {
                  const bookingStatus = normaliseValue(booking.status);

                  return (
                    <article key={booking.id} className="resident-booking-card">
                      <div className="resident-booking-card-heading">
                        <div className="resident-booking-resource-icon">
                          <FaFolderOpen />
                        </div>

                        <section>
                          <span>
                            {booking.resourceType || "Shared resource"}
                          </span>

                          <h3>{booking.resourceName || "Resource booking"}</h3>
                        </section>

                        <span
                          className={`resident-booking-status status-${getStatusClass(
                            booking.status,
                          )}`}
                        >
                          {booking.status || "pending"}
                        </span>
                      </div>

                      <div className="resident-booking-card-details">
                        <div>
                          <FaRegCalendarAlt />

                          <section>
                            <span>Date</span>

                            <strong>{formatDate(booking.bookingDate)}</strong>
                          </section>
                        </div>

                        <div>
                          <FaClock />

                          <section>
                            <span>Time</span>

                            <strong>
                              {formatTimeRange(
                                booking.startTime,
                                booking.endTime,
                              )}
                            </strong>
                          </section>
                        </div>

                        <div>
                          <FaMapMarkerAlt />

                          <section>
                            <span>Location</span>

                            <strong>
                              {booking.resourceLocation || "Not recorded"}
                            </strong>
                          </section>
                        </div>

                        <div>
                          <FaUsers />

                          <section>
                            <span>People</span>

                            <strong>{booking.numberOfGuests || 1}</strong>
                          </section>
                        </div>
                      </div>

                      <div className="resident-booking-purpose">
                        <span>Purpose</span>

                        <p>{booking.purpose || "No purpose recorded."}</p>
                      </div>

                      {bookingStatus === "pending" && (
                        <div className="resident-booking-review-note pending">
                          <FaHourglassHalf />

                          <p>
                            This request is waiting for Building Manager review.
                          </p>
                        </div>
                      )}

                      {bookingStatus === "approved" && (
                        <div className="resident-booking-review-note approved">
                          <FaCheckCircle />

                          <p>This booking request has been approved.</p>
                        </div>
                      )}

                      {bookingStatus === "rejected" && (
                        <div className="resident-booking-review-note rejected">
                          <FaTimesCircle />

                          <p>This booking request was not approved.</p>
                        </div>
                      )}

                      {bookingStatus === "completed" && (
                        <div className="resident-booking-review-note completed">
                          <FaCalendarCheck />

                          <p>This booking has been marked as completed.</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
