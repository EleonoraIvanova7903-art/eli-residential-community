"use client";

import Image from "next/image";
import Link from "next/link";

import {
  FaRegUser,
  FaUsers,
  FaUserCheck,
  FaClipboardList,
  FaBullhorn,
  FaRegCalendarAlt,
  FaFolderOpen,
  FaCalendarCheck,
  FaPlus,
  FaSignOutAlt,
  FaHome,
  FaChartLine,
} from "react-icons/fa";

function getFullName(user) {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Building Manager";
}

export default function ManagerSidebar({
  activePage = "dashboard",
  managerProfile,
  onSignOut,
}) {
  const logoSrc = "/images/01-eli-logo-final.png";

  function getActiveClass(pageName) {
    return activePage === pageName ? "active" : "";
  }

  return (
    <aside className="manager-sidebar">
      <Link
        href="/building-manager"
        className="manager-logo"
        aria-label="Building Manager dashboard"
      >
        <Image
          src={logoSrc}
          alt="Eli Residential Community logo"
          width={250}
          height={82}
          priority
          className="manager-logo-img"
        />
      </Link>

      <nav className="manager-menu">
        <Link href="/building-manager" className={getActiveClass("dashboard")}>
          <FaHome />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/building-manager/registrations"
          className={getActiveClass("registrations")}
        >
          <FaUserCheck />
          <span>Registrations</span>
        </Link>

        <Link
          href="/building-manager/residents"
          className={getActiveClass("residents")}
        >
          <FaUsers />
          <span>Residents</span>
        </Link>

        <Link
          href="/building-manager/announcements"
          className={getActiveClass("announcements")}
        >
          <FaBullhorn />
          <span>Announcements</span>
        </Link>

        <Link
          href="/building-manager/events"
          className={getActiveClass("events")}
        >
          <FaRegCalendarAlt />
          <span>Events</span>
        </Link>

        <Link
          href="/building-manager/resources"
          className={getActiveClass("resources")}
        >
          <FaFolderOpen />
          <span>Resources</span>
        </Link>

        <Link
          href="/building-manager/bookings"
          className={getActiveClass("bookings")}
        >
          <FaCalendarCheck />
          <span>Bookings</span>
        </Link>

        <Link
          href="/building-manager/issues"
          className={getActiveClass("issues")}
        >
          <FaClipboardList />
          <span>Issue Reports</span>
        </Link>

        <Link
          href="/building-manager/data-analysis"
          className={getActiveClass("data-analysis")}
        >
          <FaChartLine />
          <span>Data Analysis</span>
        </Link>

        <Link
          href="/building-manager/quick-actions"
          className={getActiveClass("quick-actions")}
        >
          <FaPlus />
          <span>Quick Actions</span>
        </Link>
      </nav>

      <div className="manager-community-card">
        <div className="manager-community-image">
          <Image
            src="/images/03-community-hall.png"
            alt="Community hall"
            fill
            sizes="220px"
            className="manager-community-img"
          />
        </div>

        <h3>Eli Residential Community</h3>
        <p>Community management area</p>
      </div>

      <div className="manager-profile-card">
        <div className="manager-profile-icon">
          <FaRegUser />
        </div>

        <div>
          <h3>{getFullName(managerProfile)}</h3>
          <p>Building Manager</p>
        </div>
      </div>

      <button type="button" className="manager-sign-out" onClick={onSignOut}>
        <FaSignOutAlt />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
