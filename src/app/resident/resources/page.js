"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./resources.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ResidentSidebar from "../components/ResidentSidebar";
import ResidentTopbar from "../components/ResidentTopbar";

import {
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaFolderOpen,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaSearch,
  FaTags,
  FaTimesCircle,
  FaTools,
  FaUsers,
} from "react-icons/fa";

/* Normalise text values */
function normaliseValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/* Normalise role names */
function normaliseRole(value) {
  return normaliseValue(value).replace(/\s+/g, "-");
}

/* Get resource title */
function getResourceTitle(resource) {
  return (
    resource?.title ||
    resource?.name ||
    resource?.resourceName ||
    "Shared resource"
  );
}

/* Get resource category */
function getResourceCategory(resource) {
  return (
    resource?.category ||
    resource?.resourceType ||
    resource?.bookingType ||
    "General"
  );
}

/* Get resource description */
function getResourceDescription(resource) {
  return (
    resource?.description ||
    resource?.details ||
    "No additional description has been provided."
  );
}

/* Get resource status */
function getResourceStatus(resource) {
  return normaliseValue(resource?.status || "available");
}

/* Create safe CSS class */
function getStatusClass(value) {
  return normaliseValue(value || "available")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* Check whether a resource can be booked */
function isBookableResource(resource) {
  const status = getResourceStatus(resource);

  const unavailableStatuses = [
    "maintenance",
    "unavailable",
    "inactive",
    "closed",
    "archived",
  ];

  return (
    resource?.isBookable !== false && !unavailableStatuses.includes(status)
  );
}

/* Get resource capacity */
function getResourceCapacity(resource) {
  const capacity =
    resource?.capacity || resource?.maximumCapacity || resource?.maxCapacity;

  if (!capacity) {
    return "Not specified";
  }

  return `${capacity} people`;
}

/* Get resource opening information */
function getResourceAvailability(resource) {
  return (
    resource?.availability ||
    resource?.openingHours ||
    resource?.availableHours ||
    "Availability confirmed during booking"
  );
}

/* Get resource rules */
function getResourceRules(resource) {
  return (
    resource?.rules ||
    resource?.usageRules ||
    resource?.instructions ||
    "Please use the resource responsibly and leave it clean after use."
  );
}

/* Get status label */
function getStatusLabel(status) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "maintenance") {
    return "Maintenance";
  }

  if (cleanStatus === "unavailable") {
    return "Unavailable";
  }

  if (cleanStatus === "inactive") {
    return "Inactive";
  }

  if (cleanStatus === "closed") {
    return "Closed";
  }

  if (cleanStatus === "archived") {
    return "Archived";
  }

  return "Available";
}

/* Get status icon */
function ResourceStatusIcon({ status }) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "maintenance") {
    return <FaTools />;
  }

  if (
    cleanStatus === "unavailable" ||
    cleanStatus === "inactive" ||
    cleanStatus === "closed" ||
    cleanStatus === "archived"
  ) {
    return <FaTimesCircle />;
  }

  return <FaCheckCircle />;
}

