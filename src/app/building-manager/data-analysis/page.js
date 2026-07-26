"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { auth, db } from "../../../lib/firebase";

import "../manager-shared.css";
import "./data-analysis.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaBell,
  FaBullhorn,
  FaCalendarCheck,
  FaChartBar,
  FaChartPie,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFolderOpen,
  FaRegCalendarAlt,
  FaUsers,
} from "react-icons/fa";

const chartColours = {
  green: "#0f4d1d",
  softGreen: "#66a060",
  amber: "#d89a24",
  blue: "#2f6f9f",
  coral: "#c95f4f",
  purple: "#7561b8",
  grey: "#8a9390",
  lightGrey: "#d8ddd5",
};

function normaliseStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function hasStatus(item, statuses) {
  return statuses.includes(normaliseStatus(item.status));
}

function getActiveAnnouncements(announcements) {
  return announcements.filter(
    (announcement) => normaliseStatus(announcement.status) !== "archived",
  );
}

function getTotalValue(data) {
  return data.reduce((total, item) => total + item.value, 0);
}

function getDonutData(data) {
  const total = getTotalValue(data);

  if (total === 0) {
    return [
      {
        name: "No data",
        value: 1,
        colour: chartColours.lightGrey,
        isPlaceholder: true,
      },
    ];
  }

  return data;
}

