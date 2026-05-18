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

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const VetDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

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
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (aptsRes.status === "fulfilled") setAllApts(aptsRes.value.data || []);
      if (recsRes.status === "fulfilled") setAllRecords(recsRes.value.data || []);
      if (notifsRes.status === "fulfilled")
        setRecentNotifs((notifsRes.value.data || []).slice(0, 5));
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const followUpReminders = useMemo(
    () =>
      allRecords
        .filter((r) => r.status === "FollowUp" && r.followUpDate)
        .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
        .slice(0, 5),
    [allRecords],
  );

  return (
    <div className="dashboard-container">
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
          <h2>
            Welcome, Dr. {user?.firstName || user?.username || "Veterinarian"}
          </h2>
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

        <section className="content-body">
          <div className="dashboard-header-action">
            <h3 className="dashboard-section-title">Clinic Management</h3>
            <p className="dashboard-section-description">
              Welcome to the Veterinary portal. Access patient histories and
              daily schedules here.
            </p>
          </div>

          {/* Stats */}
          <div className="shared-stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Total Patients</span>
                <h4>{stats.totalPatients}</h4>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-info">
                <span>Today's Appointments</span>
                <h4>{stats.todayAppointments}</h4>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-info">
                <span>Medical Records</span>
                <h4>{stats.totalRecords}</h4>
              </div>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="dash-quicknav">
            <button onClick={() => navigate("/vet-calendar")}>Appointments</button>
            <button onClick={() => navigate("/vet-calendar")}>Calendar</button>
            <button onClick={() => navigate("/vet-messages")}>Messages</button>
            <button onClick={() => navigate("/vet-notifications")}>Notifications</button>
          </div>

          {/* Today's Schedule */}
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
                  <span className="dash-apt-pet">{a.pet?.name || "—"}</span>
                  <span className="dash-apt-reason">{a.reason || "—"}</span>
                  <span
                    className={`apt-status ${(a.status || "").toLowerCase()}`}
                  >
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Pending Requests */}
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
                    <span className="dash-apt-pet">{a.pet?.name || "—"}</span>
                    <span className="dash-apt-owner">
                      {`${a.owner?.firstName || ""} ${a.owner?.lastName || ""}`.trim() ||
                        a.owner?.username ||
                        "—"}
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

          {/* Follow-up Reminders */}
          <div className="dash-section-card">
            <h4 className="dash-section-heading">Follow-up Reminders</h4>
            {followUpReminders.length === 0 ? (
              <p className="dash-empty">No upcoming follow-ups.</p>
            ) : (
              followUpReminders.map((r) => (
                <div key={r.id} className="dash-apt-row">
                  <span className="dash-apt-pet">{r.pet?.name || "—"}</span>
                  <span className="dash-apt-reason">{r.diagnosis || "—"}</span>
                  <span className="dash-apt-time">
                    Due: {new Date(r.followUpDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Recent Notifications */}
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
        </section>
      </main>
    </div>
  );
};

export default VetDashboard;
