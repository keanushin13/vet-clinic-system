import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffNotif.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/api";

// ASSETS
import appointmentIcon from "../../../assets/Appointment_Icon.png";
import bellIcon from "../../../assets/Bell_Icon.png";
import inventoryIcon from "../../../assets/Inventory_Icon.png";
import messageIcon from "../../../assets/Message_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffNotif = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "staff") {
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
      <StaffSidebar isOpen={isOpen} onClose={close} />

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
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Profile"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="notif-wrapper">
            <div className="notif-header-actions">
              <h3>Recent Notifications</h3>
              <button className="mark-read-btn" onClick={handleMarkAll}>
                Mark all as read
              </button>
            </div>

            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-card ${n.isRead ? "read" : "unread"}`}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                >
                  <div className={`notif-icon-circle ${n.type?.toLowerCase()}`}>
                    {n.type === "Appointment" && (
                      <img src={appointmentIcon} alt="" />
                    )}
                    {n.type === "Inventory" && (
                      <img src={inventoryIcon} alt="" />
                    )}
                    {n.type === "Message" && <img src={messageIcon} alt="" />}
                    {(!n.type || n.type === "System") && (
                      <img src={userIcon} alt="" />
                    )}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title-row">
                      <h4>{n.title}</h4>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{n.body}</p>
                  </div>
                  {!n.isRead && <div className="unread-dot"></div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffNotif;
