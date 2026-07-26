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
import "./resources.css";

import ManagerSidebar from "../components/ManagerSidebar";
import ManagerTopbar from "../components/ManagerTopbar";

import {
  FaBan,
  FaCheckCircle,
  FaClipboardList,
  FaFolderOpen,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaTools,
  FaUndo,
  FaUsers,
  FaWrench,
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
  return normaliseValue(status).replace(/\s+/g, "-") || "available";
}

function getStatusLabel(status) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "maintenance") {
    return "Maintenance";
  }

  if (cleanStatus === "unavailable") {
    return "Unavailable";
  }

  if (cleanStatus === "archived") {
    return "Archived";
  }

  return "Available";
}

function getResourceSearchText(resource) {
  return [
    resource.name,
    resource.description,
    resource.category,
    resource.location,
    resource.capacity,
    resource.status,
    resource.bookingType,
    resource.createdByName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ResourcesPage() {
  const router = useRouter();

  const [managerProfile, setManagerProfile] = useState(null);
  const [resources, setResources] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Shared Space");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [bookingType, setBookingType] = useState("Approval Required");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let unsubscribeResources = () => {};

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

        unsubscribeResources();

        const resourcesQuery = query(
          collection(db, "resources"),
          orderBy("createdAt", "desc"),
        );

        unsubscribeResources = onSnapshot(
          resourcesQuery,
          (snapshot) => {
            const resourceList = snapshot.docs.map((resourceDoc) => ({
              id: resourceDoc.id,
              ...resourceDoc.data(),
            }));

            setResources(resourceList);
            setIsLoading(false);
          },
          () => {
            setLoadError("Resources could not be loaded.");
            setIsLoading(false);
          },
        );
      } catch {
        setLoadError("Resources could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeResources();
    };
  }, [router]);

  const filteredResources = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    if (!cleanSearchTerm) {
      return resources;
    }

    return resources.filter((resource) =>
      getResourceSearchText(resource).includes(cleanSearchTerm),
    );
  }, [resources, searchTerm]);

  const availableResources = useMemo(
    () =>
      resources.filter(
        (resource) => normaliseValue(resource.status) === "available",
      ),
    [resources],
  );

  const maintenanceResources = useMemo(
    () =>
      resources.filter(
        (resource) => normaliseValue(resource.status) === "maintenance",
      ),
    [resources],
  );

  const unavailableResources = useMemo(
    () =>
      resources.filter(
        (resource) => normaliseValue(resource.status) === "unavailable",
      ),
    [resources],
  );

  async function handleCreateResource(event) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    if (!cleanName || !cleanDescription || !cleanLocation) {
      setPageMessage("Please add a resource name, location and description.");
      return;
    }

    if (!managerProfile) {
      setPageMessage("Manager profile is not loaded.");
      return;
    }

    try {
      setIsSaving(true);
      setPageMessage("");

      await addDoc(collection(db, "resources"), {
        name: cleanName,
        description: cleanDescription,
        category,
        location: cleanLocation,
        capacity: capacity ? Number(capacity) : null,
        bookingType,
        status: "available",
        isBookable: true,

        createdAt: serverTimestamp(),
        createdBy: managerProfile.id,
        createdByName: getManagerName(managerProfile),
      });

      setName("");
      setDescription("");
      setCategory("Shared Space");
      setLocation("");
      setCapacity("");
      setBookingType("Approval Required");
      setPageMessage("Resource created.");
    } catch {
      setPageMessage("Resource could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(resourceId, nextStatus) {
    try {
      setPageMessage("");

      const resourceRef = doc(db, "resources", resourceId);

      await updateDoc(resourceRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: managerProfile?.id || null,
      });

      if (nextStatus === "available") {
        setPageMessage("Resource marked as available.");
        return;
      }

      if (nextStatus === "maintenance") {
        setPageMessage("Resource moved to maintenance.");
        return;
      }

      if (nextStatus === "unavailable") {
        setPageMessage("Resource marked as unavailable.");
        return;
      }

      setPageMessage("Resource updated.");
    } catch {
      setPageMessage("Resource could not be updated.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="manager-loading-page">
        <p>Loading resources...</p>
      </main>
    );
  }

  return (
    <main className="manager-dashboard-page">
      <ManagerSidebar
        activePage="resources"
        managerProfile={managerProfile}
        onSignOut={handleSignOut}
      />

      <section className="manager-main">
        <ManagerTopbar
          title="Resources"
          subtitle="Create, review and manage shared community resources."
        />

        {(pageMessage || loadError) && (
          <p className="manager-message">{pageMessage || loadError}</p>
        )}

        <section className="resources-hero">
          <div>
            <span>Shared Facilities</span>
            <h2>Community Resources</h2>
            <p>
              Manage shared spaces, equipment and facilities used by residents
              for bookings and community activities.
            </p>
          </div>

          <div className="resources-hero-icon">
            <FaFolderOpen />
          </div>
        </section>

        <section className="resources-summary-grid">
          <article className="resources-summary-card">
            <div>
              <FaClipboardList />
            </div>
            <h3>{resources.length}</h3>
            <p>Total resources</p>
          </article>

          <article className="resources-summary-card">
            <div>
              <FaCheckCircle />
            </div>
            <h3>{availableResources.length}</h3>
            <p>Available</p>
          </article>

          <article className="resources-summary-card">
            <div>
              <FaWrench />
            </div>
            <h3>{maintenanceResources.length}</h3>
            <p>Maintenance</p>
          </article>

          <article className="resources-summary-card">
            <div>
              <FaBan />
            </div>
            <h3>{unavailableResources.length}</h3>
            <p>Unavailable</p>
          </article>
        </section>

        <section className="resources-grid">
          <section className="manager-panel resources-form-panel">
            <div className="manager-panel-heading">
              <div>
                <FaPlus />
                <h2>Add Resource</h2>
              </div>

              <span>New resource</span>
            </div>

            <form className="resources-form" onSubmit={handleCreateResource}>
              <label>
                Resource name
                <input
                  type="text"
                  placeholder="Community Hall"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  placeholder="Write a short resource description..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="resources-form-row">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="Shared Space">Shared Space</option>
                    <option value="Parking">Parking</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Outdoor Area">Outdoor Area</option>
                    <option value="Family Area">Family Area</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Booking type
                  <select
                    value={bookingType}
                    onChange={(event) => setBookingType(event.target.value)}
                  >
                    <option value="Approval Required">Approval Required</option>
                    <option value="Manager Managed">Manager Managed</option>
                    <option value="Information Only">Information Only</option>
                  </select>
                </label>
              </div>

              <label>
                Location
                <input
                  type="text"
                  placeholder="Ground floor"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>

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
                <span>{isSaving ? "Creating..." : "Create Resource"}</span>
              </button>
            </form>
          </section>

          <section className="manager-panel resources-list-panel">
            <div className="manager-panel-heading">
              <div>
                <FaFolderOpen />
                <h2>Resources</h2>
              </div>

              <span>{filteredResources.length} shown</span>
            </div>

            <div className="resources-toolbar">
              <div className="resources-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by name, category, location or status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {filteredResources.length === 0 ? (
              <p className="manager-empty-text">No resources found.</p>
            ) : (
              <div className="resources-card-list">
                {filteredResources.map((resource) => (
                  <article key={resource.id} className="resource-card">
                    <div className="resource-card-header">
                      <div>
                        <h3>{resource.name}</h3>
                        <p>
                          {resource.createdByName || "Building Manager"} ·{" "}
                          {resource.category || "Shared Space"}
                        </p>
                      </div>

                      <span
                        className={`resource-status-badge status-${getStatusClass(
                          resource.status,
                        )}`}
                      >
                        {getStatusLabel(resource.status)}
                      </span>
                    </div>

                    <div className="resource-details-grid">
                      <div>
                        <FaMapMarkerAlt />
                        <span>{resource.location || "—"}</span>
                      </div>

                      <div>
                        <FaUsers />
                        <span>
                          {resource.capacity
                            ? `${resource.capacity} capacity`
                            : "Capacity not set"}
                        </span>
                      </div>

                      <div>
                        <FaTools />
                        <span>{resource.category || "Shared Space"}</span>
                      </div>

                      <div>
                        <FaClipboardList />
                        <span>
                          {resource.bookingType || "Approval Required"}
                        </span>
                      </div>
                    </div>

                    <p className="resource-description">
                      {resource.description || "No description provided."}
                    </p>

                    <div className="resource-meta-row">
                      <span className="resource-category-badge">
                        {resource.category || "Shared Space"}
                      </span>

                      <span className="resource-booking-badge">
                        {resource.bookingType || "Approval Required"}
                      </span>
                    </div>

                    <div className="resource-actions">
                      {normaliseValue(resource.status) !== "available" && (
                        <button
                          type="button"
                          className="resource-available-btn"
                          onClick={() =>
                            handleStatusChange(resource.id, "available")
                          }
                        >
                          <FaCheckCircle />
                          <span>Set Available</span>
                        </button>
                      )}

                      {normaliseValue(resource.status) !== "maintenance" && (
                        <button
                          type="button"
                          className="resource-maintenance-btn"
                          onClick={() =>
                            handleStatusChange(resource.id, "maintenance")
                          }
                        >
                          <FaWrench />
                          <span>Maintenance</span>
                        </button>
                      )}

                      {normaliseValue(resource.status) !== "unavailable" && (
                        <button
                          type="button"
                          className="resource-unavailable-btn"
                          onClick={() =>
                            handleStatusChange(resource.id, "unavailable")
                          }
                        >
                          <FaBan />
                          <span>Unavailable</span>
                        </button>
                      )}

                      {normaliseValue(resource.status) === "unavailable" && (
                        <button
                          type="button"
                          className="resource-restore-btn"
                          onClick={() =>
                            handleStatusChange(resource.id, "available")
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
