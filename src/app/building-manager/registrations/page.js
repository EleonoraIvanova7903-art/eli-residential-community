"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../manager-shared.css";
import "./registrations.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaRegUser,
  FaUserCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
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

export default function RegistrationsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [managerProfile, setManagerProfile] = useState(null);

  const [pendingResidents, setPendingResidents] = useState([]);
  const [approvedResidents, setApprovedResidents] = useState([]);
  const [rejectedResidents, setRejectedResidents] = useState([]);

  const [selectedResident, setSelectedResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRegistrationsData() {
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
    } catch (error) {
      setMessage("Registration data could not be loaded.");
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

        await loadRegistrationsData();

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

      setSelectedResident(null);
      setMessage("Resident approved.");
      await loadRegistrationsData();
    } catch (error) {
      setMessage("Resident could not be approved.");
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

      setSelectedResident(null);
      setMessage("Registration rejected.");
      await loadRegistrationsData();
    } catch (error) {
      setMessage("Registration could not be rejected.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="manager-loading-page">
        <p>Loading registrations...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="registrations"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Resident Registrations"
          subtitle="Review and manage resident access requests."
        />

        {message && <p className="manager-message">{message}</p>}

        <section className="registrations-hero">
          <div className="registrations-hero-content">
            <span className="registrations-hero-label">Access Requests</span>

            <h2>Resident Approval</h2>

            <p>Approve or reject new resident registrations.</p>
          </div>

          <div className="registrations-summary-grid">
            <article>
              <FaClock />
              <p>Pending</p>
              <h3>{pendingResidents.length}</h3>
            </article>

            <article>
              <FaCheckCircle />
              <p>Approved</p>
              <h3>{approvedResidents.length}</h3>
            </article>

            <article>
              <FaTimesCircle />
              <p>Rejected</p>
              <h3>{rejectedResidents.length}</h3>
            </article>
          </div>
        </section>

        <section className="registrations-grid">
          <article className="manager-panel registrations-main-panel">
            <div className="manager-panel-heading">
              <div>
                <FaUserCheck />
                <h2>Pending Requests</h2>
              </div>

              <span>{pendingResidents.length} pending</span>
            </div>

            <div className="manager-table-wrap">
              <table className="manager-table registrations-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Building</th>
                    <th>Apartment</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingResidents.length === 0 ? (
                    <tr>
                      <td colSpan="7">No pending registrations.</td>
                    </tr>
                  ) : (
                    pendingResidents.map((resident) => (
                      <tr key={resident.id}>
                        <td>{getFullName(resident)}</td>
                        <td>{resident.email || "—"}</td>
                        <td>{resident.phone || "—"}</td>
                        <td>{resident.building || "—"}</td>
                        <td>{resident.apartment || "—"}</td>
                        <td>{formatDate(resident.createdAt)}</td>
                        <td>
                          <div className="manager-table-actions">
                            <button
                              type="button"
                              className="view-btn"
                              onClick={() => setSelectedResident(resident)}
                            >
                              View
                            </button>

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

          <aside className="manager-panel registrations-details-panel">
            <div className="manager-panel-heading">
              <div>
                <FaRegUser />
                <h2>Resident Details</h2>
              </div>

              <span>Selected request</span>
            </div>

            {!selectedResident ? (
              <p className="manager-empty-text">
                Select a resident to view details.
              </p>
            ) : (
              <div className="registrations-details-list">
                <div>
                  <span>Full name</span>
                  <strong>{getFullName(selectedResident)}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedResident.email || "—"}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{selectedResident.phone || "—"}</strong>
                </div>

                <div>
                  <span>Building</span>
                  <strong>{selectedResident.building || "—"}</strong>
                </div>

                <div>
                  <span>Apartment</span>
                  <strong>{selectedResident.apartment || "—"}</strong>
                </div>

                <div>
                  <span>Requested</span>
                  <strong>{formatDate(selectedResident.createdAt)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>Pending</strong>
                </div>

                <div className="registrations-details-actions">
                  <button
                    type="button"
                    className="approve-btn registrations-full-btn"
                    onClick={() => handleApproveResident(selectedResident.id)}
                  >
                    <FaCheckCircle />
                    Approve Resident
                  </button>

                  <button
                    type="button"
                    className="reject-btn registrations-full-btn"
                    onClick={() => handleRejectResident(selectedResident.id)}
                  >
                    <FaTimesCircle />
                    Reject Request
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}
