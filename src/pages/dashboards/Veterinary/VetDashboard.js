import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetDashboard.css";
import "../../../css/DashboardShared.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getVetStats } from "../../../api/api";

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

  // FUNCTION: Guard Clause (Matches PetOwner logic)
  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    getVetStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-container">
      <VetSidebar isOpen={isOpen} onClose={close} />

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
          {/* Functional Greeting: Matches user.name || 'Doctor' pattern */}
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
        </section>
      </main>
    </div>
  );
};

export default VetDashboard;
