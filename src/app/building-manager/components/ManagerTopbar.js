"use client";

import { FaRegUser } from "react-icons/fa";
import ManagerNotifications from "./ManagerNotifications";

export default function ManagerTopbar({ title, subtitle }) {
  return (
    <header className="manager-topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="manager-top-icons">
        <ManagerNotifications />

        <button type="button" aria-label="Profile">
          <FaRegUser />
        </button>
      </div>
    </header>
  );
}
