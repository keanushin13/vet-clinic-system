import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffMessages.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getMessageThreads,
  getMessageThread,
  sendMessage,
  getUsers,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffMessages = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [activeChat, setActiveChat] = useState(null);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const loadThreads = () =>
    getMessageThreads()
      .then((r) => setThreads(r.data))
      .catch(() => {});

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    getMessageThreads()
      .then((r) => {
        setThreads(r.data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCompose = () => {
    getUsers()
      .then((r) => {
        setAllUsers(r.data.filter((u) => u.id !== user.id));
        setUserSearch("");
        setShowCompose(true);
      })
      .catch(() => {});
  };

  const startThread = (u) => {
    setShowCompose(false);
    const synthetic = {
      partner: u,
      lastMessage: "",
      lastAt: new Date().toISOString(),
      unread: 0,
    };
    setActiveChat(synthetic);
    getMessageThread(u.id)
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]));
  };

  const openThread = (thread) => {
    setActiveChat(thread);
    getMessageThread(thread.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeChat) return;
    await sendMessage({ receiverId: activeChat.partner.id, body: newMsg });
    setNewMsg("");
    getMessageThread(activeChat.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
    loadThreads();
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
          <h2>Messages</h2>
          <div className="top-bar-right">
            {/* Added the missing navigation handler here */}
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
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
          <div className="messaging-wrapper">
            {/* CONTACT LIST */}
            <div className="contact-sidebar">
              <div
                className="search-messages"
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  type="text"
                  placeholder="Search contacts..."
                  style={{ flex: 1 }}
                />
                <button className="compose-btn" onClick={openCompose}>
                  + New
                </button>
              </div>
              <div className="contact-list">
                {threads.map((thread) => (
                  <div
                    key={thread.partner.id}
                    className={`contact-item ${activeChat?.partner?.id === thread.partner.id ? "active" : ""} ${thread.unread > 0 ? "unread" : ""}`}
                    onClick={() => openThread(thread)}
                  >
                    <div className="contact-avatar">
                      {(
                        thread.partner?.firstName ||
                        thread.partner?.username ||
                        "?"
                      ).charAt(0)}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name-row">
                        <h4>
                          {thread.partner?.firstName
                            ? `${thread.partner.firstName} ${thread.partner.lastName || ""}`.trim()
                            : thread.partner?.username}
                        </h4>
                        <span>
                          {thread.lastAt
                            ? new Date(thread.lastAt).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      <p>{thread.lastMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHAT WINDOW */}
            <div className="chat-window">
              <div className="chat-header">
                <h3>
                  {activeChat?.partner?.firstName
                    ? `${activeChat.partner.firstName} ${activeChat.partner.lastName}`
                    : activeChat?.partner?.username}
                </h3>
              </div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`msg-bubble ${m.senderId === user?.id ? "sent" : "received"}`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button className="send-btn" onClick={handleSend}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* COMPOSE MODAL */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div
            className="modal-box compose-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>New Message</h3>
            <input
              className="compose-search"
              type="text"
              placeholder="Search users by name, role or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              autoFocus
            />
            <div className="compose-user-list">
              {allUsers
                .filter((u) =>
                  (
                    (u.firstName || "") +
                    " " +
                    (u.lastName || "") +
                    " " +
                    u.username +
                    " " +
                    u.email +
                    " " +
                    u.role
                  )
                    .toLowerCase()
                    .includes(userSearch.toLowerCase()),
                )
                .map((u) => (
                  <div
                    key={u.id}
                    className="compose-user-item"
                    onClick={() => startThread(u)}
                  >
                    <div className="contact-avatar">
                      {(u.firstName || u.username || "?").charAt(0)}
                    </div>
                    <div>
                      <div className="compose-name">
                        {u.firstName
                          ? `${u.firstName} ${u.lastName || ""}`.trim()
                          : u.username}
                      </div>
                      <div className="compose-role">
                        {u.role} · {u.email}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <button
              className="cancel-btn"
              style={{ marginTop: 12 }}
              onClick={() => setShowCompose(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMessages;
