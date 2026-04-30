import { useNavigate, useLocation } from "react-router-dom";
import pawLogo from "../assets/paw.png";
import dashboardIcon from "../assets/Dashboard_Icon.png";
import patientsIcon from "../assets/Pets_Icon.png";
import appointmentIcon from "../assets/Appointment_Icon.png";
import messageIcon from "../assets/Message_Icon.png";
import medicalIcon from "../assets/Medical_Icon.png";
import inventoryIcon from "../assets/payment_icon.png";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/vet", icon: dashboardIcon },
  { label: "Patients", path: "/vet-patients", icon: patientsIcon },
  { label: "Calendar", path: "/vet-calendar", icon: appointmentIcon },
  { label: "Messages", path: "/vet-messages", icon: messageIcon },
  { label: "Medical Records", path: "/vet-medical-records", icon: medicalIcon },
  { label: "Schedule", path: "/vet-schedule", icon: appointmentIcon },
  { label: "Inventory", path: "/vet-inventory", icon: inventoryIcon },
];

export default function VetSidebar({ isOpen, onClose }) {
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
