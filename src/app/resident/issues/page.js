"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./issues.css";

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
  FaBuilding,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaFilter,
  FaHome,
  FaHourglassHalf,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaPlus,
  FaSearch,
  FaTag,
  FaTimesCircle,
  FaTools,
  FaUser,
} from "react-icons/fa";

/* Available resident issue choices */
const ISSUE_TYPES = [
  "Lift or elevator issue",
  "Lighting issue",
  "Water leak or plumbing issue",
  "Heating or hot water issue",
  "Electrical issue",
  "Door, lock or access issue",
  "Cleaning or waste issue",
  "Noise disturbance",
  "Parking issue",
  "Shared resource issue",
  "Safety concern",
  "Other",
];

/* Normalise text values */
function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/* Normalise account roles */
function normaliseRole(value) {
  return normaliseValue(value).replace(/\s+/g, "-");
}

/* Build resident full name */
function getResidentName(profile) {
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Resident";
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

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

/* Return sortable date value */
function getTimestamp(value) {
  const date = getDateValue(value);

  return date ? date.getTime() : 0;
}

/* Format issue date */
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

/* Create safe status class */
function getStatusClass(status) {
  return normaliseValue(status || "open")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* Create safe priority class */
function getPriorityClass(priority) {
  return normaliseValue(priority || "medium")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* Format status label */
function getStatusLabel(status) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "pending") {
    return "Pending";
  }

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

/* Format priority label */
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

/* Create searchable issue text */
function getIssueSearchText(issue) {
  return [
    issue.title,
    issue.problemType,
    issue.otherProblem,
    issue.description,
    issue.location,
    issue.category,
    issue.priority,
    issue.status,
    issue.building,
    issue.apartment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* Display status icon */
function IssueStatusIcon({ status }) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "in-progress") {
    return <FaHourglassHalf />;
  }

  if (cleanStatus === "resolved") {
    return <FaCheckCircle />;
  }

  if (cleanStatus === "closed") {
    return <FaTimesCircle />;
  }

  return <FaExclamationCircle />;
}

export default function ResidentIssuesPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);

  const [issueReports, setIssueReports] = useState([]);

  const [problemType, setProblemType] = useState("");

  const [otherProblem, setOtherProblem] = useState("");

  const [location, setLocation] = useState("");

  const [category, setCategory] = useState("Maintenance");

  const [priority, setPriority] = useState("Medium");

  const [description, setDescription] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedStatus, setSelectedStatus] = useState("all");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [pageError, setPageError] = useState("");

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let unsubscribeIssues = () => {};

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

        unsubscribeIssues = onSnapshot(
          collection(db, "issueReports"),
          (snapshot) => {
            const residentIssues = snapshot.docs
              .map((issueDocument) => ({
                id: issueDocument.id,
                ...issueDocument.data(),
              }))
              .filter(
                (issue) =>
                  issue.residentId === user.uid || issue.createdBy === user.uid,
              )
              .sort(
                (firstIssue, secondIssue) =>
                  getTimestamp(secondIssue.createdAt) -
                  getTimestamp(firstIssue.createdAt),
              );

            setIssueReports(residentIssues);
            setLoading(false);
          },
          (error) => {
            console.error("Resident issues loading error:", error);

            setPageError("Your issue reports could not be loaded.");

            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Resident issues access error:", error);

        setPageError("The issue reports page could not be opened.");

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeIssues();
    };
  }, [router]);

  const filteredIssues = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return issueReports.filter((issue) => {
      const issueStatus = normaliseValue(issue.status);

      const matchesStatus =
        selectedStatus === "all" ||
        issueStatus === normaliseValue(selectedStatus);

      const matchesSearch =
        !cleanSearchTerm || getIssueSearchText(issue).includes(cleanSearchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [issueReports, searchTerm, selectedStatus]);

  const openIssues = issueReports.filter((issue) =>
    ["open", "pending"].includes(normaliseValue(issue.status)),
  );

  const inProgressIssues = issueReports.filter(
    (issue) => normaliseValue(issue.status) === "in-progress",
  );

  const resolvedIssues = issueReports.filter(
    (issue) => normaliseValue(issue.status) === "resolved",
  );

  const closedIssues = issueReports.filter(
    (issue) => normaliseValue(issue.status) === "closed",
  );

  async function handleIssueSubmit(event) {
    event.preventDefault();

    if (!currentUser || !residentProfile) {
      setFeedback({
        type: "error",
        message: "Your resident profile is not available.",
      });

      return;
    }

    const cleanProblemType = problemType.trim();

    const cleanOtherProblem = otherProblem.trim();

    const cleanLocation = location.trim();

    const cleanDescription = description.trim();

    setFeedback(null);

    if (!cleanProblemType) {
      setFeedback({
        type: "error",
        message: "Please select the problem you want to report.",
      });

      return;
    }

    if (cleanProblemType === "Other" && !cleanOtherProblem) {
      setFeedback({
        type: "error",
        message: "Please specify what the problem is.",
      });

      return;
    }

    if (!cleanLocation) {
      setFeedback({
        type: "error",
        message: "Please enter the location of the issue.",
      });

      return;
    }

    if (!cleanDescription) {
      setFeedback({
        type: "error",
        message: "Please provide additional details about the issue.",
      });

      return;
    }

    const reportTitle =
      cleanProblemType === "Other" ? cleanOtherProblem : cleanProblemType;

    setSubmitting(true);

    try {
      const residentName = getResidentName(residentProfile);

      await addDoc(collection(db, "issueReports"), {
        title: reportTitle,

        problemType: cleanProblemType,

        otherProblem: cleanProblemType === "Other" ? cleanOtherProblem : "",

        description: cleanDescription,

        residentId: currentUser.uid,

        residentName,

        residentEmail: residentProfile.email || currentUser.email || "",

        building: residentProfile.building || "",

        apartment: residentProfile.apartment || "",

        location: cleanLocation,

        category,

        priority,

        status: "open",

        createdAt: serverTimestamp(),

        createdBy: currentUser.uid,

        createdByName: residentName,

        updatedAt: null,

        updatedBy: null,
      });

      setProblemType("");
      setOtherProblem("");
      setLocation("");
      setCategory("Maintenance");
      setPriority("Medium");
      setDescription("");

      setFeedback({
        type: "success",
        message:
          "Your issue report has been submitted to the Building Manager.",
      });
    } catch (error) {
      console.error("Resident issue creation error:", error);

      setFeedback({
        type: "error",
        message: "The issue report could not be submitted. Please try again.",
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
        <p>Loading your issue reports...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="issues"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="Issue Reports"
          subtitle="Report community problems and follow their progress."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-issues-page-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-issues-hero">
          <div>
            <span>Resident Support</span>

            <h2>Report and track community issues</h2>

            <p>
              Submit maintenance problems, safety concerns and other community
              issues, then follow their current progress from your resident
              account.
            </p>
          </div>

          <div className="resident-issues-hero-icon">
            <FaClipboardList />
          </div>
        </section>

        <section className="resident-issues-summary">
          <article>
            <div>
              <FaExclamationCircle />
            </div>

            <section>
              <span>Open</span>
              <strong>{openIssues.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaHourglassHalf />
            </div>

            <section>
              <span>In progress</span>

              <strong>{inProgressIssues.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaCheckCircle />
            </div>

            <section>
              <span>Resolved</span>

              <strong>{resolvedIssues.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaTimesCircle />
            </div>

            <section>
              <span>Closed</span>

              <strong>{closedIssues.length}</strong>
            </section>
          </article>
        </section>

        <section className="resident-issues-grid">
          <article className="resident-issue-form-panel">
            <div className="resident-issues-section-heading">
              <div>
                <FaPlus />

                <section>
                  <h2>New Issue Report</h2>

                  <p>
                    Select the problem and provide the necessary information.
                  </p>
                </section>
              </div>
            </div>

            <form className="resident-issue-form" onSubmit={handleIssueSubmit}>
              <div className="resident-issue-field">
                <label htmlFor="problemType">Problem</label>

                <div className="resident-issue-input">
                  <FaClipboardList />

                  <select
                    id="problemType"
                    value={problemType}
                    onChange={(event) => {
                      const selectedProblem = event.target.value;

                      setProblemType(selectedProblem);

                      if (selectedProblem !== "Other") {
                        setOtherProblem("");
                      }
                    }}
                    required
                  >
                    <option value="" disabled>
                      Select a problem
                    </option>

                    {ISSUE_TYPES.map((issueType) => (
                      <option key={issueType} value={issueType}>
                        {issueType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {problemType === "Other" && (
                <div className="resident-issue-field">
                  <label htmlFor="otherProblem">Specify the problem</label>

                  <div className="resident-issue-input">
                    <FaClipboardList />

                    <input
                      id="otherProblem"
                      type="text"
                      placeholder="Enter the problem you want to report"
                      value={otherProblem}
                      onChange={(event) => setOtherProblem(event.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="resident-issue-profile-grid">
                <div className="resident-issue-profile-item">
                  <FaBuilding />

                  <section>
                    <span>Building</span>

                    <strong>
                      {residentProfile?.building || "Not recorded"}
                    </strong>
                  </section>
                </div>

                <div className="resident-issue-profile-item">
                  <FaHome />

                  <section>
                    <span>Apartment</span>

                    <strong>
                      {residentProfile?.apartment || "Not recorded"}
                    </strong>
                  </section>
                </div>
              </div>

              <div className="resident-issue-field">
                <label htmlFor="issueLocation">Issue location</label>

                <div className="resident-issue-input">
                  <FaMapMarkerAlt />

                  <input
                    id="issueLocation"
                    type="text"
                    placeholder="Main entrance or second-floor corridor"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="resident-issue-two-columns">
                <div className="resident-issue-field">
                  <label htmlFor="issueCategory">Category</label>

                  <div className="resident-issue-input">
                    <FaTag />

                    <select
                      id="issueCategory"
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
                  </div>
                </div>

                <div className="resident-issue-field">
                  <label htmlFor="issuePriority">Priority</label>

                  <div className="resident-issue-input">
                    <FaExclamationCircle />

                    <select
                      id="issuePriority"
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                    >
                      <option value="Low">Low</option>

                      <option value="Medium">Medium</option>

                      <option value="High">High</option>

                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="resident-issue-field">
                <label htmlFor="issueDescription">Additional details</label>

                <textarea
                  id="issueDescription"
                  rows="5"
                  placeholder="Describe what happened, when you noticed it and any relevant details."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                />
              </div>

              <div className="resident-issue-information">
                <FaInfoCircle />

                <p>
                  The report will be submitted with an open status. The Building
                  Manager can move it to in progress, resolved or closed.
                </p>
              </div>

              {feedback && (
                <div
                  className={`resident-issue-feedback ${feedback.type}`}
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
                className="resident-issue-submit"
                disabled={submitting}
              >
                <FaPaperPlane />

                <span>
                  {submitting ? "Submitting report..." : "Submit Issue Report"}
                </span>
              </button>
            </form>
          </article>

          <article className="resident-issue-history-panel">
            <div className="resident-issues-section-heading">
              <div>
                <FaTools />

                <section>
                  <h2>My Issue Reports</h2>

                  <p>
                    {filteredIssues.length} report
                    {filteredIssues.length === 1 ? "" : "s"} shown
                  </p>
                </section>
              </div>
            </div>

            <div className="resident-issues-toolbar">
              <label className="resident-issues-search">
                <FaSearch />

                <input
                  type="search"
                  placeholder="Search your reports"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="resident-issues-filter">
                <FaFilter />

                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>

                  <option value="open">Open</option>

                  <option value="in-progress">In Progress</option>

                  <option value="resolved">Resolved</option>

                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="resident-issues-empty">
                <FaClipboardList />

                <h3>No issue reports found</h3>

                <p>Your submitted community issue reports will appear here.</p>
              </div>
            ) : (
              <div className="resident-issues-list">
                {filteredIssues.map((issue) => {
                  const issueStatus = normaliseValue(issue.status);

                  return (
                    <article key={issue.id} className="resident-issue-card">
                      <div className="resident-issue-card-heading">
                        <div className="resident-issue-card-icon">
                          <FaClipboardList />
                        </div>

                        <section>
                          <span>{issue.category || "Maintenance"}</span>

                          <h3>{issue.title || "Community issue"}</h3>
                        </section>

                        <span
                          className={`resident-issue-status status-${getStatusClass(
                            issue.status,
                          )}`}
                        >
                          <IssueStatusIcon status={issue.status} />

                          {getStatusLabel(issue.status)}
                        </span>
                      </div>

                      <div className="resident-issue-meta-grid">
                        <div>
                          <FaMapMarkerAlt />

                          <section>
                            <span>Location</span>

                            <strong>{issue.location || "Not recorded"}</strong>
                          </section>
                        </div>

                        <div>
                          <FaExclamationCircle />

                          <section>
                            <span>Priority</span>

                            <strong
                              className={`resident-issue-priority priority-${getPriorityClass(
                                issue.priority,
                              )}`}
                            >
                              {getPriorityLabel(issue.priority)}
                            </strong>
                          </section>
                        </div>

                        <div>
                          <FaBuilding />

                          <section>
                            <span>Building</span>

                            <strong>{issue.building || "Not recorded"}</strong>
                          </section>
                        </div>

                        <div>
                          <FaHome />

                          <section>
                            <span>Apartment</span>

                            <strong>{issue.apartment || "Not recorded"}</strong>
                          </section>
                        </div>

                        <div>
                          <FaUser />

                          <section>
                            <span>Submitted by</span>

                            <strong>
                              {issue.residentName ||
                                getResidentName(residentProfile)}
                            </strong>
                          </section>
                        </div>

                        <div>
                          <FaClipboardList />

                          <section>
                            <span>Submitted</span>

                            <strong>{formatDate(issue.createdAt)}</strong>
                          </section>
                        </div>
                      </div>

                      <div className="resident-issue-description">
                        <span>Additional details</span>

                        <p>
                          {issue.description || "No description was provided."}
                        </p>
                      </div>

                      {["open", "pending"].includes(issueStatus) && (
                        <div className="resident-issue-status-note open">
                          <FaExclamationCircle />

                          <p>
                            The report has been received and is waiting for
                            review.
                          </p>
                        </div>
                      )}

                      {issueStatus === "in-progress" && (
                        <div className="resident-issue-status-note in-progress">
                          <FaHourglassHalf />

                          <p>
                            The Building Manager is currently reviewing this
                            issue.
                          </p>
                        </div>
                      )}

                      {issueStatus === "resolved" && (
                        <div className="resident-issue-status-note resolved">
                          <FaCheckCircle />

                          <p>This issue has been marked as resolved.</p>
                        </div>
                      )}

                      {issueStatus === "closed" && (
                        <div className="resident-issue-status-note closed">
                          <FaTimesCircle />

                          <p>This issue report has been closed.</p>
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
