"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./announcements.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ResidentSidebar from "../components/ResidentSidebar";
import ResidentTopbar from "../components/ResidentTopbar";

import {
  FaBullhorn,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaUser,
  FaUsers,
  FaCalendarAlt,
  FaTag,
  FaInbox,
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

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatDate(value) {
  const date = getDateValue(value);

  if (!date) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateTimestamp(value) {
  const date = getDateValue(value);

  return date ? date.getTime() : 0;
}

function getBadgeClass(value) {
  return normaliseValue(value)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function isAnnouncementVisibleToResident(announcement, residentId) {
  const status = normaliseValue(announcement.status);

  if (
    status === "draft" ||
    status === "archived" ||
    status === "inactive" ||
    status === "cancelled"
  ) {
    return false;
  }

  const audience = normaliseValue(announcement.audience);

  const isForAllResidents =
    !audience ||
    audience === "all" ||
    audience === "all residents" ||
    audience === "all-residents" ||
    audience === "residents" ||
    audience === "community";

  const isForCurrentResident =
    announcement.recipientResidentId === residentId ||
    announcement.residentId === residentId;

  return isForAllResidents || isForCurrentResident;
}

function isPersonalAnnouncement(announcement, residentId) {
  return (
    announcement.recipientResidentId === residentId ||
    announcement.residentId === residentId
  );
}

export default function ResidentAnnouncementsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let unsubscribeAnnouncements = () => {};

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

        unsubscribeAnnouncements = onSnapshot(
          collection(db, "announcements"),
          (snapshot) => {
            const announcementList = snapshot.docs
              .map((announcementDoc) => ({
                id: announcementDoc.id,
                ...announcementDoc.data(),
              }))
              .filter((announcement) =>
                isAnnouncementVisibleToResident(announcement, user.uid),
              )
              .sort(
                (firstAnnouncement, secondAnnouncement) =>
                  getDateTimestamp(secondAnnouncement.createdAt) -
                  getDateTimestamp(firstAnnouncement.createdAt),
              );

            setAnnouncements(announcementList);
            setLoading(false);
          },
          (error) => {
            console.error("Resident announcements loading error:", error);

            setPageError("Announcements could not be loaded at the moment.");

            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Resident announcements access error:", error);

        setPageError("The announcements page could not be opened.");

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAnnouncements();
    };
  }, [router]);

  const categories = useMemo(() => {
    const availableCategories = announcements
      .map((announcement) => String(announcement.category || "General").trim())
      .filter(Boolean);

    return [...new Set(availableCategories)].sort((first, second) =>
      first.localeCompare(second),
    );
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const category = String(announcement.category || "General");

      const matchesCategory =
        selectedCategory === "all" ||
        normaliseValue(category) === normaliseValue(selectedCategory);

      const searchableText = [
        announcement.title,
        announcement.message,
        announcement.category,
        announcement.priority,
        announcement.createdByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !cleanSearchTerm || searchableText.includes(cleanSearchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [announcements, searchTerm, selectedCategory]);

  const highPriorityAnnouncements = announcements.filter(
    (announcement) => normaliseValue(announcement.priority) === "high",
  );

  const personalAnnouncements = announcements.filter((announcement) =>
    isPersonalAnnouncement(announcement, currentUser?.uid),
  );

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading announcements...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="announcements"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="Announcements"
          subtitle="Read important community notices and personal updates."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-announcements-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-announcements-hero">
          <div>
            <span>Community Updates</span>

            <h2>Stay informed about your community</h2>

            <p>
              View active announcements shared with all residents and messages
              sent directly to your account.
            </p>
          </div>

          <div className="resident-announcements-hero-icon">
            <FaBullhorn />
          </div>
        </section>

        <section className="resident-announcements-summary">
          <article>
            <div>
              <FaBullhorn />
            </div>

            <section>
              <span>Total announcements</span>
              <strong>{announcements.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaExclamationTriangle />
            </div>

            <section>
              <span>High priority</span>
              <strong>{highPriorityAnnouncements.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaUser />
            </div>

            <section>
              <span>Personal messages</span>
              <strong>{personalAnnouncements.length}</strong>
            </section>
          </article>
        </section>

        <section className="resident-announcements-panel">
          <div className="resident-announcements-panel-heading">
            <div>
              <FaInbox />

              <section>
                <h2>Community Announcements</h2>

                <p>
                  {filteredAnnouncements.length} announcement
                  {filteredAnnouncements.length === 1 ? "" : "s"} shown
                </p>
              </section>
            </div>
          </div>

          <div className="resident-announcements-toolbar">
            <label className="resident-announcements-search">
              <FaSearch />

              <input
                type="search"
                placeholder="Search announcements"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="resident-announcements-filter">
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

          {filteredAnnouncements.length === 0 ? (
            <div className="resident-announcements-empty">
              <FaInbox />

              <h3>No announcements found</h3>

              <p>
                There are no announcements matching the selected search and
                category.
              </p>
            </div>
          ) : (
            <div className="resident-announcements-list">
              {filteredAnnouncements.map((announcement) => {
                const isPersonal = isPersonalAnnouncement(
                  announcement,
                  currentUser?.uid,
                );

                return (
                  <article
                    key={announcement.id}
                    className={`resident-announcement-card ${
                      normaliseValue(announcement.priority) === "high"
                        ? "high-priority"
                        : ""
                    }`}
                  >
                    <div className="resident-announcement-card-icon">
                      {isPersonal ? <FaUser /> : <FaUsers />}
                    </div>

                    <section className="resident-announcement-card-content">
                      <div className="resident-announcement-card-heading">
                        <div>
                          <span className="resident-announcement-audience">
                            {isPersonal
                              ? "Personal announcement"
                              : "Community announcement"}
                          </span>

                          <h3>
                            {announcement.title || "Community announcement"}
                          </h3>
                        </div>

                        <span
                          className={`resident-announcement-priority priority-${getBadgeClass(
                            announcement.priority || "Normal",
                          )}`}
                        >
                          {announcement.priority || "Normal"}
                        </span>
                      </div>

                      <p className="resident-announcement-message">
                        {announcement.message ||
                          "No additional information was provided."}
                      </p>

                      <div className="resident-announcement-meta">
                        <span>
                          <FaTag />
                          {announcement.category || "General"}
                        </span>

                        <span>
                          <FaCalendarAlt />
                          {formatDate(announcement.createdAt)}
                        </span>

                        <span>
                          <FaUser />
                          {announcement.createdByName || "Building Manager"}
                        </span>
                      </div>
                    </section>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
