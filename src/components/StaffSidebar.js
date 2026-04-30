import { useNavigate, useLocation } from "react-router-dom";
import pawLogo from "../assets/paw.png";
import dashboardIcon from "../assets/Dashboard_Icon.png";
import appointmentIcon from "../assets/Appointment_Icon.png";
import userManagementIcon from "../assets/UserManagement_Icon.png";
import petsProfileIcon from "../assets/Pets_Icon.png";
import messageIcon from "../assets/Message_Icon.png";
import inventoryIcon from "../assets/Inventory_Icon.png";
import payHistoryIcon from "../assets/payment_icon.png";
import activityLogIcon from "../assets/Medical_Icon.png";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/staff", icon: dashboardIcon },
  { label: "Appointment", path: "/staff-appointments", icon: appointmentIcon },
  { label: "User Management", path: "/staff-users", icon: userManagementIcon },
  { label: "Pets Profile", path: "/staff-pets", icon: petsProfileIcon },
  { label: "Messages", path: "/staff-messages", icon: messageIcon },
  {
    label: "Vet Schedules",
    path: "/staff-vet-schedules",
    icon: appointmentIcon,
  },
  { label: "Inventory", path: "/staff-inventory", icon: inventoryIcon },
  { label: "Payment History", path: "/staff-payments", icon: payHistoryIcon },
  { label: "Activity Log", path: "/staff-activity", icon: activityLogIcon },
];

export default function StaffSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? " visible" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <img src={pawLogo} alt="Logo" />
          <span>PawCruz</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.path}
              className={`nav-item${pathname === item.path ? " active" : ""}`}
              onClick={() => go(item.path)}
            >
              <img src={item.icon} alt={item.label} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
