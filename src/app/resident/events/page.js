"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./events.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ResidentSidebar from "../components/ResidentSidebar";
import ResidentTopbar from "../components/ResidentTopbar";

import {
  FaArrowRight,
  FaCalendarCheck,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaInbox,
  FaListAlt,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaSearch,
  FaTags,
  FaUsers,
} from "react-icons/fa";

function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normaliseRole(value) {
  return normaliseValue(value).replace(/\s+/g, "-");
}

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

  const stringValue = String(value).trim();

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(stringValue)
    ? new Date(`${stringValue}T00:00:00`)
    : new Date(stringValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getEventTimestamp(value) {
  const date = getDateValue(value);

  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  const date = getDateValue(value);

  if (!date) {
    return "Date to be confirmed";
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateDay(value) {
  const date = getDateValue(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
  });
}

function formatDateMonth(value) {
  const date = getDateValue(value);

  if (!date) {
    return "TBC";
  }

  return date
    .toLocaleDateString("en-GB", {
      month: "short",
    })
    .toUpperCase();
}

function formatTime(value) {
  const cleanTime = String(value || "").trim();

  return cleanTime || "Time to be confirmed";
}

function getCategoryClass(value) {
  return normaliseValue(value)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function isUpcomingEvent(eventItem) {
  const status = normaliseValue(eventItem.status);

  if (
    status === "cancelled" ||
    status === "completed" ||
    status === "inactive" ||
    status === "archived"
  ) {
    return false;
  }

  const eventDate = getDateValue(eventItem.eventDate || eventItem.date);

  if (!eventDate) {
    return true;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate >= today;
}

function isEventThisMonth(eventItem) {
  const eventDate = getDateValue(eventItem.eventDate || eventItem.date);

  if (!eventDate) {
    return false;
  }

  const today = new Date();

  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth()
  );
}

function getEventSearchText(eventItem) {
  return [
    eventItem.title,
    eventItem.description,
    eventItem.location,
    eventItem.category,
    eventItem.audience,
    eventItem.eventDate,
    eventItem.eventTime,
    eventItem.createdByName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ResidentEventsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let unsubscribeEvents = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setPageError("");

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        const userData = userSnapshot.data();

        const userRole = normaliseRole(userData.role);
        const userStatus = normaliseValue(userData.status);
        const accountIsActive = userData.isActive === true;

        const isApprovedResident =
          userRole === "resident" &&
          userStatus === "approved" &&
          accountIsActive;

        const isApprovedManager =
          userRole === "building-manager" &&
          userStatus === "approved" &&
          accountIsActive;

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

        unsubscribeEvents = onSnapshot(
          collection(db, "events"),
          (snapshot) => {
            const eventList = snapshot.docs
              .map((eventDoc) => ({
                id: eventDoc.id,
                ...eventDoc.data(),
              }))
              .filter(isUpcomingEvent)
              .sort(
                (firstEvent, secondEvent) =>
                  getEventTimestamp(firstEvent.eventDate || firstEvent.date) -
                  getEventTimestamp(secondEvent.eventDate || secondEvent.date),
              );

            setEvents(eventList);

            setSelectedEventId((currentId) => {
              const currentEventStillExists = eventList.some(
                (eventItem) => eventItem.id === currentId,
              );

              if (currentEventStillExists) {
                return currentId;
              }

              return eventList[0]?.id || "";
            });

            setLoading(false);
          },
          (error) => {
            console.error("Resident events loading error:", error);

            setPageError("Community events could not be loaded at the moment.");

            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Resident events access error:", error);

        setPageError("The events page could not be opened.");

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvents();
    };
  }, [router]);

  const categories = useMemo(() => {
    const availableCategories = events
      .map((eventItem) => String(eventItem.category || "General").trim())
      .filter(Boolean);

    return [...new Set(availableCategories)].sort(
      (firstCategory, secondCategory) =>
        firstCategory.localeCompare(secondCategory),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return events.filter((eventItem) => {
      const eventCategory = String(eventItem.category || "General");

      const matchesCategory =
        selectedCategory === "all" ||
        normaliseValue(eventCategory) === normaliseValue(selectedCategory);

      const matchesSearch =
        !cleanSearchTerm ||
        getEventSearchText(eventItem).includes(cleanSearchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [events, searchTerm, selectedCategory]);

  const selectedEvent =
    filteredEvents.find((eventItem) => eventItem.id === selectedEventId) ||
    filteredEvents[0] ||
    null;

  const nextEvent = events[0] || null;

  const eventsThisMonth = events.filter(isEventThisMonth).length;

  const categoryCount = categories.length;

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading community events...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="events"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="Events"
          subtitle="View upcoming community meetings and activities."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-events-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-events-hero">
          <div className="resident-events-hero-content">
            <span>Community Calendar</span>

            <h2>Upcoming resident events</h2>

            <p>
              Review scheduled meetings, social activities, safety sessions and
              other community events.
            </p>

            {nextEvent && (
              <div className="resident-events-next">
                <FaCalendarCheck />

                <div>
                  <small>Next scheduled event</small>

                  <strong>{nextEvent.title || "Community event"}</strong>

                  <span>
                    {formatDate(nextEvent.eventDate || nextEvent.date)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="resident-events-hero-icon">
            <FaRegCalendarAlt />
          </div>
        </section>

        <section className="resident-events-summary">
          <article>
            <div>
              <FaListAlt />
            </div>

            <section>
              <span>Upcoming events</span>
              <strong>{events.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaCalendarCheck />
            </div>

            <section>
              <span>This month</span>
              <strong>{eventsThisMonth}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaTags />
            </div>

            <section>
              <span>Event categories</span>
              <strong>{categoryCount}</strong>
            </section>
          </article>
        </section>

        <section className="resident-events-panel">
          <div className="resident-events-panel-heading">
            <div>
              <FaRegCalendarAlt />

              <section>
                <h2>Community Events</h2>

                <p>
                  {filteredEvents.length} event
                  {filteredEvents.length === 1 ? "" : "s"} shown
                </p>
              </section>
            </div>
          </div>

          <div className="resident-events-toolbar">
            <label className="resident-events-search">
              <FaSearch />

              <input
                type="search"
                placeholder="Search events"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="resident-events-filter">
              <FaFilter />

              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="all">All categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="resident-events-empty">
              <FaInbox />

              <h3>No upcoming events found</h3>

              <p>
                There are no community events matching the selected search and
                category.
              </p>
            </div>
          ) : (
            <div className="resident-events-content-grid">
              <div className="resident-events-list">
                {filteredEvents.map((eventItem) => {
                  const eventDate = eventItem.eventDate || eventItem.date;

                  const isSelected = selectedEvent?.id === eventItem.id;

                  return (
                    <button
                      key={eventItem.id}
                      type="button"
                      className={`resident-event-card ${
                        isSelected ? "selected" : ""
                      }`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedEventId(eventItem.id)}
                    >
                      <div className="resident-event-date">
                        <strong>{formatDateDay(eventDate)}</strong>

                        <span>{formatDateMonth(eventDate)}</span>
                      </div>

                      <section className="resident-event-card-content">
                        <div className="resident-event-card-heading">
                          <div>
                            <span
                              className={`resident-event-category category-${getCategoryClass(
                                eventItem.category || "General",
                              )}`}
                            >
                              {eventItem.category || "General"}
                            </span>

                            <h3>{eventItem.title || "Community event"}</h3>
                          </div>

                          <FaArrowRight />
                        </div>

                        <div className="resident-event-card-meta">
                          <span>
                            <FaClock />
                            {formatTime(eventItem.eventTime || eventItem.time)}
                          </span>

                          <span>
                            <FaMapMarkerAlt />
                            {eventItem.location || "Location to be confirmed"}
                          </span>
                        </div>

                        {eventItem.description && (
                          <p>{eventItem.description}</p>
                        )}
                      </section>
                    </button>
                  );
                })}
              </div>

              <aside className="resident-event-details">
                {selectedEvent ? (
                  <>
                    <div className="resident-event-details-heading">
                      <span
                        className={`resident-event-category category-${getCategoryClass(
                          selectedEvent.category || "General",
                        )}`}
                      >
                        {selectedEvent.category || "General"}
                      </span>

                      <h2>{selectedEvent.title || "Community event"}</h2>

                      <p>
                        {selectedEvent.description ||
                          "No additional event description was provided."}
                      </p>
                    </div>

                    <div className="resident-event-details-list">
                      <div>
                        <FaRegCalendarAlt />

                        <section>
                          <span>Date</span>

                          <strong>
                            {formatDate(
                              selectedEvent.eventDate || selectedEvent.date,
                            )}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaClock />

                        <section>
                          <span>Time</span>

                          <strong>
                            {formatTime(
                              selectedEvent.eventTime || selectedEvent.time,
                            )}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaMapMarkerAlt />

                        <section>
                          <span>Location</span>

                          <strong>
                            {selectedEvent.location ||
                              "Location to be confirmed"}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaUsers />

                        <section>
                          <span>Audience</span>

                          <strong>
                            {selectedEvent.audience || "All residents"}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaListAlt />

                        <section>
                          <span>Capacity</span>

                          <strong>
                            {selectedEvent.capacity
                              ? `${selectedEvent.capacity} people`
                              : "No capacity limit recorded"}
                          </strong>
                        </section>
                      </div>
                    </div>

                    <div className="resident-event-organiser">
                      <span>Organised by</span>

                      <strong>
                        {selectedEvent.createdByName || "Building Manager"}
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="resident-event-details-empty">
                    <FaRegCalendarAlt />

                    <h3>Select an event</h3>

                    <p>
                      Choose an event from the list to view its full details.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
