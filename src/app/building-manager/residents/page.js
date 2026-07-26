"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import "../manager-shared.css";
import "./residents.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaBuilding,
  FaDoorOpen,
  FaSearch,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Resident";
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

function getResidentSearchText(resident) {
  return [
    resident.firstName,
    resident.lastName,
    resident.email,
    resident.phone,
    resident.building,
    resident.apartment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ResidentsPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [residents, setResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
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

        unsubscribeResidents();

        unsubscribeResidents = onSnapshot(
          collection(db, "users"),
          (snapshot) => {
            const approvedResidents = snapshot.docs
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

            setResidents(approvedResidents);
            setIsLoading(false);
          },
          () => {
            setLoadError("Residents could not be loaded.");
            setIsLoading(false);
          },
        );
      } catch {
        setLoadError("Residents could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeResidents();
    };
  }, [router]);

  const filteredResidents = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return residents;
    }

    return residents.filter((resident) =>
      getResidentSearchText(resident).includes(cleanSearchTerm),
    );
  }, [residents, searchTerm]);

  const totalResidents = residents.length;

  const totalBuildings = useMemo(() => {
    const buildings = residents
      .map((resident) => resident.building)
      .filter(Boolean);

    return new Set(buildings).size;
  }, [residents]);

  const totalApartments = useMemo(() => {
    const apartments = residents
      .map((resident) => resident.apartment)
      .filter(Boolean);

    return new Set(apartments).size;
  }, [residents]);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading residents...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="residents"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Residents"
          subtitle="View approved residents and contact details."
        />

        {loadError && <p className="manager-message">{loadError}</p>}

        <section className="residents-hero">
          <div>
            <span>Resident Directory</span>
            <h2>Approved Residents</h2>
            <p>Search and review resident information.</p>
          </div>

          <div className="residents-hero-icon">
            <FaUsers />
          </div>
        </section>

        <section className="residents-summary-grid">
          <article className="residents-summary-card">
            <div>
              <FaUserCheck />
            </div>
            <h3>{totalResidents}</h3>
            <p>Approved residents</p>
          </article>

          <article className="residents-summary-card">
            <div>
              <FaBuilding />
            </div>
            <h3>{totalBuildings}</h3>
            <p>Buildings</p>
          </article>

          <article className="residents-summary-card">
            <div>
              <FaDoorOpen />
            </div>
            <h3>{totalApartments}</h3>
            <p>Apartments</p>
          </article>
        </section>

        <section className="manager-panel residents-panel">
          <div className="manager-panel-heading">
            <div>
              <FaUsers />
              <h2>Residents List</h2>
            </div>

            <span>{filteredResidents.length} shown</span>
          </div>

          <div className="residents-toolbar">
            <div className="residents-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by name, email, phone, building or apartment..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {filteredResidents.length === 0 ? (
            <p className="manager-empty-text">No residents found.</p>
          ) : (
            <div className="manager-table-wrap">
              <table className="manager-table residents-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Building</th>
                    <th>Apartment</th>
                    <th>Approved</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResidents.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <strong>{getFullName(resident)}</strong>
                      </td>
                      <td>{resident.email || "—"}</td>
                      <td>{resident.phone || "—"}</td>
                      <td>{resident.building || "—"}</td>
                      <td>{resident.apartment || "—"}</td>
                      <td>{formatDate(resident.approvedAt)}</td>
                      <td>
                        <span className="resident-status-badge">
                          {resident.status || "approved"}
                        </span>
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
