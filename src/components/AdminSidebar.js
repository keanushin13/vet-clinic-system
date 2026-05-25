import { useNavigate, useLocation } from "react-router-dom";
import pawLogo from "../assets/paw.png";
import dashboardIcon from "../assets/Dashboard_Icon.png";
import userManagementIcon from "../assets/UserManagement_Icon.png";
import messageIcon from "../assets/Message_Icon.png";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: dashboardIcon },
  { label: "User Management", path: "/admin-users", icon: userManagementIcon },
  { label: "Appointments", path: "/admin-appointments", icon: dashboardIcon },
  {
    label: "Vet Schedules",
    path: "/admin-vet-schedules",
    icon: userManagementIcon,
  },
  {
    label: "Pet Medical Records",
    path: "/admin-medical-records",
    icon: userManagementIcon,
  },
  { label: "Payments", path: "/admin-payments", icon: dashboardIcon },
  { label: "Inventory", path: "/admin-inventory", icon: userManagementIcon },
  { label: "Activity Logs", path: "/admin-activity-logs", icon: dashboardIcon },
  { label: "Messages", path: "/admin-messages", icon: messageIcon },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Overlay backdrop */}
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
