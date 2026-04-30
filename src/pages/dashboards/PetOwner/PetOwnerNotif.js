import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerNotif.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const PetOwnerNotif = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
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
          <h2>Notifications</h2>
          <div className="top-bar-right">
            <button className="notif-btn" style={{ opacity: "0.6" }}>
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/pet-owner-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div
            className="notif-header-action"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ fontFamily: "Poppins", fontWeight: "600" }}>
              Recent Activity
            </h3>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#255065",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={handleMarkAll}
            >
              Mark all as read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div
              className="dashboard-welcome-card"
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              }}
            >
              <p style={{ color: "#555" }}>
                You have no new notifications at this time.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                  style={{
                    background: "white",
                    padding: "16px 20px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    borderLeft: `4px solid ${n.isRead ? "#e2e8f0" : "#63b6c5"}`,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong style={{ color: "#255065", fontSize: "0.9rem" }}>
                      {n.title}
                    </strong>
                    <span style={{ color: "#888", fontSize: "0.75rem" }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#555",
                      fontSize: "0.85rem",
                      margin: "4px 0 0",
                    }}
                  >
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PetOwnerNotif;
