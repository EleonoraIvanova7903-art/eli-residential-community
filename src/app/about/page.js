import Image from "next/image";
import Link from "next/link";
import "./about.css";

import {
  FaRegUser,
  FaUserPlus,
  FaUsers,
  FaRegCalendarAlt,
  FaClipboardList,
  FaBullhorn,
  FaShieldAlt,
  FaLeaf,
  FaRegCommentDots,
  FaCheckCircle,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaClock,
} from "react-icons/fa";

export default function AboutPage() {
  const logoSrc = "/images/01-eli-logo-final.png";

  return (
    <main className="about-page">
      <header className="about-header">
        <Link
          href="/"
          className="about-logo"
          aria-label="Eli Residential Community home"
        >
          <Image
            src={logoSrc}
            alt="Eli Residential Community logo"
            width={310}
            height={102}
            priority
            className="about-logo-img"
          />
        </Link>

        <nav className="about-nav">
          <Link href="/">Home</Link>
          <Link href="/about" className="active">
            About
          </Link>
          <Link href="/#resources">Resources</Link>
          <Link href="/#events">Events</Link>
          <Link href="/#contact">Contact</Link>
        </nav>

        <div className="about-auth">
          <Link href="/login" className="about-auth-btn about-signin">
            <FaRegUser />
            <span>Sign In</span>
          </Link>

          <Link href="/register" className="about-auth-btn about-register">
            <FaUserPlus />
            <span>Register</span>
          </Link>
        </div>
      </header>

      <section className="about-hero">
        <div className="about-hero-content">
          <p className="about-label">About Eli Residential Community</p>

          <h1>A simple way to keep your residential community organized.</h1>

          <p className="about-hero-text">
            Eli Residential Community is a web application designed to help
            residents, building managers and administrators communicate better,
            share information, report issues, manage events and access shared
            community resources in one place.
          </p>

          <div className="about-hero-actions">
            <Link href="/" className="about-secondary-btn">
              <FaArrowLeft />
              <span>Back to Home</span>
            </Link>

            <Link href="/register" className="about-primary-btn">
              <FaUsers />
              <span>Join the Community</span>
            </Link>
          </div>
        </div>

        <div className="about-hero-visual">
          <Image
            src="/images/02-hero-residential-community.png"
            alt="Residential community with shared green spaces"
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 48vw"
            className="about-hero-img"
          />
        </div>
      </section>

      <section className="about-intro-section">
        <div className="about-intro-text">
          <p className="about-section-label">What is the platform?</p>

          <h2>One platform for everyday community living</h2>

          <p>
            Eli Residential Community is not a full property management or
            finance system. Its main purpose is to support communication and
            organization inside a residential community.
          </p>

          <p>
            The platform helps residents stay informed, participate in community
            life and report problems more easily. Instead of using separate
            messages, paper notices or informal chats, it brings the most useful
            community tools into one clear digital place.
          </p>
        </div>

        <div className="about-highlight-card">
          <h3>Main purpose</h3>

          <ul>
            <li>
              <FaCheckCircle />
              Improve communication between residents and management
            </li>
            <li>
              <FaCheckCircle />
              Make issue reporting easier and more organized
            </li>
            <li>
              <FaCheckCircle />
              Support events, announcements and shared resources
            </li>
            <li>
              <FaCheckCircle />
              Create a stronger and more connected community
            </li>
          </ul>
        </div>
      </section>

      <section className="about-features-section">
        <div className="about-section-heading">
          <p className="about-section-label">Application Features</p>
          <h2>What users can do with the platform</h2>
          <p>
            The application focuses on practical features that support everyday
            residential community life.
          </p>
        </div>

        <div className="about-feature-grid">
          <article className="about-feature-card">
            <div className="about-feature-icon">
              <FaUsers />
            </div>

            <h3>Shared Resources</h3>
            <p>
              Residents can access useful community information, shared
              documents, guides and available resources.
            </p>
          </article>

          <article className="about-feature-card">
            <div className="about-feature-icon">
              <FaRegCalendarAlt />
            </div>

            <h3>Community Events</h3>
            <p>
              Users can view upcoming events, activities and important dates
              related to the residential community.
            </p>
          </article>

          <article className="about-feature-card">
            <div className="about-feature-icon">
              <FaClipboardList />
            </div>

            <h3>Issue Reporting</h3>
            <p>
              Residents can report problems such as maintenance issues, damaged
              shared areas or safety concerns.
            </p>
          </article>

          <article className="about-feature-card">
            <div className="about-feature-icon">
              <FaBullhorn />
            </div>

            <h3>Announcements</h3>
            <p>
              Building managers can share important notices, updates and
              community information in one central place.
            </p>
          </article>
        </div>
      </section>

      <section className="about-users-section">
        <div className="about-section-heading">
          <p className="about-section-label">User Roles</p>
          <h2>Who the application is for</h2>
        </div>

        <div className="about-role-grid">
          <article className="about-role-card">
            <h3>Residents</h3>
            <p>
              Residents can read announcements, view events, access resources
              and report issues in their community.
            </p>
          </article>

          <article className="about-role-card">
            <h3>Building Managers</h3>
            <p>
              Building managers can manage community updates, review issue
              reports and support better communication with residents.
            </p>
          </article>

          <article className="about-role-card">
            <h3>Administrators</h3>
            <p>
              Administrators can manage users, maintain system content and keep
              the platform organized.
            </p>
          </article>
        </div>
      </section>

      <section className="about-benefits-section">
        <div className="about-benefits-intro">
          <p className="about-section-label">Why it is useful</p>
          <h2>Designed to make community living easier</h2>
        </div>

        <div className="about-benefits-grid">
          <div className="about-benefit-item">
            <FaRegCommentDots />
            <div>
              <h3>Better Communication</h3>
              <p>Important information is easier to find and share.</p>
            </div>
          </div>

          <div className="about-benefit-item">
            <FaShieldAlt />
            <div>
              <h3>Safer Community</h3>
              <p>Issues can be reported and followed more clearly.</p>
            </div>
          </div>

          <div className="about-benefit-item">
            <FaLeaf />
            <div>
              <h3>Sustainable Living</h3>
              <p>Shared resources encourage practical and responsible use.</p>
            </div>
          </div>

          <div className="about-benefit-item">
            <FaUsers />
            <div>
              <h3>Stronger Community</h3>
              <p>Residents can take part in events and community activities.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta-section">
        <h2>Ready to be part of Eli Residential Community?</h2>

        <p>
          Create an account to access community features, stay informed and take
          part in a more connected residential environment.
        </p>

        <Link href="/register" className="about-primary-btn">
          <FaUserPlus />
          <span>Create Account</span>
        </Link>
      </section>

      <footer id="contact" className="about-footer">
        <div className="about-footer-brand">
          <Link
            href="/"
            className="about-footer-logo"
            aria-label="Eli Residential Community home"
          >
            <Image
              src={logoSrc}
              alt="Eli Residential Community logo"
              width={250}
              height={82}
              className="about-footer-logo-img"
            />
          </Link>

          <p>
            A connected community where residents can stay informed, take part
            in events, report issues, and use shared resources more easily.
          </p>
        </div>

        <div className="about-footer-contact">
          <h3>Community Office</h3>

          <p className="about-contact-line">
            <FaMapMarkerAlt />
            <span>Eli Residential Community Office</span>
          </p>

          <p className="about-contact-indent">12 Greenway Gardens, Ely</p>
          <p className="about-contact-indent">Cambridgeshire, CB7 4AH</p>

          <p className="about-contact-line">
            <FaPhoneAlt />
            <span>01353 123 456</span>
          </p>

          <p className="about-contact-line">
            <FaClock />
            <span>Mon - Fri: 9:00am - 5:00pm</span>
          </p>
        </div>

        <div className="about-copyright">
          © 2026 Eli Residential Community. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