export default function ResidentResourcesPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);

  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let unsubscribeResources = () => {};

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

        unsubscribeResources = onSnapshot(
          collection(db, "resources"),
          (snapshot) => {
            const resourceList = snapshot.docs
              .map((resourceDocument) => ({
                id: resourceDocument.id,
                ...resourceDocument.data(),
              }))
              .filter((resource) => getResourceStatus(resource) !== "archived")
              .sort((firstResource, secondResource) =>
                getResourceTitle(firstResource).localeCompare(
                  getResourceTitle(secondResource),
                ),
              );

            setResources(resourceList);

            setSelectedResourceId((currentResourceId) => {
              const selectedResourceExists = resourceList.some(
                (resource) => resource.id === currentResourceId,
              );

              if (selectedResourceExists) {
                return currentResourceId;
              }

              return resourceList[0]?.id || "";
            });

            setLoading(false);
          },
          (error) => {
            console.error("Resident resources loading error:", error);

            setPageError(
              "Community resources could not be loaded at the moment.",
            );

            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Resident resources access error:", error);

        setPageError("The resources page could not be opened.");

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeResources();
    };
  }, [router]);

  const categories = useMemo(() => {
    const resourceCategories = resources
      .map((resource) => String(getResourceCategory(resource)).trim())
      .filter(Boolean);

    return [...new Set(resourceCategories)].sort(
      (firstCategory, secondCategory) =>
        firstCategory.localeCompare(secondCategory),
    );
  }, [resources]);

  const filteredResources = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return resources.filter((resource) => {
      const resourceCategory = getResourceCategory(resource);

      const resourceStatus = getResourceStatus(resource);

      const matchesCategory =
        selectedCategory === "all" ||
        normaliseValue(resourceCategory) === normaliseValue(selectedCategory);

      const matchesStatus =
        selectedStatus === "all" ||
        resourceStatus === normaliseValue(selectedStatus);

      const searchableText = [
        getResourceTitle(resource),
        getResourceCategory(resource),
        getResourceDescription(resource),
        resource.location,
        resource.availability,
        resource.openingHours,
        resource.rules,
        resource.usageRules,
        resource.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !cleanSearchTerm || searchableText.includes(cleanSearchTerm);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [resources, searchTerm, selectedCategory, selectedStatus]);

  const selectedResource =
    filteredResources.find((resource) => resource.id === selectedResourceId) ||
    filteredResources[0] ||
    null;

  const availableResources = resources.filter(isBookableResource);

  const maintenanceResources = resources.filter(
    (resource) => getResourceStatus(resource) === "maintenance",
  );

  const unavailableResources = resources.filter(
    (resource) =>
      !isBookableResource(resource) &&
      getResourceStatus(resource) !== "maintenance",
  );

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading community resources...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="resources"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="Resources"
          subtitle="Explore shared community facilities and equipment."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-resources-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-resources-hero">
          <div>
            <span>Community Facilities</span>

            <h2>Shared resources for residents</h2>

            <p>
              Explore the facilities and equipment available in the community,
              review their usage information and open the booking page when you
              are ready to submit a request.
            </p>
          </div>

          <div className="resident-resources-hero-icon">
            <FaFolderOpen />
          </div>
        </section>

        <section className="resident-resources-summary">
          <article>
            <div>
              <FaFolderOpen />
            </div>

            <section>
              <span>Total resources</span>
              <strong>{resources.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaCheckCircle />
            </div>

            <section>
              <span>Available</span>
              <strong>{availableResources.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaTools />
            </div>

            <section>
              <span>Maintenance</span>
              <strong>{maintenanceResources.length}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaTimesCircle />
            </div>

            <section>
              <span>Unavailable</span>
              <strong>{unavailableResources.length}</strong>
            </section>
          </article>
        </section>

        <section className="resident-resources-panel">
          <div className="resident-resources-panel-heading">
            <div>
              <FaFolderOpen />

              <section>
                <h2>Community Resources</h2>

                <p>
                  {filteredResources.length} resource
                  {filteredResources.length === 1 ? "" : "s"} shown
                </p>
              </section>
            </div>
          </div>

          <div className="resident-resources-toolbar">
            <label className="resident-resources-search">
              <FaSearch />

              <input
                type="search"
                placeholder="Search resources"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="resident-resources-filter">
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

            <label className="resident-resources-filter">
              <FaFilter />

              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="all">All statuses</option>

                <option value="available">Available</option>

                <option value="maintenance">Maintenance</option>

                <option value="unavailable">Unavailable</option>
              </select>
            </label>
          </div>

          {filteredResources.length === 0 ? (
            <div className="resident-resources-empty">
              <FaFolderOpen />

              <h3>No resources found</h3>

              <p>
                There are no resources matching the selected search and filters.
              </p>
            </div>
          ) : (
            <div className="resident-resources-content">
              <div className="resident-resources-list">
                {filteredResources.map((resource) => {
                  const resourceStatus = getResourceStatus(resource);

                  const selected = selectedResource?.id === resource.id;

                  return (
                    <button
                      key={resource.id}
                      type="button"
                      className={`resident-resource-card ${
                        selected ? "selected" : ""
                      }`}
                      aria-pressed={selected}
                      onClick={() => setSelectedResourceId(resource.id)}
                    >
                      <div className="resident-resource-card-icon">
                        <FaFolderOpen />
                      </div>

                      <section className="resident-resource-card-content">
                        <div className="resident-resource-card-heading">
                          <div>
                            <span className="resident-resource-category">
                              {getResourceCategory(resource)}
                            </span>

                            <h3>{getResourceTitle(resource)}</h3>
                          </div>

                          <span
                            className={`resident-resource-status status-${getStatusClass(
                              resourceStatus,
                            )}`}
                          >
                            <ResourceStatusIcon status={resourceStatus} />

                            {getStatusLabel(resourceStatus)}
                          </span>
                        </div>

                        <p>{getResourceDescription(resource)}</p>

                        <div className="resident-resource-card-meta">
                          <span>
                            <FaMapMarkerAlt />

                            {resource.location || "Location not specified"}
                          </span>

                          <span>
                            <FaUsers />

                            {getResourceCapacity(resource)}
                          </span>
                        </div>
                      </section>
                    </button>
                  );
                })}
              </div>

              <aside className="resident-resource-details">
                {selectedResource ? (
                  <>
                    <div className="resident-resource-details-heading">
                      <div className="resident-resource-details-title">
                        <span className="resident-resource-category">
                          {getResourceCategory(selectedResource)}
                        </span>

                        <span
                          className={`resident-resource-status status-${getStatusClass(
                            getResourceStatus(selectedResource),
                          )}`}
                        >
                          <ResourceStatusIcon
                            status={getResourceStatus(selectedResource)}
                          />

                          {getStatusLabel(getResourceStatus(selectedResource))}
                        </span>
                      </div>

                      <h2>{getResourceTitle(selectedResource)}</h2>

                      <p>{getResourceDescription(selectedResource)}</p>
                    </div>

                    <div className="resident-resource-details-list">
                      <div>
                        <FaMapMarkerAlt />

                        <section>
                          <span>Location</span>

                          <strong>
                            {selectedResource.location ||
                              "Location not specified"}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaUsers />

                        <section>
                          <span>Capacity</span>

                          <strong>
                            {getResourceCapacity(selectedResource)}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaClock />

                        <section>
                          <span>Availability</span>

                          <strong>
                            {getResourceAvailability(selectedResource)}
                          </strong>
                        </section>
                      </div>

                      <div>
                        <FaTags />

                        <section>
                          <span>Category</span>

                          <strong>
                            {getResourceCategory(selectedResource)}
                          </strong>
                        </section>
                      </div>
                    </div>

                    <div className="resident-resource-rules">
                      <div>
                        <FaInfoCircle />
                        <h3>Usage information</h3>
                      </div>

                      <p>{getResourceRules(selectedResource)}</p>
                    </div>

                    {isBookableResource(selectedResource) ? (
                      <Link
                        href="/resident/bookings"
                        className="resident-resource-book-button"
                      >
                        <FaCalendarCheck />
                        <span>Request a Booking</span>
                      </Link>
                    ) : (
                      <div className="resident-resource-unavailable-note">
                        <ResourceStatusIcon
                          status={getResourceStatus(selectedResource)}
                        />

                        <p>
                          This resource is not currently available for booking.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="resident-resource-details-empty">
                    <FaFolderOpen />

                    <h3>Select a resource</h3>

                    <p>
                      Choose a resource from the list to view its full
                      information.
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
