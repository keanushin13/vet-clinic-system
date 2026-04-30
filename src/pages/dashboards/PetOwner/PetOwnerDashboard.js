import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerDashboard.css";
import "../../../css/DashboardShared.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getPetOwnerStats } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const PetOwnerDashboard = () => {
  const navigate = useNavigate();
  // Safe parsing of user data
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [stats, setStats] = useState({
    totalPets: 0,
    upcomingAppointments: 0,
    unreadMessages: 0,
  });
  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    getPetOwnerStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
