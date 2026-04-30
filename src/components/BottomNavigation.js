import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/BottomNavigation.css";

import dashboardIcon from "../assets/Dashboard_Icon.png";
import appointmentIcon from "../assets/Appointment_Icon.png";
import petsIcon from "../assets/Pets_Icon.png";
import messageIcon from "../assets/Message_Icon.png";
import medicalIcon from "../assets/Medical_Icon.png";
import inventoryIcon from "../assets/Inventory_Icon.png";
import userManagementIcon from "../assets/UserManagement_Icon.png";
import profileIcon from "../assets/Profile.png";
import payHistoryIcon from "../assets/payment_icon.png";

const NAV_BY_ROLE = {
  admin: [
    { key: "home", label: "Home", path: "/admin", icon: dashboardIcon },
    {
      key: "users",
      label: "Users",
      path: "/admin-users",
      icon: userManagementIcon,
    },
    {
      key: "messages",
      label: "Messages",
      path: "/admin-messages",
      icon: messageIcon,
    },
    {
      key: "account",
      label: "Account",
      path: "/admin-profile",
      icon: profileIcon,
    },
  ],
  staff: [
    { key: "home", label: "Home", path: "/staff", icon: dashboardIcon },
    {
      key: "appointments",
      label: "Schedule",
      path: "/staff-appointments",
      icon: appointmentIcon,
    },
    {
      key: "inventory",
      label: "Inventory",
      path: "/staff-inventory",
      icon: inventoryIcon,
    },
    {
      key: "users",
      label: "Users",
      path: "/staff-users",
      icon: userManagementIcon,
    },
    {
      key: "account",
      label: "Payments",
      path: "/staff-payments",
      icon: payHistoryIcon,
    },
  ],
  veterinarian: [
    { key: "home", label: "Home", path: "/vet", icon: dashboardIcon },
    {
      key: "patients",
      label: "Patients",
      path: "/vet-patients",
      icon: petsIcon,
    },
    {
      key: "calendar",
      label: "Calendar",
      path: "/vet-calendar",
      icon: appointmentIcon,
    },
    {
      key: "records",
      label: "Records",
      path: "/vet-medical-records",
      icon: medicalIcon,
    },
    {
      key: "account",
      label: "Account",
      path: "/vet-profile",
      icon: profileIcon,
    },
    // {
    //   key: "schedule",
    //   label: "Schedule",
    //   path: "/vet-schedule",
    //   icon: appointmentIcon,
    // },
  ],
  pet_owner: [
    {
      key: "home",
      label: "Home",
      path: "/pet-owner",
      icon: dashboardIcon,
    },
    {
      key: "appointments",
      label: "Schedule",
      path: "/pet-owner-appointments",
      icon: appointmentIcon,
    },
    {
      key: "pets",
      label: "Pets",
      path: "/pet-owner-pets",
      icon: petsIcon,
    },
    {
      key: "messages",
      label: "Messages",
      path: "/pet-owner-messages",
      icon: messageIcon,
    },
    {
      key: "account",
      label: "Payments",
      path: "/pet-owner-payments",
      icon: payHistoryIcon,
    },
  ],
};

function getCurrentRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.role || null;
  } catch {
    return null;
  }
}

function isDashboardPath(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/vet") ||
    pathname.startsWith("/pet-owner")
  );
}

function isActivePath(pathname, itemPath) {
  if (pathname === itemPath) return true;
  if (
    itemPath === "/admin" ||
    itemPath === "/staff" ||
    itemPath === "/vet" ||
    itemPath === "/pet-owner"
  ) {
    return false;
  }
  return (
    pathname.startsWith(`${itemPath}-`) || pathname.startsWith(`${itemPath}/`)
  );
}

export default function BottomNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const role = getCurrentRole();
  const tabs = useMemo(() => NAV_BY_ROLE[role] || [], [role]);

  if (!isDashboardPath(pathname) || tabs.length === 0) {
    return null;
  }

  return (
    <nav className="mobile-footer-nav" aria-label="Mobile footer navigation">
      {tabs.map((item) => {
        const active = isActivePath(pathname, item.path);
        return (
          <button
            key={item.key}
            type="button"
            className={`mobile-footer-tab${active ? " active" : ""}`}
            onClick={() => navigate(item.path)}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
          >
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
