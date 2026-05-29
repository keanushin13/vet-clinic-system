import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetDashboard.css";
import "../../../css/DashboardShared.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getAppointments,
  getMedicalRecords,
  getNotifications,
  getVetStats,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";
import dashboardImage from "../../../assets/Veterinary.jpg";
import appointmentIcon from "../../../assets/Appointment_Icon.png";
import medicalIcon from "../../../assets/Medical_Icon.png";
import petsIcon from "../../../assets/Pets_Icon.png";
import messageIcon from "../../../assets/Message_Icon.png";

const HERO_SLIDES = [
  {
    title: "Keep patient care clear from first check-in to follow-up.",
    quote:
      "Daily schedules, medical notes, and client updates stay close so each visit has context.",
  },
  {
    title: "Review appointments and records in one steady workspace.",
    quote:
      "A consistent clinic view helps veterinarians move from consults to documentation with less friction.",
  },
  {
    title: "Spot trends while protecting the details.",
    quote:
      "Use the dashboard graph and reminders to see workload patterns without losing sight of individual patients.",
  },
];

const SERVICE_SHORTCUTS = [
  {
    label: "Appointments",
    path: "/vet-calendar",
    description: "Review today's queue, appointment status, and visit timing.",
    icon: appointmentIcon,
    tone: "blue",
  },
  {
    label: "Patients",
    path: "/vet-patients",
    description: "Open patient profiles, owners, and care details.",
    icon: petsIcon,
    tone: "green",
  },
  {
    label: "Medical Records",
    path: "/vet-medical-records",
    description: "Create and review diagnoses, treatments, and follow-up notes.",
    icon: medicalIcon,
    tone: "yellow",
  },
  {
    label: "Messages",
    path: "/vet-messages",
    description: "Reply to pet owners and coordinate with clinic staff.",
    icon: messageIcon,
    tone: "red",
  },
];

const VetDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const [activeSlide, setActiveSlide] = useState(0);

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    totalRecords: 0,
  });
  const [allApts, setAllApts] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [recentNotifs, setRecentNotifs] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }

    const load = async () => {
      const [statsRes, aptsRes, recsRes, notifsRes] = await Promise.allSettled([
        getVetStats(),
        getAppointments(),
        getMedicalRecords(),
        getNotifications(),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data || {});
      if (aptsRes.status === "fulfilled") setAllApts(aptsRes.value.data || []);
      if (recsRes.status === "fulfilled") setAllRecords(recsRes.value.data || []);
      if (notifsRes.status === "fulfilled") {
        setRecentNotifs((notifsRes.value.data || []).slice(0, 5));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(slideTimer);
  }, []);

  const todayStr = new Date().toDateString();

  const todayApts = useMemo(
    () =>
      allApts
        .filter((a) => new Date(a.scheduledAt).toDateString() === todayStr)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [allApts, todayStr],
  );

  const pendingApts = useMemo(
    () => allApts.filter((a) => a.status === "Pending"),
    [allApts],
  );

  const topServices = useMemo(() => {
    const counts = {};
    allApts.forEach((a) => {
      const svc = (a.reason || "").trim();
      if (svc) counts[svc] = (counts[svc] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allApts]);

  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toDateString();
      return {
        label: d.toLocaleDateString([], { weekday: "short" }),
        count: allApts.filter(
          (a) => new Date(a.scheduledAt).toDateString() === dateStr,
        ).length,
      };
    });
  }, [allApts]);

  const followUpReminders = useMemo(
    () =>
      allRecords
        .filter((r) => r.status === "FollowUp" && r.followUpDate)
        .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
        .slice(0, 5),
    [allRecords],
  );

  return (
    <div className="dashboard-container vet-dashboard-shell">
      <VetSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Veterinary Dashboard</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/vet-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/vet-profile"
            />
          </div>
        </header>

        <section className="content-body vet-dashboard-body">

          {/* ── 1. HERO SLIDER ── */}
          <div className="vet-hero-slider">
            <img
              className="vet-hero-image"
              src={dashboardImage}
              alt=""
              aria-hidden="true"
            />
            <div className="vet-hero-overlay" />
            <div className="vet-hero-copy">
              <span>Veterinary Dashboard</span>
              <h3>{HERO_SLIDES[activeSlide].title}</h3>
              <p>{HERO_SLIDES[activeSlide].quote}</p>
            </div>

            <div className="vet-slide-dots" aria-label="Dashboard slides">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`vet-slide-dot${activeSlide === index ? " active" : ""}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-pressed={activeSlide === index}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* ── 2. TRACK ACTIVITIES ── */}
          <section className="vet-track-box">
            <div className="vet-section-heading compact">
              <div>
                <h3>Track Activities</h3>
                <p>Monitor patient load, today's visits, and record activity.</p>
              </div>
            </div>

            <div className="vet-track-metrics">
              <div className="vet-track-metric blue">
                <span>Total Patients</span>
                <strong>{stats.totalPatients || 0}</strong>
              </div>
              <div className="vet-track-metric green">
                <span>Today's Appointments</span>
                <strong>{stats.todayAppointments || 0}</strong>
              </div>
              <div className="vet-track-metric yellow">
                <span>Medical Records</span>
                <strong>{stats.totalRecords || 0}</strong>
              </div>
            </div>

            <p className="vet-track-note">
              Use this box as the daily clinical snapshot before opening the full
              appointment calendar or patient records.
            </p>
          </section>

          {/* ── 3. APPOINTMENT TREND (moved up from the grid) ── */}
          <div className="vet-track-box">
            <h4 className="dash-section-heading">
              Appointment Trend (Last 7 Days)
            </h4>
            <div className="dash-trend-chart">
              {trendData.map((d, i) => {
                const max = Math.max(...trendData.map((x) => x.count), 1);
                return (
                  <div key={i} className="dash-trend-col">
                    <span className="dash-trend-count">{d.count || ""}</span>
                    <div className="dash-trend-bar-wrap">
                      <div
                        className="dash-trend-bar"
                        style={{ height: `${(d.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="dash-trend-label">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. DASHBOARD GRID (notifications now in the grid) ── */}
          <div className="vet-dashboard-grid">

            <div className="dash-section-card">
              <h4 className="dash-section-heading">
                Today's Schedule
                <span className="dash-count-badge">{todayApts.length}</span>
              </h4>
              {todayApts.length === 0 ? (
                <p className="dash-empty">No appointments today.</p>
              ) : (
                todayApts.map((a) => (
                  <div key={a.id} className="dash-apt-row">
                    <span className="dash-apt-time">
                      {new Date(a.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="dash-apt-pet">{a.pet?.name || "-"}</span>
                    <span className="dash-apt-reason">{a.reason || "-"}</span>
                    <span
                      className={`apt-status ${(a.status || "").toLowerCase()}`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="dash-section-card">
              <h4 className="dash-section-heading">
                Pending Requests
                <span className="dash-count-badge pending">
                  {pendingApts.length}
                </span>
              </h4>
              {pendingApts.length === 0 ? (
                <p className="dash-empty">No pending requests.</p>
              ) : (
                <>
                  {pendingApts.slice(0, 5).map((a) => (
                    <div key={a.id} className="dash-apt-row">
                      <span className="dash-apt-pet">{a.pet?.name || "-"}</span>
                      <span className="dash-apt-owner">
                        {`${a.owner?.firstName || ""} ${a.owner?.lastName || ""}`.trim() ||
                          a.owner?.username ||
                          "-"}
                      </span>
                      <span className="dash-apt-time">
                        {new Date(a.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {pendingApts.length > 5 && (
                    <button
                      className="dash-view-all"
                      onClick={() => navigate("/vet-calendar")}
                    >
                      View all {pendingApts.length} pending
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="dash-section-card">
              <h4 className="dash-section-heading">Follow-up Reminders</h4>
              {followUpReminders.length === 0 ? (
                <p className="dash-empty">No upcoming follow-ups.</p>
              ) : (
                followUpReminders.map((r) => (
                  <div key={r.id} className="dash-apt-row">
                    <span className="dash-apt-pet">{r.pet?.name || "-"}</span>
                    <span className="dash-apt-reason">{r.diagnosis || "-"}</span>
                    <span className="dash-apt-time">
                      Due: {new Date(r.followUpDate).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="dash-section-card">
              <h4 className="dash-section-heading">
                Recent Notifications
                <button
                  className="dash-view-all"
                  onClick={() => navigate("/vet-notifications")}
                >
                  View all
                </button>
              </h4>
              {recentNotifs.length === 0 ? (
                <p className="dash-empty">No notifications.</p>
              ) : (
                recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`dash-notif-row ${n.isRead ? "" : "unread"}`}
                  >
                    <span className="dash-notif-title">{n.title}</span>
                    <span className="dash-notif-body">{n.body}</span>
                  </div>
                ))
              )}
            </div>

            <div className="dash-section-card">
              <h4 className="dash-section-heading">Most Common Services</h4>
              {topServices.length === 0 ? (
                <p className="dash-empty">No appointment data yet.</p>
              ) : (
                topServices.map(([svc, count]) => {
                  const max = topServices[0][1];
                  return (
                    <div key={svc} className="dash-service-row">
                      <span className="dash-service-name">{svc}</span>
                      <div className="dash-service-bar-wrap">
                        <div
                          className="dash-service-bar"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="dash-service-count">{count}</span>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* ── 5. SERVICES (moved to bottom) ── */}
          <div className="vet-services-section">
            <div className="vet-section-heading">
              <div>
                <h3>Services</h3>
                <p>Quick access to the veterinary tools used throughout the day.</p>
              </div>
            </div>

            <div className="vet-services-grid">
              {SERVICE_SHORTCUTS.map((service) => (
                <button
                  key={service.path}
                  className={`vet-service-card tone-${service.tone}`}
                  onClick={() => navigate(service.path)}
                  type="button"
                >
                  <span className="vet-service-icon">
                    <img src={service.icon} alt="" />
                  </span>
                  <span className="vet-service-copy">
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

export default VetDashboard;
