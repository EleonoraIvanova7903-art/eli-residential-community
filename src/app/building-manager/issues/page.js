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
import "./issues.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaCheckCircle,
  FaClipboardList,
  FaExclamationCircle,
  FaHourglassHalf,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaTools,
  FaUndo,
  FaUser,
  FaTimesCircle,
} from "react-icons/fa";

function getManagerName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Building Manager";
}

function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStatusClass(status) {
  return normaliseValue(status).replace(/\s+/g, "-") || "open";
}

function getPriorityClass(priority) {
  return normaliseValue(priority).replace(/\s+/g, "-") || "medium";
}

function getStatusLabel(status) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "in-progress") {
    return "In Progress";
  }

  if (cleanStatus === "resolved") {
    return "Resolved";
  }

  if (cleanStatus === "closed") {
    return "Closed";
  }

  return "Open";
}

function getPriorityLabel(priority) {
  const cleanPriority = normaliseValue(priority);

  if (cleanPriority === "urgent") {
    return "Urgent";
  }

  if (cleanPriority === "high") {
    return "High";
  }

  if (cleanPriority === "low") {
    return "Low";
  }

  return "Medium";
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

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getIssueSearchText(issue) {
  return [
    issue.title,
    issue.description,
    issue.residentName,
    issue.apartment,
    issue.building,
    issue.location,
    issue.category,
    issue.priority,
    issue.status,
    issue.createdByName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function IssueReportsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [issueReports, setIssueReports] = useState([]);

  const [title, setTitle] = useState("");
  const [residentName, setResidentName] = useState("");
  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribeIssues = () => {};

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

        unsubscribeIssues();

        const issuesQuery = query(
          collection(db, "issueReports"),
          orderBy("createdAt", "desc"),
        );

        unsubscribeIssues = onSnapshot(
          issuesQuery,
          (snapshot) => {
            const reportList = snapshot.docs.map((issueDoc) => ({
              id: issueDoc.id,
              ...issueDoc.data(),
            }));

            setIssueReports(reportList);
            setIsLoading(false);
          },
          () => {
            setLoadError("Issue reports could not be loaded.");
            setIsLoading(false);
          },
        );
      } catch {
        setLoadError("Issue reports could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeIssues();
    };
  }, [router]);

  const filteredReports = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return issueReports;
    }

    return issueReports.filter((issue) =>
      getIssueSearchText(issue).includes(cleanSearchTerm),
    );
  }, [issueReports, searchTerm]);

  const openReports = useMemo(
    () =>
      issueReports.filter((issue) => normaliseValue(issue.status) === "open"),
    [issueReports],
  );

  const inProgressReports = useMemo(
    () =>
      issueReports.filter(
        (issue) => normaliseValue(issue.status) === "in-progress",
      ),
    [issueReports],
  );

  const resolvedReports = useMemo(
    () =>
      issueReports.filter(
        (issue) => normaliseValue(issue.status) === "resolved",
      ),
    [issueReports],
  );

  const highPriorityReports = useMemo(
    () =>
      issueReports.filter((issue) =>
        ["high", "urgent"].includes(normaliseValue(issue.priority)),
      ),
    [issueReports],
  );

  async function handleCreateIssue(event) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanResidentName = residentName.trim();
    const cleanLocation = location.trim();

    if (
      !cleanTitle ||
      !cleanDescription ||
      !cleanResidentName ||
      !cleanLocation
    ) {
      setPageMessage(
        "Please add a title, resident name, location and description.",
      );
      return;
    }

    if (!managerProfile) {
      setPageMessage("Manager profile is not loaded.");
      return;
    }

    try {
      setIsSaving(true);
      setPageMessage("");

      await addDoc(collection(db, "issueReports"), {
        title: cleanTitle,
        description: cleanDescription,
        residentName: cleanResidentName,
        building: building.trim() || null,
        apartment: apartment.trim() || null,
        location: cleanLocation,
        category,
        priority,
        status: "open",

        createdAt: serverTimestamp(),
        createdBy: managerProfile.id,
        createdByName: getManagerName(managerProfile),
      });

      setTitle("");
      setResidentName("");
      setBuilding("");
      setApartment("");
      setLocation("");
      setCategory("Maintenance");
      setPriority("Medium");
      setDescription("");
      setPageMessage("Issue report created.");
    } catch {
      setPageMessage("Issue report could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(issueId, nextStatus) {
    try {
      setPageMessage("");

      const issueRef = doc(db, "issueReports", issueId);

      await updateDoc(issueRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: managerProfile?.id || null,
      });

      if (nextStatus === "in-progress") {
        setPageMessage("Issue report moved to in progress.");
        return;
      }

      if (nextStatus === "resolved") {
        setPageMessage("Issue report marked as resolved.");
        return;
      }

      if (nextStatus === "closed") {
        setPageMessage("Issue report closed.");
        return;
      }

      setPageMessage("Issue report reopened.");
    } catch {
      setPageMessage("Issue report could not be updated.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading issue reports...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="issues"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Issue Reports"
          subtitle="Review, track and update resident issue reports."
        />

        {(pageMessage || loadError) && (
          <p className="manager-message">{pageMessage || loadError}</p>
        )}

        <section className="issues-hero">
          <div>
            <span>Resident Support</span>
            <h2>Issue Reports</h2>
            <p>
              Track maintenance problems, service requests and resident concerns
              from one organised management page.
            </p>
          </div>

          <div className="issues-hero-icon">
            <FaClipboardList />
          </div>
        </section>

        <section className="issues-summary-grid">
          <article className="issues-summary-card">
            <div>
              <FaClipboardList />
            </div>
            <h3>{issueReports.length}</h3>
            <p>Total reports</p>
          </article>

          <article className="issues-summary-card">
            <div>
              <FaExclamationCircle />
            </div>
            <h3>{openReports.length}</h3>
            <p>Open</p>
          </article>

          <article className="issues-summary-card">
            <div>
              <FaHourglassHalf />
            </div>
            <h3>{inProgressReports.length}</h3>
            <p>In progress</p>
          </article>

          <article className="issues-summary-card">
            <div>
              <FaCheckCircle />
            </div>
            <h3>{resolvedReports.length}</h3>
            <p>Resolved</p>
          </article>
        </section>

        <section className="issues-grid">
          <section className="manager-panel issues-form-panel">
            <div className="manager-panel-heading">
              <div>
                <FaPlus />
                <h2>Log Issue Report</h2>
              </div>

              <span>New report</span>
            </div>

            <form className="issues-form" onSubmit={handleCreateIssue}>
              <label>
                Report title
                <input
                  type="text"
                  placeholder="Lift light not working"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label>
                Resident name
                <input
                  type="text"
                  placeholder="Maria Petrova"
                  value={residentName}
                  onChange={(event) => setResidentName(event.target.value)}
                />
              </label>

              <div className="issues-form-row">
                <label>
                  Building
                  <input
                    type="text"
                    placeholder="Building A"
                    value={building}
                    onChange={(event) => setBuilding(event.target.value)}
                  />
                </label>

                <label>
                  Apartment
                  <input
                    type="text"
                    placeholder="12"
                    value={apartment}
                    onChange={(event) => setApartment(event.target.value)}
                  />
                </label>
              </div>

              <label>
                Location
                <input
                  type="text"
                  placeholder="Main entrance"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>

              <div className="issues-form-row">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Safety">Safety</option>
                    <option value="Noise">Noise</option>
                    <option value="Parking">Parking</option>
                    <option value="Shared Resource">Shared Resource</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </label>
              </div>

              <label>
                Description
                <textarea
                  placeholder="Describe the issue..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <button type="submit" disabled={isSaving}>
                <FaPlus />
                <span>{isSaving ? "Creating..." : "Create Report"}</span>
              </button>
            </form>
          </section>

          <section className="manager-panel issues-list-panel">
            <div className="manager-panel-heading">
              <div>
                <FaTools />
                <h2>Reports</h2>
              </div>

              <span>{filteredReports.length} shown</span>
            </div>

            <div className="issues-toolbar">
              <div className="issues-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by title, resident, category, location or status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <p className="manager-empty-text">No issue reports found.</p>
            ) : (
              <div className="issues-card-list">
                {filteredReports.map((issue) => (
                  <article key={issue.id} className="issue-card">
                    <div className="issue-card-header">
                      <div>
                        <h3>{issue.title}</h3>
                        <p>
                          {issue.createdByName || "Building Manager"} ·{" "}
                          {formatDate(issue.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`issue-status-badge status-${getStatusClass(
                          issue.status,
                        )}`}
                      >
                        {getStatusLabel(issue.status)}
                      </span>
                    </div>

                    <div className="issue-details-grid">
                      <div>
                        <FaUser />
                        <span>{issue.residentName || "Resident"}</span>
                      </div>

                      <div>
                        <FaMapMarkerAlt />
                        <span>{issue.location || "—"}</span>
                      </div>

                      <div>
                        <FaClipboardList />
                        <span>{issue.category || "Maintenance"}</span>
                      </div>

                      <div>
                        <FaExclamationCircle />
                        <span>{getPriorityLabel(issue.priority)}</span>
                      </div>
                    </div>

                    <p className="issue-description">
                      {issue.description || "No description provided."}
                    </p>

                    <div className="issue-meta-row">
                      <span className="issue-category-badge">
                        {issue.category || "Maintenance"}
                      </span>

                      <span
                        className={`issue-priority-badge priority-${getPriorityClass(
                          issue.priority,
                        )}`}
                      >
                        {getPriorityLabel(issue.priority)}
                      </span>

                      {(issue.building || issue.apartment) && (
                        <span className="issue-location-badge">
                          {issue.building || "Building"}
                          {issue.apartment ? ` · Apt ${issue.apartment}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="issue-actions">
                      {normaliseValue(issue.status) === "open" && (
                        <>
                          <button
                            type="button"
                            className="issue-progress-btn"
                            onClick={() =>
                              handleStatusChange(issue.id, "in-progress")
                            }
                          >
                            <FaHourglassHalf />
                            <span>Start Review</span>
                          </button>

                          <button
                            type="button"
                            className="issue-close-btn"
                            onClick={() =>
                              handleStatusChange(issue.id, "closed")
                            }
                          >
                            <FaTimesCircle />
                            <span>Close</span>
                          </button>
                        </>
                      )}

                      {normaliseValue(issue.status) === "in-progress" && (
                        <>
                          <button
                            type="button"
                            className="issue-resolve-btn"
                            onClick={() =>
                              handleStatusChange(issue.id, "resolved")
                            }
                          >
                            <FaCheckCircle />
                            <span>Mark Resolved</span>
                          </button>

                          <button
                            type="button"
                            className="issue-close-btn"
                            onClick={() =>
                              handleStatusChange(issue.id, "closed")
                            }
                          >
                            <FaTimesCircle />
                            <span>Close</span>
                          </button>
                        </>
                      )}

                      {["resolved", "closed"].includes(
                        normaliseValue(issue.status),
                      ) && (
                        <button
                          type="button"
                          className="issue-restore-btn"
                          onClick={() => handleStatusChange(issue.id, "open")}
                        >
                          <FaUndo />
                          <span>Reopen</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        {highPriorityReports.length > 0 && (
          <section className="manager-footer-note">
            <FaExclamationCircle />
            <p>
              {highPriorityReports.length} high priority issue{" "}
              {highPriorityReports.length === 1
                ? "report requires"
                : "reports require"}{" "}
              manager attention.
            </p>

            <span className="issues-footer-status">Priority review</span>
          </section>
        )}
      </section>
    </main>
  );
}
