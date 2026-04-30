import { useNavigate, useLocation } from "react-router-dom";
import pawLogo from "../assets/paw.png";
import dashboardIcon from "../assets/Dashboard_Icon.png";
import appointmentIcon from "../assets/Appointment_Icon.png";
import petsIcon from "../assets/Pets_Icon.png";
import messageIcon from "../assets/Message_Icon.png";
import medicalIcon from "../assets/Medical_Icon.png";
import paymentIcon from "../assets/payment_icon.png";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/pet-owner", icon: dashboardIcon },
  {
    label: "Appointment",
    path: "/pet-owner-appointments",
    icon: appointmentIcon,
  },
  { label: "My Pets", path: "/pet-owner-pets", icon: petsIcon },
  { label: "Messages", path: "/pet-owner-messages", icon: messageIcon },
  { label: "Medical Records", path: "/pet-owner-records", icon: medicalIcon },
  { label: "Payment History", path: "/pet-owner-payments", icon: paymentIcon },
];

export default function PetOwnerSidebar({ isOpen, onClose }) {
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

      <aside
        id="tutorial-sidebar"
        className={`sidebar${isOpen ? " open" : ""}`}
      >
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
