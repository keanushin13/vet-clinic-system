import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminDashboard.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getAdminStats } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();
  const [stats, setStats] = useState({
    totalUsers: 0,
    monthlyRevenue: 0,
    activeAppointments: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Welcome, Admin</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin Profile"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="welcome-section">
            <h3>System Overview</h3>
            <p>Monitoring clinic performance and user activity.</p>
          </div>

          {/* STATS GRID */}
          <div className="admin-stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Total Users</span>
                <h4>{stats.totalUsers.toLocaleString()}</h4>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-info">
                <span>Monthly Revenue</span>
                <h4>₱{Number(stats.monthlyRevenue).toLocaleString()}</h4>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-info">
                <span>Active Appointments</span>
                <h4>{stats.activeAppointments}</h4>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-info">
                <span>Low Stock Items</span>
                <h4>{stats.lowStockCount}</h4>
              </div>
            </div>
          </div>

          <div className="admin-recent-flex">
            <div className="recent-box">
              <h4>System Health</h4>
              <p style={{ color: "#63c58d", fontWeight: "bold" }}>
                All systems operational
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
