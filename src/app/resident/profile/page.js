"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import "../resident-shared.css";
import "./profile.css";

import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

import ResidentSidebar from "../components/ResidentSidebar";
import ResidentTopbar from "../components/ResidentTopbar";

import {
  FaBuilding,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaHome,
  FaIdBadge,
  FaInfoCircle,
  FaPhone,
  FaSave,
  FaShieldAlt,
  FaUser,
  FaUserCheck,
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

/* Build the resident full name */
function getResidentName(profile) {
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Resident";
}

/* Create profile initials */
function getResidentInitials(profile) {
  const firstInitial = String(profile?.firstName || "")
    .trim()
    .charAt(0);

  const lastInitial = String(profile?.lastName || "")
    .trim()
    .charAt(0);

  const initials = `${firstInitial}${lastInitial}`.trim().toUpperCase();

  return initials || "R";
}

/* Convert Firestore or string dates */
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

/* Format profile dates */
function formatDate(value) {
  const date = getDateValue(value);

  if (!date) {
    return "Not recorded";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* Format account role */
function getRoleLabel(role) {
  const cleanRole = normaliseRole(role);

  if (cleanRole === "building-manager") {
    return "Building Manager";
  }

  return "Resident";
}

/* Format account status */
function getStatusLabel(status) {
  const cleanStatus = normaliseValue(status);

  if (cleanStatus === "approved") {
    return "Approved";
  }

  if (cleanStatus === "pending") {
    return "Pending approval";
  }

  if (cleanStatus === "rejected") {
    return "Not approved";
  }

  return status || "Not recorded";
}

export default function ResidentProfilePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [residentProfile, setResidentProfile] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);
      setPageError("");

      const userReference = doc(db, "users", user.uid);

      unsubscribeProfile = onSnapshot(
        userReference,
        async (userSnapshot) => {
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

          const profileData = {
            id: userSnapshot.id,
            ...userData,
          };

          setResidentProfile(profileData);

          setFirstName(String(profileData.firstName || ""));

          setLastName(String(profileData.lastName || ""));

          setPhone(String(profileData.phone || ""));

          setLoading(false);
        },
        (error) => {
          console.error("Resident profile loading error:", error);

          setPageError("Your resident profile could not be loaded.");

          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, [router]);

  const profileHasChanges = useMemo(() => {
    if (!residentProfile) {
      return false;
    }

    return (
      firstName.trim() !== String(residentProfile.firstName || "").trim() ||
      lastName.trim() !== String(residentProfile.lastName || "").trim() ||
      phone.trim() !== String(residentProfile.phone || "").trim()
    );
  }, [firstName, lastName, phone, residentProfile]);

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!currentUser || !residentProfile) {
      setFeedback({
        type: "error",
        message: "Your resident profile is not available.",
      });

      return;
    }

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();

    setFeedback(null);

    if (!cleanFirstName) {
      setFeedback({
        type: "error",
        message: "Please enter your first name.",
      });

      return;
    }

    if (!cleanLastName) {
      setFeedback({
        type: "error",
        message: "Please enter your last name.",
      });

      return;
    }

    if (cleanPhone && cleanPhone.length < 7) {
      setFeedback({
        type: "error",
        message: "Please enter a valid phone number.",
      });

      return;
    }

    if (!profileHasChanges) {
      setFeedback({
        type: "info",
        message: "There are no profile changes to save.",
      });

      return;
    }

    setSaving(true);

    try {
      const userReference = doc(db, "users", currentUser.uid);

      await updateDoc(userReference, {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phone: cleanPhone,
        updatedAt: serverTimestamp(),
      });

      setFeedback({
        type: "success",
        message: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error("Resident profile update error:", error);

      setFeedback({
        type: "error",
        message: "Your profile could not be updated. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleResetChanges() {
    if (!residentProfile) {
      return;
    }

    setFirstName(String(residentProfile.firstName || ""));

    setLastName(String(residentProfile.lastName || ""));

    setPhone(String(residentProfile.phone || ""));

    setFeedback(null);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="resident-loading-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="resident-dashboard-page">
      <ResidentSidebar
        activePage="profile"
        residentProfile={residentProfile}
        onSignOut={handleSignOut}
      />

      <section className="resident-main">
        <ResidentTopbar
          title="My Profile"
          subtitle="Review your resident account and update your contact information."
          residentId={currentUser?.uid}
        />

        {pageError && (
          <div className="resident-profile-page-error" role="alert">
            <FaExclamationTriangle />
            <p>{pageError}</p>
          </div>
        )}

        <section className="resident-profile-hero">
          <div className="resident-profile-hero-content">
            <span>Resident Account</span>

            <h2>Manage your personal information</h2>

            <p>
              Keep your contact details accurate and review the residence and
              account information connected to your approved profile.
            </p>
          </div>

          <div className="resident-profile-hero-avatar">
            {getResidentInitials(residentProfile)}
          </div>
        </section>

        <section className="resident-profile-summary">
          <article>
            <div>
              <FaUser />
            </div>

            <section>
              <span>Resident name</span>

              <strong>{getResidentName(residentProfile)}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaBuilding />
            </div>

            <section>
              <span>Building</span>

              <strong>{residentProfile?.building || "Not recorded"}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaHome />
            </div>

            <section>
              <span>Apartment</span>

              <strong>{residentProfile?.apartment || "Not recorded"}</strong>
            </section>
          </article>

          <article>
            <div>
              <FaUserCheck />
            </div>

            <section>
              <span>Account status</span>

              <strong>{getStatusLabel(residentProfile?.status)}</strong>
            </section>
          </article>
        </section>

        <section className="resident-profile-grid">
          <article className="resident-profile-form-panel">
            <div className="resident-profile-section-heading">
              <div>
                <FaUser />

                <section>
                  <h2>Personal Information</h2>

                  <p>
                    Update the personal details used for resident communication.
                  </p>
                </section>
              </div>
            </div>

            <form
              className="resident-profile-form"
              onSubmit={handleProfileSubmit}
            >
              <div className="resident-profile-two-columns">
                <div className="resident-profile-field">
                  <label htmlFor="firstName">First name</label>

                  <div className="resident-profile-input">
                    <FaUser />

                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                </div>

                <div className="resident-profile-field">
                  <label htmlFor="lastName">Last name</label>

                  <div className="resident-profile-input">
                    <FaUser />

                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="resident-profile-field">
                <label htmlFor="phone">Phone number</label>

                <div className="resident-profile-input">
                  <FaPhone />

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="resident-profile-field">
                <label htmlFor="email">Email address</label>

                <div className="resident-profile-input readonly">
                  <FaEnvelope />

                  <input
                    id="email"
                    type="email"
                    value={residentProfile?.email || currentUser?.email || ""}
                    readOnly
                  />
                </div>

                <p className="resident-profile-field-note">
                  The account email cannot be changed from the resident profile.
                </p>
              </div>

              <div className="resident-profile-information">
                <FaInfoCircle />

                <p>
                  Building, apartment, account role and approval status are
                  managed by the Building Manager.
                </p>
              </div>

              {feedback && (
                <div
                  className={`resident-profile-feedback ${feedback.type}`}
                  role={feedback.type === "error" ? "alert" : "status"}
                >
                  {feedback.type === "success" && <FaCheckCircle />}

                  {feedback.type === "error" && <FaExclamationTriangle />}

                  {feedback.type === "info" && <FaInfoCircle />}

                  <p>{feedback.message}</p>
                </div>
              )}

              <div className="resident-profile-actions">
                <button
                  type="button"
                  className="resident-profile-reset"
                  disabled={saving || !profileHasChanges}
                  onClick={handleResetChanges}
                >
                  Cancel Changes
                </button>

                <button
                  type="submit"
                  className="resident-profile-save"
                  disabled={saving || !profileHasChanges}
                >
                  <FaSave />

                  <span>{saving ? "Saving changes..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          </article>

          <aside className="resident-profile-account-panel">
            <div className="resident-profile-section-heading">
              <div>
                <FaIdBadge />

                <section>
                  <h2>Account Details</h2>

                  <p>
                    Verified information connected to your resident account.
                  </p>
                </section>
              </div>
            </div>

            <div className="resident-profile-account-card">
              <div className="resident-profile-account-avatar">
                {getResidentInitials(residentProfile)}
              </div>

              <h3>{getResidentName(residentProfile)}</h3>

              <p>
                {residentProfile?.email ||
                  currentUser?.email ||
                  "Email not recorded"}
              </p>

              <span className="resident-profile-approved-badge">
                <FaCheckCircle />
                Approved Resident
              </span>
            </div>

            <div className="resident-profile-account-list">
              <div>
                <FaIdBadge />

                <section>
                  <span>Account role</span>

                  <strong>{getRoleLabel(residentProfile?.role)}</strong>
                </section>
              </div>

              <div>
                <FaShieldAlt />

                <section>
                  <span>Account status</span>

                  <strong>{getStatusLabel(residentProfile?.status)}</strong>
                </section>
              </div>

              <div>
                <FaBuilding />

                <section>
                  <span>Building</span>

                  <strong>{residentProfile?.building || "Not recorded"}</strong>
                </section>
              </div>

              <div>
                <FaHome />

                <section>
                  <span>Apartment</span>

                  <strong>
                    {residentProfile?.apartment || "Not recorded"}
                  </strong>
                </section>
              </div>

              <div>
                <FaUserCheck />

                <section>
                  <span>Approved on</span>

                  <strong>{formatDate(residentProfile?.approvedAt)}</strong>
                </section>
              </div>

              <div>
                <FaUser />

                <section>
                  <span>Registered on</span>

                  <strong>{formatDate(residentProfile?.createdAt)}</strong>
                </section>
              </div>
            </div>

            <div className="resident-profile-security-note">
              <FaShieldAlt />

              <section>
                <h3>Protected account details</h3>

                <p>
                  Contact the Building Manager when your email address, building
                  or apartment information needs to be corrected.
                </p>
              </section>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
