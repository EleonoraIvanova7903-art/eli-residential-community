"use client";

import Link from "next/link";
import { FaRegUser } from "react-icons/fa";
import ResidentNotifications from "./ResidentNotifications";

export default function ResidentTopbar({ title, subtitle, residentId }) {
  return (
    <header className="resident-topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="resident-top-icons">
        <ResidentNotifications residentId={residentId} />

        <Link
          href="/resident/profile"
          className="resident-profile-button"
          aria-label="Open resident profile"
        >
          <FaRegUser />
        </Link>
      </div>
    </header>
  );
}