function getInsightStatus(type) {
  if (type === "warning") {
    return "Needs attention";
  }

  if (type === "good") {
    return "Stable";
  }

  return "Review";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="analysis-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((entry) => (
        <p key={entry.name}>
          {entry.name}: <span>{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DataAnalysisPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

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
              const list = snapshot.docs.map((userDoc) => ({
                id: userDoc.id,
                ...userDoc.data(),
              }));

              setUsers(list);
              setIsLoading(false);
            },
            () => {
              setLoadError("Data analysis could not load resident data.");
              setIsLoading(false);
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "announcements"),
            (snapshot) => {
              const list = snapshot.docs.map((announcementDoc) => ({
                id: announcementDoc.id,
                ...announcementDoc.data(),
              }));

              setAnnouncements(list);
            },
            () => {
              setLoadError("Data analysis could not load announcements.");
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "bookings"),
            (snapshot) => {
              const list = snapshot.docs.map((bookingDoc) => ({
                id: bookingDoc.id,
                ...bookingDoc.data(),
              }));

              setBookings(list);
            },
            () => {
              setLoadError("Data analysis could not load bookings.");
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "issueReports"),
            (snapshot) => {
              const list = snapshot.docs.map((issueDoc) => ({
                id: issueDoc.id,
                ...issueDoc.data(),
              }));

              setIssueReports(list);
            },
            () => {
              setLoadError("Data analysis could not load issue reports.");
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "events"),
            (snapshot) => {
              const list = snapshot.docs.map((eventDoc) => ({
                id: eventDoc.id,
                ...eventDoc.data(),
              }));

              setEvents(list);
            },
            () => {
              setLoadError("Data analysis could not load events.");
            },
          ),
        );

        collectionUnsubscribers.push(
          onSnapshot(
            collection(db, "resources"),
            (snapshot) => {
              const list = snapshot.docs.map((resourceDoc) => ({
                id: resourceDoc.id,
                ...resourceDoc.data(),
              }));

              setResources(list);
            },
            () => {
              setLoadError("Data analysis could not load resources.");
            },
          ),
        );
      } catch {
        setLoadError("Data analysis could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      collectionUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [router]);

  const residents = useMemo(
    () => users.filter((user) => user.role === "resident"),
    [users],
  );

  const approvedResidents = useMemo(
    () =>
      residents.filter(
        (resident) =>
          normaliseStatus(resident.status) === "approved" &&
          resident.isActive !== false,
      ),
    [residents],
  );

  const pendingResidents = useMemo(
    () =>
      residents.filter(
        (resident) =>
          normaliseStatus(resident.status) === "pending" &&
          resident.isActive !== false,
      ),
    [residents],
  );

  const rejectedResidents = useMemo(
    () =>
      residents.filter(
        (resident) => normaliseStatus(resident.status) === "rejected",
      ),
    [residents],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => hasStatus(booking, ["pending"])),
    [bookings],
  );

  const approvedBookings = useMemo(
    () => bookings.filter((booking) => hasStatus(booking, ["approved"])),
    [bookings],
  );

  const rejectedBookings = useMemo(
    () => bookings.filter((booking) => hasStatus(booking, ["rejected"])),
    [bookings],
  );

  const completedBookings = useMemo(
    () => bookings.filter((booking) => hasStatus(booking, ["completed"])),
    [bookings],
  );

  const openIssueReports = useMemo(
    () =>
      issueReports.filter((report) => hasStatus(report, ["open", "pending"])),
    [issueReports],
  );

  const inProgressIssueReports = useMemo(
    () =>
      issueReports.filter((report) =>
        hasStatus(report, [
          "in-progress",
          "in progress",
          "review",
          "in review",
        ]),
      ),
    [issueReports],
  );

  const resolvedIssueReports = useMemo(
    () =>
      issueReports.filter((report) =>
        hasStatus(report, ["resolved", "completed", "closed"]),
      ),
    [issueReports],
  );

  const rejectedIssueReports = useMemo(
    () =>
      issueReports.filter((report) =>
        hasStatus(report, ["rejected", "cancelled", "dismissed"]),
      ),
    [issueReports],
  );

  const activeAnnouncements = useMemo(
    () => getActiveAnnouncements(announcements),
    [announcements],
  );

  const upcomingEvents = useMemo(
    () =>
      events.filter((event) =>
        hasStatus(event, ["upcoming", "scheduled", "active", "published"]),
      ),
    [events],
  );

  const availableResources = useMemo(
    () =>
      resources.filter((resource) =>
        hasStatus(resource, ["available", "active"]),
      ),
    [resources],
  );

  const activityData = useMemo(
    () => [
      {
        name: "Residents",
        value: approvedResidents.length,
        fill: chartColours.green,
      },
      {
        name: "Announcements",
        value: activeAnnouncements.length,
        fill: chartColours.purple,
      },
      {
        name: "Bookings",
        value: bookings.length,
        fill: chartColours.blue,
      },
      {
        name: "Issue Reports",
        value: issueReports.length,
        fill: chartColours.coral,
      },
      {
        name: "Events",
        value: upcomingEvents.length,
        fill: chartColours.amber,
      },
      {
        name: "Resources",
        value: resources.length,
        fill: chartColours.softGreen,
      },
    ],
    [
      approvedResidents.length,
      activeAnnouncements.length,
      bookings.length,
      issueReports.length,
      upcomingEvents.length,
      resources.length,
    ],
  );

  const registrationStatusData = useMemo(
    () => [
      {
        name: "Approved",
        value: approvedResidents.length,
        colour: chartColours.green,
      },
      {
        name: "Pending",
        value: pendingResidents.length,
        colour: chartColours.amber,
      },
      {
        name: "Rejected",
        value: rejectedResidents.length,
        colour: chartColours.coral,
      },
    ],
    [
      approvedResidents.length,
      pendingResidents.length,
      rejectedResidents.length,
    ],
  );

  const bookingStatusData = useMemo(
    () => [
      {
        name: "Pending",
        value: pendingBookings.length,
        colour: chartColours.amber,
      },
      {
        name: "Approved",
        value: approvedBookings.length,
        colour: chartColours.blue,
      },
      {
        name: "Completed",
        value: completedBookings.length,
        colour: chartColours.green,
      },
      {
        name: "Rejected",
        value: rejectedBookings.length,
        colour: chartColours.coral,
      },
    ],
    [
      pendingBookings.length,
      approvedBookings.length,
      completedBookings.length,
      rejectedBookings.length,
    ],
  );

  const issueStatusData = useMemo(
    () => [
      {
        name: "Open",
        value: openIssueReports.length,
        colour: chartColours.coral,
      },
      {
        name: "In Progress",
        value: inProgressIssueReports.length,
        colour: chartColours.blue,
      },
      {
        name: "Resolved",
        value: resolvedIssueReports.length,
        colour: chartColours.green,
      },
      {
        name: "Rejected",
        value: rejectedIssueReports.length,
        colour: chartColours.grey,
      },
    ],
    [
      openIssueReports.length,
      inProgressIssueReports.length,
      resolvedIssueReports.length,
      rejectedIssueReports.length,
    ],
  );

  const insights = useMemo(
    () => [
      {
        icon: FaUsers,
        title: "Resident approvals",
        text:
          pendingResidents.length > 0
            ? `${pendingResidents.length} resident registration request${
                pendingResidents.length === 1 ? "" : "s"
              } waiting for review.`
            : "Resident registration queue is clear.",
        type: pendingResidents.length > 0 ? "warning" : "good",
      },
      {
        icon: FaCalendarCheck,
        title: "Booking requests",
        text:
          pendingBookings.length > 0
            ? `${pendingBookings.length} booking request${
                pendingBookings.length === 1 ? "" : "s"
              } need manager decision.`
            : "No pending booking requests at the moment.",
        type: pendingBookings.length > 0 ? "warning" : "good",
      },
      {
        icon: FaClipboardList,
        title: "Issue reports",
        text:
          openIssueReports.length + inProgressIssueReports.length > 0
            ? `${
                openIssueReports.length + inProgressIssueReports.length
              } issue report${
                openIssueReports.length + inProgressIssueReports.length === 1
                  ? ""
                  : "s"
              } still require attention.`
            : "Issue report activity is stable.",
        type:
          openIssueReports.length + inProgressIssueReports.length > 0
            ? "warning"
            : "good",
      },
    ],
    [
      pendingResidents.length,
      pendingBookings.length,
      openIssueReports.length,
      inProgressIssueReports.length,
    ],
  );

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading data analysis...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="data-analysis"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Data Analysis"
          subtitle="Review community activity, requests and service performance."
        />

        {loadError && <p className="manager-message">{loadError}</p>}

        <section className="analysis-hero">
          <div>
            <span>Management Report</span>
            <h2>Community Performance Overview</h2>
            <p>
              Track resident activity, bookings, reported issues and shared
              resource usage from one clear reporting page.
            </p>
          </div>

          <div className="analysis-hero-icon">
            <FaChartBar />
          </div>
        </section>

        <section className="analysis-summary-grid">
          <article className="analysis-summary-card">
            <div>
              <FaUsers />
            </div>
            <h3>{approvedResidents.length}</h3>
            <p>Approved residents</p>
          </article>

          <article className="analysis-summary-card">
            <div>
              <FaBell />
            </div>
            <h3>{pendingResidents.length}</h3>
            <p>Pending registrations</p>
          </article>

          <article className="analysis-summary-card">
            <div>
              <FaCalendarCheck />
            </div>
            <h3>{pendingBookings.length}</h3>
            <p>Pending bookings</p>
          </article>

          <article className="analysis-summary-card">
            <div>
              <FaClipboardList />
            </div>
            <h3>{openIssueReports.length}</h3>
            <p>Open issue reports</p>
          </article>

          <article className="analysis-summary-card">
            <div>
              <FaBullhorn />
            </div>
            <h3>{activeAnnouncements.length}</h3>
            <p>Active announcements</p>
          </article>

          <article className="analysis-summary-card">
            <div>
              <FaFolderOpen />
            </div>
            <h3>{availableResources.length}</h3>
            <p>Available resources</p>
          </article>
        </section>

        <section className="analysis-main-grid">
          <section className="manager-panel analysis-activity-panel">
            <div className="manager-panel-heading">
              <div>
                <FaChartBar />
                <h2>Community Activity Overview</h2>
              </div>

              <span>{getTotalValue(activityData)} records</span>
            </div>

            <div className="analysis-chart-large">
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={activityData} barSize={34}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Records" radius={[8, 8, 0, 0]}>
                    {activityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="manager-panel analysis-insights-panel">
            <div className="manager-panel-heading">
              <div>
                <FaExclamationTriangle />
                <h2>Management Insights</h2>
              </div>

              <span>Live overview</span>
            </div>

            <div className="analysis-insight-list">
              {insights.map((insight) => {
                const Icon = insight.icon;

                return (
                  <article
                    key={insight.title}
                    className={`analysis-insight-card insight-${insight.type}`}
                  >
                    <div className="analysis-insight-icon">
                      <Icon />
                    </div>

                    <div>
                      <h3>{insight.title}</h3>
                      <p>{insight.text}</p>
                      <span>{getInsightStatus(insight.type)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <section className="analysis-donut-grid">
          <section className="manager-panel analysis-donut-panel">
            <div className="manager-panel-heading">
              <div>
                <FaChartPie />
                <h2>Resident Registration Status</h2>
              </div>

              <span>{getTotalValue(registrationStatusData)} residents</span>
            </div>

            <div className="analysis-donut-content">
              <div className="analysis-donut-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={getDonutData(registrationStatusData)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {getDonutData(registrationStatusData).map((entry) => (
                        <Cell key={entry.name} fill={entry.colour} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="analysis-donut-center">
                  <strong>{getTotalValue(registrationStatusData)}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>
          </section>

          <section className="manager-panel analysis-donut-panel">
            <div className="manager-panel-heading">
              <div>
                <FaChartPie />
                <h2>Booking Status</h2>
              </div>

              <span>{getTotalValue(bookingStatusData)} bookings</span>
            </div>

            <div className="analysis-donut-content">
              <div className="analysis-donut-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={getDonutData(bookingStatusData)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {getDonutData(bookingStatusData).map((entry) => (
                        <Cell key={entry.name} fill={entry.colour} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="analysis-donut-center">
                  <strong>{getTotalValue(bookingStatusData)}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>
          </section>

          <section className="manager-panel analysis-donut-panel">
            <div className="manager-panel-heading">
              <div>
                <FaChartPie />
                <h2>Issue Reports Status</h2>
              </div>

              <span>{getTotalValue(issueStatusData)} reports</span>
            </div>

            <div className="analysis-donut-content">
              <div className="analysis-donut-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={getDonutData(issueStatusData)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {getDonutData(issueStatusData).map((entry) => (
                        <Cell key={entry.name} fill={entry.colour} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="analysis-donut-center">
                  <strong>{getTotalValue(issueStatusData)}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="manager-footer-note">
          <FaRegCalendarAlt />
          <p>
            This report helps the Building Manager monitor community activity
            and identify areas that require attention.
          </p>

          <span className="analysis-footer-status">Updated live</span>
        </section>
      </section>
    </main>
  );
}
