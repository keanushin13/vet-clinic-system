import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffDashboard.css";
import "../../../css/DashboardShared.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getStaffStats } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";
import dashboardImage from "../../../assets/dog_cat.jpg";
import appointmentIcon from "../../../assets/Appointment_Icon.png";
import userManagementIcon from "../../../assets/UserManagement_Icon.png";
import petsIcon from "../../../assets/Pets_Icon.png";
import messageIcon from "../../../assets/Message_Icon.png";
import inventoryIcon from "../../../assets/Inventory_Icon.png";
import paymentIcon from "../../../assets/payment_icon.png";
import activityIcon from "../../../assets/Medical_Icon.png";

const HERO_SLIDES = [
  {
    title: "Keep every visit moving with care.",
    quote:
      "A calm desk and complete notes make every pet owner feel guided from the first hello.",
  },
  {
    title: "Coordinate appointments, records, and payments.",
    quote:
      "Staff teamwork is the quiet rhythm that keeps PawCruz ready for every patient.",
  },
  {
    title: "Track the work that protects clinic flow.",
    quote:
      "The best service is built from small updates done clearly and on time.",
  },
];

const SERVICE_SHORTCUTS = [
  {
    label: "Appointment",
    path: "/staff-appointments",
    description: "Review bookings, update appointment status, and prepare daily clinic visits.",
    icon: appointmentIcon,
    tone: "blue",
  },
  {
    label: "User Management",
    path: "/staff-users",
    description: "Create, update, and manage pet owner accounts for clinic access.",
    icon: userManagementIcon,
    tone: "green",
  },
  {
    label: "Pet Profile",
    path: "/staff-pets",
    description: "Open pet details, owner links, and care information in one place.",
    icon: petsIcon,
    tone: "yellow",
  },
  {
    label: "Messages",
    path: "/staff-messages",
    description: "Reply to client messages and keep conversations organized.",
    icon: messageIcon,
    tone: "red",
  },
  {
    label: "Vet Schedule",
    path: "/staff-vet-schedules",
    description: "Check veterinarian availability before assigning or moving visits.",
    icon: appointmentIcon,
    tone: "teal",
  },
  {
    label: "Inventory",
    path: "/staff-inventory",
    description: "Monitor supplies, stock counts, and item updates for operations.",
    icon: inventoryIcon,
    tone: "orange",
  },
  {
    label: "Payment History",
    path: "/staff-payments",
    description: "Track billing records, payment status, and transaction history.",
    icon: paymentIcon,
    tone: "violet",
  },
  {
    label: "Activity Log",
    path: "/staff-activity",
    description: "Audit staff actions and follow recent operational updates.",
    icon: activityIcon,
    tone: "slate",
  },
];

const StaffDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();
  const [activeSlide, setActiveSlide] = useState(0);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalPets: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }

    getStaffStats()
      .then((r) => setStats(r.data || {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, []);

  return (
    <div className="dashboard-container staff-dashboard-shell">
      <StaffSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN CONTENT */}
      <main className="main-area">
        <header className="top-bar">
          <button
            className="hamburger-btn"
            onClick={toggle}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
          <h2>Staff Dashboard</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body staff-dashboard-body">
          <div className="staff-hero-slider">
            <img
              className="staff-hero-image"
              src={dashboardImage}
              alt=""
              aria-hidden="true"
            />
            <div className="staff-hero-overlay" />
            <div className="staff-hero-copy">
              <span>Staff Dashboard</span>
              <h3>{HERO_SLIDES[activeSlide].title}</h3>
              <p>{HERO_SLIDES[activeSlide].quote}</p>
            </div>

            <div className="staff-slide-dots" aria-label="Dashboard slides">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`staff-slide-dot${activeSlide === index ? " active" : ""}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-pressed={activeSlide === index}
                  type="button"
                />
              ))}
            </div>
          </div>

          <section className="staff-track-box">
            <div className="staff-section-heading compact">
              <div>
                <h3>Track Activities</h3>
                <p>Monitor clinic workload and operational follow-ups.</p>
              </div>
            </div>

            <div className="staff-track-metrics">
              <div className="staff-track-metric blue">
                <span>Total Appointments</span>
                <strong>{stats.totalAppointments || 0}</strong>
              </div>
              <div className="staff-track-metric green">
                <span>Today's Appointments</span>
                <strong>{stats.todayAppointments || 0}</strong>
              </div>
              <div className="staff-track-metric yellow">
                <span>Total Pets</span>
                <strong>{stats.totalPets || 0}</strong>
              </div>
              <div className="staff-track-metric red">
                <span>Pending Payments</span>
                <strong>{stats.pendingPayments || 0}</strong>
              </div>
            </div>

            <p className="staff-track-note">
              Use this box as the daily snapshot for schedules, pet records,
              and payment follow-ups before opening the full activity log.
            </p>
          </section>

          <div className="staff-services-section">
            <div className="staff-section-heading">
              <div>
                <h3>Services</h3>
                <p>Quick access to the staff tools used throughout the day.</p>
              </div>
            </div>

            <div className="staff-services-grid">
              {SERVICE_SHORTCUTS.map((service) => (
                <button
                  key={service.path}
                  className={`staff-service-card tone-${service.tone}`}
                  onClick={() => navigate(service.path)}
                  type="button"
                >
                  <span className="staff-service-icon">
                    <img src={service.icon} alt="" />
                  </span>
                  <span className="staff-service-copy">
                    <strong>{service.label}</strong>
                    <span>{service.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffDashboard;
