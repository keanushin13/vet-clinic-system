import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerDashboard.css";
import "../../../css/DashboardShared.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getAppointments,
  getMe,
  getNotifications,
  getPetOwnerStats,
  markNotificationRead,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";
import dashboardImage from "../../../assets/dog_cat.jpg";
import profileIcon from "../../../assets/Profile.png";
import notifIcon from "../../../assets/Bell_Icon.png";
import petsIcon from "../../../assets/Pets_Icon.png";
import apptIcon from "../../../assets/Appointment_Icon.png";
import messageIcon from "../../../assets/Message_Icon.png";
import medicalIcon from "../../../assets/Medical_Icon.png";
import paymentIcon from "../../../assets/payment_icon.png";

const HERO_SLIDES = [
  {
    title: "Keep your pets' care organized in one place.",
    quote:
      "Track appointments, records, messages, and updates without losing the thread between visits.",
  },
  {
    title: "Plan each clinic visit with confidence.",
    quote:
      "Book a schedule, follow pending requests, and keep your pet's care history close when you need it.",
  },
  {
    title: "Stay connected with PawCruz.",
    quote:
      "Messages, reminders, and clinic notices help you respond quickly when your pet needs attention.",
  },
];

const SERVICE_SHORTCUTS = [
  {
    label: "Profile",
    path: "/pet-owner-profile",
    description: "Update contact details, address, and account information.",
    icon: profileIcon,
    tone: "blue",
  },
  {
    label: "Notifications",
    path: "/pet-owner-notifications",
    description: "Review clinic updates, appointment notices, and reminders.",
    icon: notifIcon,
    tone: "green",
  },
  {
    label: "My Pets",
    path: "/pet-owner-pets",
    description: "Manage pet profiles, health details, and ownership records.",
    icon: petsIcon,
    tone: "yellow",
  },
  {
    label: "Book Appointment",
    path: "/pet-owner-appointments",
    description: "Request a clinic visit and review appointment status.",
    icon: apptIcon,
    tone: "red",
  },
  {
    label: "Messages",
    path: "/pet-owner-messages",
    description: "Send questions and follow up with clinic staff.",
    icon: messageIcon,
    tone: "teal",
  },
  {
    label: "Medical Records",
    path: "/pet-owner-records",
    description: "Open visit history, diagnoses, prescriptions, and notes.",
    icon: medicalIcon,
    tone: "orange",
  },
  {
    label: "Payment History",
    path: "/pet-owner-payments",
    description: "Track payment records and billing status for your visits.",
    icon: paymentIcon,
    tone: "violet",
  },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const PetOwnerDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();
  const [activeSlide, setActiveSlide] = useState(0);

  const [stats, setStats] = useState({
    totalPets: 0,
    upcomingAppointments: 0,
    unreadMessages: 0,
  });
  const [profile, setProfile] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [dismissed, setDismissed] = useState({
    profile: false,
    upcoming: false,
    pending: false,
    rescheduled: false,
    announcement: false,
  });

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    Promise.all([
      getPetOwnerStats(),
      getMe(),
      getAppointments(),
      getNotifications(),
    ])
      .then(([statsRes, meRes, apptRes, notifRes]) => {
        setStats(statsRes.data || {});
        setProfile(meRes.data || {});
        setAppointments(apptRes.data || []);
        setNotifications(notifRes.data || []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, []);

  const profileIncomplete = !profile.phone || !profile.address;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = appointments.find(
    (appointment) =>
      normalizeStatus(appointment.status) === "confirmed" &&
      new Date(appointment.scheduledAt) >= now &&
      new Date(appointment.scheduledAt) <= in7Days,
  );

  const pendingAppt = appointments.find(
    (appointment) => normalizeStatus(appointment.status) === "pending",
  );

  const rescheduledNotif = notifications.find(
    (notification) =>
      !notification.isRead &&
      (notification.type?.toLowerCase().includes("reschedule") ||
        notification.title?.toLowerCase().includes("reschedule") ||
        notification.body?.toLowerCase().includes("reschedule")),
  );

  const announcementNotif = notifications.find(
    (notification) =>
      !notification.isRead &&
      (notification.type === "announcement" ||
        notification.type === "broadcast" ||
        notification.title?.toLowerCase().includes("announcement")),
  );

  const dismiss = (key) => setDismissed((current) => ({ ...current, [key]: true }));

  const dismissAndMarkRead = (key, notifId) => {
    markNotificationRead(notifId).catch(() => {});
    dismiss(key);
  };

  const activeAlerts = [];

  if (profileIncomplete && !dismissed.profile) {
    activeAlerts.push({
      key: "profile",
      tone: "warning",
      text: "Your profile is incomplete. Add your phone and address.",
      actionLabel: "Complete Profile",
      onAction: () => navigate("/pet-owner-profile"),
      onDismiss: () => dismiss("profile"),
    });
  }

  if (upcoming && !dismissed.upcoming) {
    activeAlerts.push({
      key: "upcoming",
      tone: "info",
      text: `Upcoming appointment: ${upcoming.pet?.name || "Pet"} on ${formatDate(
        upcoming.scheduledAt,
      )}`,
      actionLabel: "View",
      onAction: () => navigate("/pet-owner-appointments"),
      onDismiss: () => dismiss("upcoming"),
    });
  }

  if (pendingAppt && !dismissed.pending) {
    activeAlerts.push({
      key: "pending",
      tone: "pending",
      text: "You have an appointment request pending approval.",
      actionLabel: "View",
      onAction: () => navigate("/pet-owner-appointments"),
      onDismiss: () => dismiss("pending"),
    });
  }

  if (rescheduledNotif && !dismissed.rescheduled) {
    activeAlerts.push({
      key: "rescheduled",
      tone: "rescheduled",
      text: rescheduledNotif.title || "An appointment was rescheduled.",
      actionLabel: "View",
      onAction: () => navigate("/pet-owner-appointments"),
      onDismiss: () =>
        dismissAndMarkRead("rescheduled", rescheduledNotif.id),
    });
  }

  if (announcementNotif && !dismissed.announcement) {
    activeAlerts.push({
      key: "announcement",
      tone: "announcement",
      text: `${announcementNotif.title || "Clinic announcement"} - View in Messages`,
      actionLabel: "Go to Messages",
      onAction: () => navigate("/pet-owner-messages"),
      onDismiss: () =>
        dismissAndMarkRead("announcement", announcementNotif.id),
    });
  }

  return (
    <div className="dashboard-container pet-owner-dashboard-shell">
      <PetOwnerSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Welcome, {user?.firstName || user?.username || "Owner"}</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/pet-owner-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/pet-owner-profile"
            />
          </div>
        </header>

        <section className="content-body pet-owner-dashboard-body">
          <div className="pet-owner-hero-slider">
            <img
              className="pet-owner-hero-image"
              src={dashboardImage}
              alt=""
              aria-hidden="true"
            />
            <div className="pet-owner-hero-overlay" />
            <div className="pet-owner-hero-copy">
              <span>Pet Owner Dashboard</span>
              <h3>{HERO_SLIDES[activeSlide].title}</h3>
              <p>{HERO_SLIDES[activeSlide].quote}</p>
            </div>

            <div className="pet-owner-slide-dots" aria-label="Dashboard slides">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`pet-owner-slide-dot${activeSlide === index ? " active" : ""}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-pressed={activeSlide === index}
                  type="button"
                />
              ))}
            </div>
          </div>

          <section id="tutorial-stats" className="pet-owner-track-box">
            <div className="pet-owner-section-heading compact">
              <div>
                <h3>Care Snapshot</h3>
                <p>Review pet activity, appointment follow-ups, and unread updates.</p>
              </div>
            </div>

            <div className="pet-owner-track-metrics">
              <div className="pet-owner-track-metric blue">
                <span>My Pets</span>
                <strong>{stats.totalPets || 0}</strong>
              </div>
              <div className="pet-owner-track-metric green">
                <span>Upcoming Appointments</span>
                <strong>{stats.upcomingAppointments || 0}</strong>
              </div>
              <div className="pet-owner-track-metric yellow">
                <span>Unread Messages</span>
                <strong>{stats.unreadMessages || 0}</strong>
              </div>
              <div className="pet-owner-track-metric red">
                <span>Active Alerts</span>
                <strong>{activeAlerts.length}</strong>
              </div>
            </div>

            <div className="pet-owner-alert-list" aria-label="Important updates">
              {activeAlerts.length === 0 ? (
                <p className="pet-owner-track-note">
                  All clear for now. New clinic updates and appointment reminders
                  will appear here.
                </p>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.key}
                    className={`pet-owner-alert-banner ${alert.tone}`}
                  >
                    <span>{alert.text}</span>
                    <div className="pet-owner-alert-actions">
                      <button type="button" onClick={alert.onAction}>
                        {alert.actionLabel}
                      </button>
                      <button
                        type="button"
                        className="pet-owner-alert-dismiss"
                        onClick={alert.onDismiss}
                        aria-label="Dismiss alert"
                      >
                        x
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="pet-owner-services-section">
            <div className="pet-owner-section-heading">
              <div>
                <h3>Services</h3>
                <p>Quick access to pet care tools and clinic communication.</p>
              </div>
            </div>

            <div className="pet-owner-services-grid">
              {SERVICE_SHORTCUTS.map((service) => (
                <button
                  key={service.path}
                  className={`pet-owner-service-card tone-${service.tone}`}
                  onClick={() => navigate(service.path)}
                  type="button"
                >
                  <span className="pet-owner-service-icon">
                    <img src={service.icon} alt="" />
                  </span>
                  <span className="pet-owner-service-copy">
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

export default PetOwnerDashboard;
