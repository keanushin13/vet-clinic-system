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
import profileIcon from "../../../assets/Profile.png";
import notifIcon from "../../../assets/Bell_Icon.png";
import petsIcon from "../../../assets/Pets_Icon.png";
import apptIcon from "../../../assets/Appointment_Icon.png";
import messageIcon from "../../../assets/Message_Icon.png";
import medicalIcon from "../../../assets/Medical_Icon.png";
import paymentIcon from "../../../assets/payment_icon.png";

const SHORTCUTS = [
  { label: "Profile",          path: "/pet-owner-profile",       icon: profileIcon },
  { label: "Notifications",    path: "/pet-owner-notifications",  icon: notifIcon },
  { label: "My Pets",          path: "/pet-owner-pets",           icon: petsIcon },
  { label: "Book Appointment", path: "/pet-owner-appointments",   icon: apptIcon },
  { label: "Messages",         path: "/pet-owner-messages",       icon: messageIcon },
  { label: "Medical Records",  path: "/pet-owner-records",        icon: medicalIcon },
  { label: "Payment History",  path: "/pet-owner-payments",       icon: paymentIcon },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const PetOwnerDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

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
        setStats(statsRes.data);
        setProfile(meRes.data || {});
        setAppointments(apptRes.data || []);
        setNotifications(notifRes.data || []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Banner derivations ────────────────────────────────────────────────────
  const profileIncomplete = !profile.phone || !profile.address;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = appointments.find(
    (a) =>
      a.status === "Confirmed" &&
      new Date(a.scheduledAt) >= now &&
      new Date(a.scheduledAt) <= in7Days,
  );

  const pendingAppt = appointments.find((a) => a.status === "Pending");

  const rescheduledNotif = notifications.find(
    (n) =>
      !n.isRead &&
      (n.type?.toLowerCase().includes("reschedule") ||
        n.title?.toLowerCase().includes("reschedule") ||
        n.body?.toLowerCase().includes("reschedule")),
  );

  const announcementNotif = notifications.find(
    (n) =>
      !n.isRead &&
      (n.type === "announcement" ||
        n.type === "broadcast" ||
        n.title?.toLowerCase().includes("announcement")),
  );

  const dismiss = (key) => setDismissed((d) => ({ ...d, [key]: true }));

  const dismissAndMarkRead = (key, notifId) => {
    markNotificationRead(notifId).catch(() => {});
    dismiss(key);
  };

  return (
    <div className="dashboard-container">
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

        <section className="content-body dashboard-home-content">
          <div className="dashboard-header-action">
            <h3 className="dashboard-section-title">Getting started</h3>
            <p className="dashboard-section-description">
              Welcome to your PawCruz dashboard. Manage your pet's health and
              appointments here.
            </p>
          </div>

          {/* ── ALERT BANNERS ─────────────────────────────────────────── */}
          <div className="alert-banners">
            {profileIncomplete && !dismissed.profile && (
              <div className="alert-banner warning">
                <span>
                  ⚠️ Your profile is incomplete. Add your phone and address.
                </span>
                <div className="alert-banner-actions">
                  <button onClick={() => navigate("/pet-owner-profile")}>
                    Complete Profile
                  </button>
                  <button
                    className="dismiss-btn"
                    onClick={() => dismiss("profile")}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {upcoming && !dismissed.upcoming && (
              <div className="alert-banner info">
                <span>
                  📅 Upcoming appointment:{" "}
                  <strong>{upcoming.pet?.name}</strong> on{" "}
                  {formatDate(upcoming.scheduledAt)}
                </span>
                <div className="alert-banner-actions">
                  <button onClick={() => navigate("/pet-owner-appointments")}>
                    View
                  </button>
                  <button
                    className="dismiss-btn"
                    onClick={() => dismiss("upcoming")}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {pendingAppt && !dismissed.pending && (
              <div className="alert-banner pending">
                <span>🕐 You have an appointment request pending approval.</span>
                <div className="alert-banner-actions">
                  <button onClick={() => navigate("/pet-owner-appointments")}>
                    View
                  </button>
                  <button
                    className="dismiss-btn"
                    onClick={() => dismiss("pending")}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {rescheduledNotif && !dismissed.rescheduled && (
              <div className="alert-banner rescheduled">
                <span>🔄 {rescheduledNotif.title}</span>
                <div className="alert-banner-actions">
                  <button onClick={() => navigate("/pet-owner-appointments")}>
                    View
                  </button>
                  <button
                    className="dismiss-btn"
                    onClick={() =>
                      dismissAndMarkRead("rescheduled", rescheduledNotif.id)
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {announcementNotif && !dismissed.announcement && (
              <div className="alert-banner announcement">
                <span>📢 {announcementNotif.title} — View in Messages</span>
                <div className="alert-banner-actions">
                  <button onClick={() => navigate("/pet-owner-messages")}>
                    Go to Messages
                  </button>
                  <button
                    className="dismiss-btn"
                    onClick={() =>
                      dismissAndMarkRead("announcement", announcementNotif.id)
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── QUICK SHORTCUTS ───────────────────────────────────────── */}
          <div className="shortcut-grid">
            {SHORTCUTS.map(({ label, path, icon }) => (
              <button
                key={path}
                className="shortcut-card"
                onClick={() => navigate(path)}
              >
                <img src={icon} alt={label} className="shortcut-icon" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div id="tutorial-stats" className="shared-stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>My Pets</span>
                <h4>{stats.totalPets}</h4>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-info">
                <span>Upcoming Appointments</span>
                <h4>{stats.upcomingAppointments}</h4>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-info">
                <span>Unread Messages</span>
                <h4>{stats.unreadMessages}</h4>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PetOwnerDashboard;
