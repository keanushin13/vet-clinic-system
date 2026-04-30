import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminNotif.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const AdminNotif = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [notifications, setNotifications] = useState([]);

  const load = () =>
    getNotifications()
      .then((r) => setNotifications(r.data))
      .catch(() => {});

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  const handleMarkOne = async (id) => {
    await markNotificationRead(id);
    load();
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN AREA */}
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
            <button className="notif-btn active-notif">
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="Admin Profile" profilePath="/admin-profile" />
          </div>
        </header>

        <section className="content-body notif-layout">
          <div className="notif-card-container">
            <div className="notif-header-flex">
              <h3>Recent Notifications</h3>
              <button className="mark-read-btn" onClick={handleMarkAll}>
                Mark all as read
              </button>
            </div>

            <div className="notif-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? "read" : "unread"}`}
                  onClick={() => !notif.isRead && handleMarkOne(notif.id)}
                >
                  <div className={`notif-icon-circle ${notif.type}`}>
                    <img src={bellIcon} alt="" />
                  </div>
                  <div className="notif-content">
                    <div className="notif-text-top">
                      <span className="notif-title">{notif.title}</span>
                      <span className="notif-time">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="notif-message">{notif.body}</p>
                  </div>
                  {!notif.isRead && <div className="unread-dot"></div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminNotif;
