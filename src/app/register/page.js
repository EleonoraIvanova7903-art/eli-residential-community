"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import "../auth.css";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../../lib/firebase";

import {
  FaEnvelope,
  FaLock,
  FaUserPlus,
  FaArrowLeft,
  FaPhoneAlt,
  FaHome,
  FaBuilding,
  FaUsers,
  FaShieldAlt,
  FaRegCommentDots,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";

function getRegistrationErrorMessage(error) {
  const errorCode = String(error?.code || "");

  if (errorCode === "auth/email-already-in-use") {
    return "An account already exists with this email address.";
  }

  if (errorCode === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (errorCode === "auth/weak-password") {
    return "The password is too weak. Use at least 6 characters.";
  }

  if (errorCode === "auth/operation-not-allowed") {
    return "Email and password registration is currently unavailable.";
  }

  if (errorCode === "auth/network-request-failed") {
    return "The registration service could not be reached. Please check your connection and try again.";
  }

  if (errorCode === "auth/too-many-requests") {
    return "Too many registration attempts were made. Please wait and try again.";
  }

  if (
    errorCode === "permission-denied" ||
    errorCode === "firestore/permission-denied"
  ) {
    return "The resident profile could not be saved because database access was denied.";
  }

  if (errorCode === "unavailable" || errorCode === "firestore/unavailable") {
    return "The database is temporarily unavailable. Please try again.";
  }

  return "Registration could not be completed. Please check the details and try again.";
}

export default function RegisterPage() {
  const logoSrc = "/images/01-eli-logo-final.png";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;

    setError("");
    setLoading(true);

    const formData = new FormData(form);

    const firstName = String(formData.get("firstName") || "").trim();

    const lastName = String(formData.get("lastName") || "").trim();

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const phone = String(formData.get("phone") || "").trim();

    const building = String(formData.get("building") || "").trim();

    const apartment = String(formData.get("apartment") || "").trim();

    const password = String(formData.get("password") || "");

    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      setLoading(false);
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    if (!building || !apartment) {
      setError("Please enter your building and apartment number.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("The password must contain at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    let createdUser = null;
    let profileCreationFailed = false;
    let rollbackFailed = false;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      createdUser = userCredential.user;

      try {
        await setDoc(doc(db, "users", createdUser.uid), {
          uid: createdUser.uid,
          firstName,
          lastName,
          email,
          phone,
          building,
          apartment,
          role: "resident",
          status: "pending",
          isActive: true,
          createdAt: serverTimestamp(),
          approvedAt: null,
          approvedBy: null,
          rejectedAt: null,
          rejectedBy: null,
        });
      } catch (profileError) {
        profileCreationFailed = true;

        console.error("Resident profile creation failed:", profileError);

        try {
          await deleteUser(createdUser);
        } catch (rollbackError) {
          rollbackFailed = true;

          console.error(
            "Incomplete Authentication account could not be removed:",
            rollbackError,
          );

          try {
            await signOut(auth);
          } catch (signOutError) {
            console.error(
              "Sign out after registration failure failed:",
              signOutError,
            );
          }
        }

        throw profileError;
      }

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          "Sign out after successful registration failed:",
          signOutError,
        );
      }

      form.reset();

      setShowPassword(false);
      setShowConfirmPassword(false);
      setSubmittedEmail(email);
      setRegistrationSubmitted(true);
    } catch (registrationError) {
      console.error("Resident registration failed:", registrationError);

      if (profileCreationFailed && rollbackFailed) {
        setError(
          "The sign-in account was created, but the resident profile could not be saved. Please contact the Building Manager before trying again.",
        );
      } else if (profileCreationFailed) {
        setError(
          "The resident profile could not be saved. The incomplete account was removed, so you can try again safely.",
        );
      } else {
        setError(getRegistrationErrorMessage(registrationError));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link
          href="/"
          className="auth-logo"
          aria-label="Eli Residential Community home"
        >
          <Image
            src={logoSrc}
            alt="Eli Residential Community logo"
            width={310}
            height={102}
            priority
            className="auth-logo-img"
          />
        </Link>

        <nav className="auth-nav">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/login">Sign In</Link>

          <Link href="/register" className="active">
            Register
          </Link>
        </nav>

        <div className="auth-header-action">
          <Link href="/" className="auth-back-link">
            <FaArrowLeft />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <section className="auth-layout auth-register-layout">
        <div className="auth-form-panel">
          {registrationSubmitted ? (
            <section className="auth-pending-state" aria-live="polite">
              <div className="auth-pending-icon">
                <FaClock />
              </div>

              <p className="auth-label">Registration Submitted</p>

              <h1>Account awaiting approval</h1>

              <p className="auth-pending-intro">
                Your resident account has been created successfully and sent to
                the Building Manager for review.
              </p>

              <div className="auth-pending-email">
                <FaEnvelope />

                <div>
                  <span>Registered email</span>
                  <strong>{submittedEmail}</strong>
                </div>
              </div>

              <div className="auth-approval-steps">
                <div className="auth-approval-step completed">
                  <div className="auth-approval-step-icon">
                    <FaCheckCircle />
                  </div>

                  <div>
                    <h3>Registration received</h3>
                    <p>
                      Your account and resident details were submitted
                      successfully.
                    </p>
                  </div>
                </div>

                <div className="auth-approval-step current">
                  <div className="auth-approval-step-icon">
                    <FaClock />
                  </div>

                  <div>
                    <h3>Waiting for approval</h3>
                    <p>
                      The Building Manager must approve your resident access.
                    </p>
                  </div>
                </div>

                <div className="auth-approval-step">
                  <div className="auth-approval-step-number">3</div>

                  <div>
                    <h3>Resident access</h3>
                    <p>
                      After approval, sign in to open your Resident Dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <p className="auth-pending-note">
                You will not be able to access the Resident area until the
                Building Manager approves your account.
              </p>

              <Link href="/login" className="auth-submit-btn auth-submit-link">
                <FaUserPlus />
                <span>Go to Sign In</span>
              </Link>

              <Link href="/" className="auth-secondary-link">
                Return to Home
              </Link>
            </section>
          ) : (
            <>
              <p className="auth-label">Create Account</p>

              <h1>Join Eli Residential Community</h1>

              <p className="auth-intro">
                Create a resident account to access community updates, shared
                resources, events and issue reporting.
              </p>

              <form className="auth-form" onSubmit={handleRegister}>
                <div className="auth-two-columns">
                  <div className="auth-field">
                    <label htmlFor="firstName">First name</label>

                    <div className="auth-input-wrap">
                      <FaUsers />

                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="First name"
                        autoComplete="given-name"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="lastName">Last name</label>

                    <div className="auth-input-wrap">
                      <FaUsers />

                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Last name"
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="email">Email address</label>

                  <div className="auth-input-wrap">
                    <FaEnvelope />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="phone">Phone number</label>

                  <div className="auth-input-wrap">
                    <FaPhoneAlt />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="auth-two-columns">
                  <div className="auth-field">
                    <label htmlFor="building">Building / Block</label>

                    <div className="auth-input-wrap">
                      <FaBuilding />

                      <input
                        id="building"
                        name="building"
                        type="text"
                        placeholder="Building name"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="apartment">Apartment number</label>

                    <div className="auth-input-wrap">
                      <FaHome />

                      <input
                        id="apartment"
                        name="apartment"
                        type="text"
                        placeholder="Apartment"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-two-columns">
                  <div className="auth-field">
                    <label htmlFor="password">Password</label>

                    <div className="auth-input-wrap auth-password-wrap">
                      <FaLock />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />

                      <button
                        type="button"
                        className="auth-password-toggle"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        onClick={() =>
                          setShowPassword((currentValue) => !currentValue)
                        }
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="confirmPassword">Confirm password</label>

                    <div className="auth-input-wrap auth-password-wrap">
                      <FaLock />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />

                      <button
                        type="button"
                        className="auth-password-toggle"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        aria-pressed={showConfirmPassword}
                        onClick={() =>
                          setShowConfirmPassword(
                            (currentValue) => !currentValue,
                          )
                        }
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="auth-password-help">Use at least 6 characters.</p>

                <label className="auth-checkbox auth-terms">
                  <input type="checkbox" name="terms" required />

                  <span>
                    I confirm that my details are correct and I agree to use the
                    platform responsibly.
                  </span>
                </label>

                {error && (
                  <div
                    className="auth-feedback auth-feedback-error"
                    role="alert"
                  >
                    <FaShieldAlt />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  <FaUserPlus />

                  <span>
                    {loading ? "Creating account..." : "Create Account"}
                  </span>
                </button>
              </form>

              <p className="auth-switch-text">
                Already have an account? <Link href="/login">Sign in here</Link>
              </p>
            </>
          )}
        </div>

        <div className="auth-info-panel">
          <div className="auth-image-card">
            <Image
              src="/images/02-hero-residential-community.png"
              alt="Residential community shared green space"
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 46vw"
              className="auth-image"
            />
          </div>

          <div className="auth-benefit-card">
            <h2>Why create an account?</h2>

            <div className="auth-benefit-list">
              <div className="auth-benefit-item">
                <FaRegCommentDots />

                <div>
                  <h3>Community Updates</h3>
                  <p>Stay informed about important community information.</p>
                </div>
              </div>

              <div className="auth-benefit-item">
                <FaShieldAlt />

                <div>
                  <h3>Resident Support</h3>
                  <p>Report issues and help keep shared areas safe.</p>
                </div>
              </div>

              <div className="auth-benefit-item">
                <FaUsers />

                <div>
                  <h3>Shared Living</h3>
                  <p>
                    Take part in events, resources and community activities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
