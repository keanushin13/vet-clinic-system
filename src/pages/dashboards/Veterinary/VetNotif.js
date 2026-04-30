import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetNotif.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/api";

// ASSETS
import appointmentIcon from "../../../assets/Appointment_Icon.png";
import bellIcon from "../../../assets/Bell_Icon.png";
import medicalIcon from "../../../assets/Medical_Icon.png";
import inventoryIcon from "../../../assets/payment_icon.png";
import userIcon from "../../../assets/Profile.png";

const VetNotif = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [notifications, setNotifications] = useState([]);

  // FUNCTION: Security Guard
  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    getNotifications()
      .then((r) => setNotifications(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkOne = async (id) => {
    await markNotificationRead(id);
    setNotifications((ns) =>
      ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

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
          <h2>Notifications</h2>
          <div className="top-bar-right">
            <button className="notif-btn active">
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
          <div className="notif-wrapper">
            <div
              className="notif-header-flex"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ color: "#255065", fontWeight: "600" }}>
                Recent Updates
              </h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#438fb5",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={handleMarkAll}
              >
                Mark all as read
              </button>
            </div>

            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-card ${notif.isRead ? "" : "unread"}`}
                onClick={() => !notif.isRead && handleMarkOne(notif.id)}
              >
                <div className="notif-icon-circle">
                  <img
                    src={
                      notif.type === "Inventory"
                        ? inventoryIcon
                        : notif.type === "Appointment"
                          ? appointmentIcon
                          : medicalIcon
                    }
                    alt="icon"
                  />
                </div>
                <div className="notif-content">
                  <h4>{notif.title}</h4>
                  <p>{notif.body}</p>
                  <span className="notif-time">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default VetNotif;
