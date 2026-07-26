"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
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
import "./events.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaBan,
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaListAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaRegCalendarAlt,
  FaSearch,
  FaUndo,
  FaUsers,
} from "react-icons/fa";

function getManagerName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Building Manager";
}

function normaliseStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function getStatusClass(status) {
  return normaliseStatus(status).replace(/\s+/g, "-") || "scheduled";
}

function getStatusLabel(status) {
  const cleanStatus = normaliseStatus(status);

  if (cleanStatus === "completed") {
    return "Completed";
  }

  if (cleanStatus === "cancelled") {
    return "Cancelled";
  }

  return "Scheduled";
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  if (dateValue.toDate) {
    return dateValue.toDate().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEventSearchText(eventItem) {
  return [
    eventItem.title,
    eventItem.description,
    eventItem.location,
    eventItem.category,
    eventItem.audience,
    eventItem.status,
    eventItem.createdByName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function EventsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [events, setEvents] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("All residents");
  const [capacity, setCapacity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribeEvents = () => {};

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

        unsubscribeEvents();

        const eventsQuery = query(
          collection(db, "events"),
          orderBy("createdAt", "desc"),
        );

        unsubscribeEvents = onSnapshot(
          eventsQuery,
          (snapshot) => {
            const eventList = snapshot.docs.map((eventDoc) => ({
              id: eventDoc.id,
              ...eventDoc.data(),
            }));

            setEvents(eventList);
            setIsLoading(false);
          },
          () => {
            setLoadError("Events could not be loaded.");
            setIsLoading(false);
          },
        );
      } catch {
        setLoadError("Events could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvents();
    };
  }, [router]);

  const filteredEvents = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return events;
    }

    return events.filter((eventItem) =>
      getEventSearchText(eventItem).includes(cleanSearchTerm),
    );
  }, [events, searchTerm]);

  const scheduledEvents = useMemo(
    () =>
      events.filter(
        (eventItem) => normaliseStatus(eventItem.status) === "scheduled",
      ),
    [events],
  );

  const completedEvents = useMemo(
    () =>
      events.filter(
        (eventItem) => normaliseStatus(eventItem.status) === "completed",
      ),
    [events],
  );

  const cancelledEvents = useMemo(
    () =>
      events.filter(
        (eventItem) => normaliseStatus(eventItem.status) === "cancelled",
      ),
    [events],
  );

  async function handleCreateEvent(event) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    if (!cleanTitle || !eventDate || !eventTime || !cleanLocation) {
      setPageMessage("Please add a title, date, time and location.");
      return;
    }

    if (!managerProfile) {
      setPageMessage("Manager profile is not loaded.");
      return;
    }

    try {
      setIsSaving(true);
      setPageMessage("");

      await addDoc(collection(db, "events"), {
        title: cleanTitle,
        description: cleanDescription,
        eventDate,
        eventTime,
        location: cleanLocation,
        category,
        audience,
        capacity: capacity ? Number(capacity) : null,
        status: "scheduled",

        createdAt: serverTimestamp(),
        createdBy: managerProfile.id,
        createdByName: getManagerName(managerProfile),
      });

      setTitle("");
      setDescription("");
      setEventDate("");
      setEventTime("");
      setLocation("");
      setCategory("General");
      setAudience("All residents");
      setCapacity("");
      setPageMessage("Event created.");
    } catch {
      setPageMessage("Event could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(eventId, nextStatus) {
    try {
      setPageMessage("");

      const eventRef = doc(db, "events", eventId);

      await updateDoc(eventRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: managerProfile?.id || null,
      });

      if (nextStatus === "completed") {
        setPageMessage("Event marked as completed.");
        return;
      }

      if (nextStatus === "cancelled") {
        setPageMessage("Event cancelled.");
        return;
      }

      setPageMessage("Event restored.");
    } catch {
      setPageMessage("Event could not be updated.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading events...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="events"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Events"
          subtitle="Create and manage community meetings, activities and resident events."
        />

        {(pageMessage || loadError) && (
          <p className="manager-message">{pageMessage || loadError}</p>
        )}

        <section className="events-hero">
          <div>
            <span>Community Calendar</span>
            <h2>Resident Events</h2>
            <p>
              Plan community meetings, shared activities and important resident
              events from one organised management page.
            </p>
          </div>

          <div className="events-hero-icon">
            <FaRegCalendarAlt />
          </div>
        </section>

        <section className="events-summary-grid">
          <article className="events-summary-card">
            <div>
              <FaListAlt />
            </div>
            <h3>{events.length}</h3>
            <p>Total events</p>
          </article>

          <article className="events-summary-card">
            <div>
              <FaCalendarCheck />
            </div>
            <h3>{scheduledEvents.length}</h3>
            <p>Scheduled</p>
          </article>

          <article className="events-summary-card">
            <div>
              <FaCheckCircle />
            </div>
            <h3>{completedEvents.length}</h3>
            <p>Completed</p>
          </article>

          <article className="events-summary-card">
            <div>
              <FaBan />
            </div>
            <h3>{cancelledEvents.length}</h3>
            <p>Cancelled</p>
          </article>
        </section>

        <section className="events-grid">
          <section className="manager-panel events-form-panel">
            <div className="manager-panel-heading">
              <div>
                <FaPlus />
                <h2>Create Event</h2>
              </div>

              <span>New event</span>
            </div>

            <form className="events-form" onSubmit={handleCreateEvent}>
              <label>
                Event title
                <input
                  type="text"
                  placeholder="Monthly residents meeting"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  placeholder="Write a short event description..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="events-form-row">
                <label>
                  Date
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </label>

                <label>
                  Time
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(event) => setEventTime(event.target.value)}
                  />
                </label>
              </div>

              <label>
                Location
                <input
                  type="text"
                  placeholder="Community Hall"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>

              <div className="events-form-row">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Social">Social</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Safety">Safety</option>
                  </select>
                </label>

                <label>
                  Audience
                  <select
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                  >
                    <option value="All residents">All residents</option>
                    <option value="Approved residents">
                      Approved residents
                    </option>
                    <option value="Volunteers">Volunteers</option>
                    <option value="Families">Families</option>
                  </select>
                </label>
              </div>

              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  placeholder="40"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </label>

              <button type="submit" disabled={isSaving}>
                <FaPlus />
                <span>{isSaving ? "Creating..." : "Create Event"}</span>
              </button>
            </form>
          </section>

          <section className="manager-panel events-list-panel">
            <div className="manager-panel-heading">
              <div>
                <FaRegCalendarAlt />
                <h2>Events</h2>
              </div>

              <span>{filteredEvents.length} shown</span>
            </div>

            <div className="events-toolbar">
              <div className="events-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by title, location, category or status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <p className="manager-empty-text">No events found.</p>
            ) : (
              <div className="events-card-list">
                {filteredEvents.map((eventItem) => (
                  <article key={eventItem.id} className="event-card">
                    <div className="event-card-header">
                      <div>
                        <h3>{eventItem.title}</h3>
                        <p>
                          {eventItem.createdByName || "Building Manager"} ·{" "}
                          {eventItem.category || "General"}
                        </p>
                      </div>

                      <span
                        className={`event-status-badge status-${getStatusClass(
                          eventItem.status,
                        )}`}
                      >
                        {getStatusLabel(eventItem.status)}
                      </span>
                    </div>

                    <div className="event-details-grid">
                      <div>
                        <FaRegCalendarAlt />
                        <span>{formatDate(eventItem.eventDate)}</span>
                      </div>

                      <div>
                        <FaClock />
                        <span>{eventItem.eventTime || "—"}</span>
                      </div>

                      <div>
                        <FaMapMarkerAlt />
                        <span>{eventItem.location || "—"}</span>
                      </div>

                      <div>
                        <FaUsers />
                        <span>{eventItem.audience || "All residents"}</span>
                      </div>
                    </div>

                    {eventItem.description && (
                      <p className="event-description">
                        {eventItem.description}
                      </p>
                    )}

                    <div className="event-meta-row">
                      <span className="event-category-badge">
                        {eventItem.category || "General"}
                      </span>

                      {eventItem.capacity && (
                        <span className="event-capacity-badge">
                          Capacity: {eventItem.capacity}
                        </span>
                      )}
                    </div>

                    <div className="event-actions">
                      {normaliseStatus(eventItem.status) === "scheduled" && (
                        <>
                          <button
                            type="button"
                            className="event-complete-btn"
                            onClick={() =>
                              handleStatusChange(eventItem.id, "completed")
                            }
                          >
                            <FaCheckCircle />
                            <span>Mark Completed</span>
                          </button>

                          <button
                            type="button"
                            className="event-cancel-btn"
                            onClick={() =>
                              handleStatusChange(eventItem.id, "cancelled")
                            }
                          >
                            <FaBan />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      {normaliseStatus(eventItem.status) !== "scheduled" && (
                        <button
                          type="button"
                          className="event-restore-btn"
                          onClick={() =>
                            handleStatusChange(eventItem.id, "scheduled")
                          }
                        >
                          <FaUndo />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
