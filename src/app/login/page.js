"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import "../auth.css";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

import {
  FaEnvelope,
  FaLock,
  FaRegUser,
  FaArrowLeft,
  FaShieldAlt,
  FaUsers,
  FaRegCommentDots,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

function getLoginErrorMessage(error) {
  const errorCode = String(error?.code || "");

  if (
    errorCode === "auth/invalid-credential" ||
    errorCode === "auth/wrong-password" ||
    errorCode === "auth/user-not-found"
  ) {
    return "Invalid email address or password.";
  }

  if (errorCode === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (errorCode === "auth/user-disabled") {
    return "This account has been disabled.";
  }

  if (errorCode === "auth/too-many-requests") {
    return "Too many sign-in attempts were made. Please wait and try again.";
  }

  if (errorCode === "auth/network-request-failed") {
    return "The sign-in service could not be reached. Please check your connection.";
  }

  return "Sign in could not be completed. Please try again.";
}

export default function LoginPage() {
  const logoSrc = "/images/01-eli-logo-final.png";
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await signOut(auth);

        setError(
          "Your sign-in account exists, but the resident profile was not found.",
        );

        return;
      }

      const userData = userSnap.data();

      if (userData.isActive !== true) {
        await signOut(auth);
        setError("This account is not active.");
        return;
      }

      if (userData.status === "pending") {
        await signOut(auth);

        setError("Your registration is awaiting Building Manager approval.");

        return;
      }

      if (userData.status === "rejected") {
        await signOut(auth);
        setError("Your registration has not been approved.");
        return;
      }

      if (
        userData.role === "building-manager" &&
        userData.status === "approved"
      ) {
        router.push("/building-manager");
        return;
      }

      if (userData.role === "resident" && userData.status === "approved") {
        router.push("/resident");
        return;
      }

      await signOut(auth);
      setError("This account does not have a valid role.");
    } catch (loginError) {
      console.error("Login failed:", loginError);
      setError(getLoginErrorMessage(loginError));
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

          <Link href="/login" className="active">
            Sign In
          </Link>

          <Link href="/register">Register</Link>
        </nav>

        <div className="auth-header-action">
          <Link href="/" className="auth-back-link">
            <FaArrowLeft />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <section className="auth-layout">
        <div className="auth-form-panel">
          <p className="auth-label">Resident Access</p>

          <h1>Sign in to your community account</h1>

          <p className="auth-intro">
            Access announcements, shared resources, events and issue reporting
            for Eli Residential Community.
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
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
              <label htmlFor="password">Password</label>

              <div className="auth-input-wrap auth-password-wrap">
                <FaLock />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() =>
                    setShowPassword((currentValue) => !currentValue)
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="auth-checkbox">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>

              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {error && (
              <div className="auth-feedback auth-feedback-error" role="alert">
                <FaShieldAlt />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              <FaRegUser />

              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <p className="auth-switch-text">
            Do not have an account?{" "}
            <Link href="/register">Create an account</Link>
          </p>
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
            <h2>Stay connected with your community</h2>

            <div className="auth-benefit-list">
              <div className="auth-benefit-item">
                <FaRegCommentDots />

                <div>
                  <h3>Clear Communication</h3>
                  <p>Read important updates and community announcements.</p>
                </div>
              </div>

              <div className="auth-benefit-item">
                <FaShieldAlt />

                <div>
                  <h3>Issue Reporting</h3>
                  <p>Report problems and follow community updates.</p>
                </div>
              </div>

              <div className="auth-benefit-item">
                <FaUsers />

                <div>
                  <h3>Community Access</h3>
                  <p>View events, resources and useful resident information.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
