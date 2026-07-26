"use client";

import Image from "next/image";
import Link from "next/link";

import {
  FaHome,
  FaBullhorn,
  FaRegCalendarAlt,
  FaFolderOpen,
  FaCalendarCheck,
  FaClipboardList,
  FaRegUser,
  FaSignOutAlt,
} from "react-icons/fa";

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Resident";
}

export default function ResidentSidebar({
  activePage = "dashboard",
  residentProfile,
  onSignOut,
}) {
  const logoSrc = "/images/01-eli-logo-final.png";

  function getActiveClass(pageName) {
    return activePage === pageName ? "active" : "";
  }

  return (
    <aside className="resident-sidebar">
      <Link
        href="/resident"
        className="resident-logo"
        aria-label="Resident dashboard"
      >
        <Image
          src={logoSrc}
          alt="Eli Residential Community logo"
          width={250}
          height={82}
          priority
          className="resident-logo-img"
        />
      </Link>

      <nav className="resident-menu">
        <Link href="/resident" className={getActiveClass("dashboard")}>
          <FaHome />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/resident/announcements"
          className={getActiveClass("announcements")}
        >
          <FaBullhorn />
          <span>Announcements</span>
        </Link>

        <Link href="/resident/events" className={getActiveClass("events")}>
          <FaRegCalendarAlt />
          <span>Events</span>
        </Link>

        <Link
          href="/resident/resources"
          className={getActiveClass("resources")}
        >
          <FaFolderOpen />
          <span>Resources</span>
        </Link>

        <Link href="/resident/bookings" className={getActiveClass("bookings")}>
          <FaCalendarCheck />
          <span>My Bookings</span>
        </Link>

        <Link href="/resident/issues" className={getActiveClass("issues")}>
          <FaClipboardList />
          <span>Issue Reports</span>
        </Link>

        <Link href="/resident/profile" className={getActiveClass("profile")}>
          <FaRegUser />
          <span>Profile</span>
        </Link>
      </nav>

      <div className="resident-community-card">
        <div className="resident-community-image">
          <Image
            src="/images/03-community-hall.png"
            alt="Community hall"
            fill
            sizes="220px"
            className="resident-community-img"
          />
        </div>

        <h3>Eli Residential Community</h3>
        <p>Resident community area</p>
      </div>

      <div className="resident-profile-card">
        <div className="resident-profile-icon">
          <FaRegUser />
        </div>

        <div>
          <h3>{getFullName(residentProfile)}</h3>
          <p>
            {residentProfile?.building || "Community"}
            {residentProfile?.apartment
              ? ` · Apartment ${residentProfile.apartment}`
              : ""}
          </p>
        </div>
      </div>

      <button type="button" className="resident-sign-out" onClick={onSignOut}>
        <FaSignOutAlt />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
