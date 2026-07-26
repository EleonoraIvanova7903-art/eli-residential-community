import Image from "next/image";
import Link from "next/link";
import "./home.css";

import {
  FaRegUser,
  FaUserPlus,
  FaUsers,
  FaRegCalendarAlt,
  FaClipboardList,
  FaBullhorn,
  FaPlayCircle,
  FaShieldAlt,
  FaLeaf,
  FaRegCommentDots,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaClock,
} from "react-icons/fa";

export default function HomePage() {
  const logoSrc = "/images/01-eli-logo-final.png";

  return (
    <main className="home-page">
      <header className="home-header">
        <Link
          href="/"
          className="home-logo"
          aria-label="Eli Residential Community home"
        >
          <Image
            src={logoSrc}
            alt="Eli Residential Community logo"
            width={310}
            height={102}
            priority
            className="home-logo-img"
          />
        </Link>

        <nav className="home-nav">
          <Link href="/" className="active">
            Home
          </Link>
          <Link href="#resources">Resources</Link>
          <Link href="#events">Events</Link>
          <Link href="#contact">Contact</Link>
        </nav>

        <div className="home-auth">
          <Link href="/login" className="home-auth-btn home-signin">
            <FaRegUser />
            <span>Sign In</span>
          </Link>

          <Link href="/register" className="home-auth-btn home-register">
            <FaUserPlus />
            <span>Register</span>
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-welcome">Welcome to Eli</p>

          <h1>
            Your community.
            <br />
            Connected. Organized.
            <br />
            Better together.
          </h1>

          <p className="home-hero-text">
            Eli brings neighbors together in one place. Stay informed with
            announcements, discover events, report issues, and access shared
            resources that make everyday living easier.
          </p>

          <div className="home-hero-actions">
            <Link href="/register" className="home-primary-btn">
              <FaUsers />
              <span>Join Eli Community</span>
            </Link>

            <Link href="/about" className="home-secondary-btn">
              <FaPlayCircle />
              <span>Learn More</span>
            </Link>
          </div>
        </div>

        <div className="home-hero-visual">
          <Image
            src="/images/02-hero-residential-community.png"
            alt="Modern residential community with green shared spaces"
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 55vw"
            className="home-hero-img"
          />
        </div>
      </section>

      <section id="resources" className="home-feature-section">
        <article className="home-feature-card">
          <div className="home-feature-icon">
            <FaUsers />
          </div>

          <div className="home-feature-content">
            <h2>Shared Resources</h2>
            <p>
              Access documents, guides and useful information shared by your
              community.
            </p>
            <Link href="#resources">Browse Resources →</Link>
          </div>
        </article>

        <article id="events" className="home-feature-card">
          <div className="home-feature-icon">
            <FaRegCalendarAlt />
          </div>

          <div className="home-feature-content">
            <h2>Events</h2>
            <p>
              Find upcoming events and activities happening in your community.
            </p>
            <Link href="#events">View Events →</Link>
          </div>
        </article>

        <article className="home-feature-card">
          <div className="home-feature-icon">
            <FaClipboardList />
          </div>

          <div className="home-feature-content">
            <h2>Issue Reporting</h2>
            <p>
              Report problems and track updates to help keep our community safe
              and tidy.
            </p>
            <Link href="/login">Report an Issue →</Link>
          </div>
        </article>

        <article className="home-feature-card">
          <div className="home-feature-icon">
            <FaBullhorn />
          </div>

          <div className="home-feature-content">
            <h2>Announcements</h2>
            <p>
              Stay up to date with the latest news and important community
              updates.
            </p>
            <Link href="/login">View Announcements →</Link>
          </div>
        </article>
      </section>

      <section className="home-benefits">
        <div className="home-benefits-intro">
          <h2>Benefits of Eli</h2>
          <p>
            Tools and features designed to strengthen our community and improve
            everyday living.
          </p>
        </div>

        <div className="home-benefit-item">
          <div className="home-benefit-icon">
            <FaUsers />
          </div>
          <div>
            <h3>Stronger Connections</h3>
            <p>Build relationships and create a supportive neighborhood.</p>
          </div>
        </div>

        <div className="home-benefit-item">
          <div className="home-benefit-icon">
            <FaShieldAlt />
          </div>
          <div>
            <h3>Safer Community</h3>
            <p>Report issues and get updates to keep our community secure.</p>
          </div>
        </div>

        <div className="home-benefit-item">
          <div className="home-benefit-icon">
            <FaLeaf />
          </div>
          <div>
            <h3>Sustainable Living</h3>
            <p>Share resources and promote a cleaner, greener environment.</p>
          </div>
        </div>

        <div className="home-benefit-item">
          <div className="home-benefit-icon">
            <FaRegCommentDots />
          </div>
          <div>
            <h3>Better Communication</h3>
            <p>Get timely information and never miss what matters.</p>
          </div>
        </div>
      </section>

      <footer id="contact" className="home-footer">
        <div className="home-footer-brand">
          <Link
            href="/"
            className="home-footer-logo"
            aria-label="Eli Residential Community home"
          >
            <Image
              src={logoSrc}
              alt="Eli Residential Community logo"
              width={250}
              height={82}
              className="home-footer-logo-img"
            />
          </Link>

          <p>
            A connected community where residents can stay informed, take part
            in events, report issues, and use shared resources more easily.
          </p>
        </div>

        <div className="home-footer-contact">
          <h3>Community Office</h3>

          <p className="home-contact-line">
            <FaMapMarkerAlt />
            <span>Eli Residential Community Office</span>
          </p>

          <p className="home-contact-indent">12 Greenway Gardens, Eli</p>
          <p className="home-contact-indent">Cambridgeshire, CB7 4AH</p>

          <p className="home-contact-line">
            <FaPhoneAlt />
            <span>01353 123 456</span>
          </p>

          <p className="home-contact-line">
            <FaClock />
            <span>Mon - Fri: 9:00am - 5:00pm</span>
          </p>
        </div>

        <div className="home-copyright">
          © 2026 Eli Residential Community. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
