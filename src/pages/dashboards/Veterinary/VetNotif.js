import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetNotif.css";
import "../../../css/Modal.css";
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

const CATEGORIES = ["all", "appointment", "medical", "payment", "message"];

const VetNotif = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [notifications, setNotifications] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedNotif, setSelectedNotif] = useState(null);

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

  const filtered =
    categoryFilter === "all"
      ? notifications
      : notifications.filter(
          (n) => (n.type || "").toLowerCase() === categoryFilter,
        );

  const getIcon = (type) => {
    if (type === "Inventory" || type === "payment") return inventoryIcon;
    if (type === "appointment" || type === "Appointment") return appointmentIcon;
    return medicalIcon;
  };

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
          <h2>Veterinary Notifications</h2>
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
            <div className="notif-header-flex">
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

            {/* Category filter tabs */}
            <div className="notif-filter-tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`notif-tab ${categoryFilter === cat ? "active" : ""}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "all"
                    ? "All"
                    : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <p style={{ color: "#aaa", textAlign: "center", padding: "24px 0" }}>
                No notifications in this category.
              </p>
            )}

            {filtered.map((notif) => (
              <div
                key={notif.id}
                className={`notif-card ${notif.isRead ? "" : "unread"}`}
                onClick={() => {
                  setSelectedNotif(notif);
                  if (!notif.isRead) handleMarkOne(notif.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="notif-icon-circle">
                  <img src={getIcon(notif.type)} alt="icon" />
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

      {/* Detail modal */}
      {selectedNotif && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="modal-box notif-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{selectedNotif.title}</h3>
            <span className="notif-type-badge">{selectedNotif.type}</span>
            <p className="notif-detail-body">{selectedNotif.body}</p>
            <span className="notif-time">
              {new Date(selectedNotif.createdAt).toLocaleString()}
            </span>
            <div className="modal-actions">
              <button
                className="save-btn"
                onClick={() => setSelectedNotif(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetNotif;
