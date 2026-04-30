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

const StaffDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
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
      .then((r) => setStats(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-container">
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
          <h2>Welcome, Staff</h2>
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

        {/* Empty Content Area - Ready for custom content */}
        <section className="content-body">
          <div className="dashboard-header-action">
            <h3 className="dashboard-section-title">Staff Portal</h3>
            <p className="dashboard-section-description">
              Manage clinic operations, view pet profiles, and track activities
              from this central hub.
            </p>
          </div>

          <div className="shared-stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Total Appointments</span>
                <h4>{stats.totalAppointments}</h4>
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
                <span>Total Pets</span>
                <h4>{stats.totalPets}</h4>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-info">
                <span>Pending Payments</span>
                <h4>{stats.pendingPayments}</h4>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffDashboard;
