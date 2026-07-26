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
import "./announcements.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaArchive,
  FaBullhorn,
  FaCheckCircle,
  FaExclamationCircle,
  FaListAlt,
  FaPlus,
  FaSearch,
  FaUndo,
  FaUser,
  FaUsers,
} from "react-icons/fa";

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Resident";
}

function getManagerName(user) {
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

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB");
}

function getAnnouncementSearchText(announcement) {
  return [
    announcement.title,
    announcement.message,
    announcement.category,
    announcement.priority,
    announcement.status,
    announcement.createdByName,
    announcement.recipientResidentName,
    announcement.recipientResidentEmail,
    announcement.recipientBuilding,
    announcement.recipientApartment,
    announcement.audience,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getBadgeClass(value) {
  return String(value || "normal")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getRecipientText(announcement) {
  if (announcement.audience === "specific") {
    const name = announcement.recipientResidentName || "Selected resident";
    const apartment = announcement.recipientApartment
      ? `, Apartment ${announcement.recipientApartment}`
      : "";
    const building = announcement.recipientBuilding
      ? `, ${announcement.recipientBuilding}`
      : "";

    return `${name}${apartment}${building}`;
  }

  return "All approved residents";
}

export default function AnnouncementsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [approvedResidents, setApprovedResidents] = useState([]);

  const [audience, setAudience] = useState("all");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("Normal");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribeAnnouncements = () => {};
    let unsubscribeResidents = () => {};

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

        unsubscribeAnnouncements();
        unsubscribeResidents();

        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
        );

        unsubscribeAnnouncements = onSnapshot(
          announcementsQuery,
          (snapshot) => {
            const announcementList = snapshot.docs.map((announcementDoc) => ({
              id: announcementDoc.id,
              ...announcementDoc.data(),
            }));

            setAnnouncements(announcementList);
            setIsLoading(false);
          },
          () => {
            setLoadError("Announcements could not be loaded.");
            setIsLoading(false);
          },
        );

        unsubscribeResidents = onSnapshot(
          collection(db, "users"),
          (snapshot) => {
            const residentsList = snapshot.docs
              .map((userDoc) => ({
                id: userDoc.id,
                ...userDoc.data(),
              }))
              .filter(
                (user) =>
                  user.role === "resident" &&
                  user.status === "approved" &&
                  user.isActive !== false,
              )
              .sort((firstResident, secondResident) =>
                getFullName(firstResident).localeCompare(
                  getFullName(secondResident),
                ),
              );

            setApprovedResidents(residentsList);
          },
          () => {
            setLoadError("Approved residents could not be loaded.");
          },
        );
      } catch {
        setLoadError("Announcements could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAnnouncements();
      unsubscribeResidents();
    };
  }, [router]);

  const filteredAnnouncements = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return announcements;
    }

    return announcements.filter((announcement) =>
      getAnnouncementSearchText(announcement).includes(cleanSearchTerm),
    );
  }, [announcements, searchTerm]);

  const activeAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) => announcement.status !== "archived",
      ),
    [announcements],
  );

  const archivedAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) => announcement.status === "archived",
      ),
    [announcements],
  );

  const highPriorityAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) =>
          announcement.priority === "High" &&
          announcement.status !== "archived",
      ),
    [announcements],
  );

  const selectedResident = useMemo(
    () =>
      approvedResidents.find((resident) => resident.id === selectedResidentId),
    [approvedResidents, selectedResidentId],
  );

  async function handleCreateAnnouncement(event) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      setPageMessage("Please add a title and message.");
      return;
    }

    if (audience === "specific" && !selectedResident) {
      setPageMessage("Please select a resident.");
      return;
    }

    if (!managerProfile) {
      setPageMessage("Manager profile is not loaded.");
      return;
    }

    try {
      setIsSaving(true);
      setPageMessage("");

      await addDoc(collection(db, "announcements"), {
        title: cleanTitle,
        message: cleanMessage,
        category,
        priority,
        status: "active",

        audience,
        recipientResidentId:
          audience === "specific" ? selectedResident.id : null,
        recipientResidentName:
          audience === "specific" ? getFullName(selectedResident) : null,
        recipientResidentEmail:
          audience === "specific" ? selectedResident.email || null : null,
        recipientBuilding:
          audience === "specific" ? selectedResident.building || null : null,
        recipientApartment:
          audience === "specific" ? selectedResident.apartment || null : null,

        createdAt: serverTimestamp(),
        createdBy: managerProfile.id,
        createdByName: getManagerName(managerProfile),
      });

      setAudience("all");
      setSelectedResidentId("");
      setTitle("");
      setMessage("");
      setCategory("General");
      setPriority("Normal");
      setPageMessage("Announcement created.");
    } catch {
      setPageMessage("Announcement could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(announcementId, nextStatus) {
    try {
      setPageMessage("");

      const announcementRef = doc(db, "announcements", announcementId);

      await updateDoc(announcementRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: managerProfile?.id || null,
      });

      setPageMessage(
        nextStatus === "archived"
          ? "Announcement archived."
          : "Announcement restored.",
      );
    } catch {
      setPageMessage("Announcement could not be updated.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading announcements...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="announcements"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Announcements"
          subtitle="Create and manage resident announcements."
        />

        {(pageMessage || loadError) && (
          <p className="manager-message">{pageMessage || loadError}</p>
        )}

        <section className="announcements-hero">
          <div>
            <span>Community Updates</span>
            <h2>Resident Announcements</h2>
            <p>
              Send updates to all approved residents or one selected resident.
            </p>
          </div>

          <div className="announcements-hero-icon">
            <FaBullhorn />
          </div>
        </section>

        <section className="announcements-summary-grid">
          <article className="announcements-summary-card">
            <div>
              <FaListAlt />
            </div>
            <h3>{announcements.length}</h3>
            <p>Total announcements</p>
          </article>

          <article className="announcements-summary-card">
            <div>
              <FaCheckCircle />
            </div>
            <h3>{activeAnnouncements.length}</h3>
            <p>Active</p>
          </article>

          <article className="announcements-summary-card">
            <div>
              <FaExclamationCircle />
            </div>
            <h3>{highPriorityAnnouncements.length}</h3>
            <p>High priority</p>
          </article>

          <article className="announcements-summary-card">
            <div>
              <FaArchive />
            </div>
            <h3>{archivedAnnouncements.length}</h3>
            <p>Archived</p>
          </article>
        </section>

        <section className="announcements-grid">
          <section className="manager-panel announcements-form-panel">
            <div className="manager-panel-heading">
              <div>
                <FaPlus />
                <h2>Create Announcement</h2>
              </div>

              <span>New message</span>
            </div>

            <form
              className="announcements-form"
              onSubmit={handleCreateAnnouncement}
            >
              <fieldset className="announcements-recipient-box">
                <legend>Recipient</legend>

                <label className="announcements-radio-option">
                  <input
                    type="radio"
                    name="audience"
                    value="all"
                    checked={audience === "all"}
                    onChange={() => {
                      setAudience("all");
                      setSelectedResidentId("");
                    }}
                  />
                  <span>
                    <FaUsers />
                    All approved residents
                  </span>
                </label>

                <label className="announcements-radio-option">
                  <input
                    type="radio"
                    name="audience"
                    value="specific"
                    checked={audience === "specific"}
                    onChange={() => setAudience("specific")}
                  />
                  <span>
                    <FaUser />
                    Specific resident
                  </span>
                </label>

                {audience === "specific" && (
                  <label className="announcements-resident-select">
                    Select resident
                    <select
                      value={selectedResidentId}
                      onChange={(event) =>
                        setSelectedResidentId(event.target.value)
                      }
                    >
                      <option value="">Choose resident...</option>

                      {approvedResidents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {getFullName(resident)}
                          {resident.apartment
                            ? ` - Apartment ${resident.apartment}`
                            : ""}
                          {resident.building ? ` - ${resident.building}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </fieldset>

              <label>
                Title
                <input
                  type="text"
                  placeholder="Water interruption notice"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label>
                Message
                <textarea
                  placeholder="Write the announcement..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>

              <div className="announcements-form-row">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Safety">Safety</option>
                    <option value="Event">Event</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>

              <button type="submit" disabled={isSaving}>
                <FaPlus />
                <span>{isSaving ? "Creating..." : "Create Announcement"}</span>
              </button>
            </form>
          </section>

          <section className="manager-panel announcements-list-panel">
            <div className="manager-panel-heading">
              <div>
                <FaBullhorn />
                <h2>Announcements</h2>
              </div>

              <span>{filteredAnnouncements.length} shown</span>
            </div>

            <div className="announcements-toolbar">
              <div className="announcements-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by title, resident, category or status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <p className="manager-empty-text">No announcements found.</p>
            ) : (
              <div className="announcements-card-list">
                {filteredAnnouncements.map((announcement) => (
                  <article key={announcement.id} className="announcement-card">
                    <div className="announcement-card-header">
                      <div>
                        <h3>{announcement.title}</h3>
                        <p>
                          {announcement.createdByName || "Building Manager"} ·{" "}
                          {formatDate(announcement.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`announcement-status-badge status-${getBadgeClass(
                          announcement.status,
                        )}`}
                      >
                        {announcement.status || "active"}
                      </span>
                    </div>

                    <div className="announcement-recipient-line">
                      {announcement.audience === "specific" ? (
                        <FaUser />
                      ) : (
                        <FaUsers />
                      )}
                      <span>{getRecipientText(announcement)}</span>
                    </div>

                    <p className="announcement-message">
                      {announcement.message}
                    </p>

                    <div className="announcement-meta-row">
                      <span className="announcement-category-badge">
                        {announcement.category || "General"}
                      </span>

                      <span
                        className={`announcement-priority-badge priority-${getBadgeClass(
                          announcement.priority,
                        )}`}
                      >
                        {announcement.priority || "Normal"}
                      </span>
                    </div>

                    <div className="announcement-actions">
                      {announcement.status === "archived" ? (
                        <button
                          type="button"
                          className="announcement-restore-btn"
                          onClick={() =>
                            handleStatusChange(announcement.id, "active")
                          }
                        >
                          <FaUndo />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="announcement-archive-btn"
                          onClick={() =>
                            handleStatusChange(announcement.id, "archived")
                          }
                        >
                          <FaArchive />
                          <span>Archive</span>
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
