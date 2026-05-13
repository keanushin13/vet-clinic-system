import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminMessages.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getMessageThreads,
  getMessageThread,
  sendMessage,
  getUsers,
  broadcastNotification,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const AdminMessages = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");

  const [showCompose, setShowCompose] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bcForm, setBcForm] = useState({
    title: "",
    body: "",
    targetRole: "all",
  });
  const [bcSaving, setBcSaving] = useState(false);
  const [bcMsg, setBcMsg] = useState("");

  const loadThreads = () =>
    getMessageThreads()
      .then((r) => setThreads(r.data))
      .catch(() => {});

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    loadThreads();
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
    setActiveThread({
      partner: u,
      lastMessage: "",
      lastAt: new Date().toISOString(),
      unread: 0,
    });
    getMessageThread(u.id)
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]));
  };

  const openThread = (thread) => {
    setActiveThread(thread);
    getMessageThread(thread.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeThread) return;
    await sendMessage({ receiverId: activeThread.partner.id, body: newMsg });
    setNewMsg("");
    getMessageThread(activeThread.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
    loadThreads();
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBcMsg("");
    setBcSaving(true);
    try {
      const r = await broadcastNotification(
        bcForm.title,
        bcForm.body,
        bcForm.targetRole,
      );
      setBcMsg(`Sent to ${r.data?.recipientCount ?? "all"} users.`);
      setBcForm({ title: "", body: "", targetRole: "all" });
    } catch (err) {
      setBcMsg(err.response?.data?.message || "Broadcast failed");
    } finally {
      setBcSaving(false);
    }
  };

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
          <h2>Messages</h2>
          <div className="top-bar-right">
            <button
              className="broadcast-btn"
              onClick={() => {
                setShowBroadcast(true);
                setBcMsg("");
              }}
              style={{
                background: "#7c3aed",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                marginRight: 8,
              }}
            >
              📢 Broadcast
            </button>
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
          <div className="messaging-wrapper">
            {/* INBOX LIST */}
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
                    className={`contact-item ${activeThread?.partner?.id === thread.partner.id ? "active" : ""} ${thread.unread > 0 ? "unread" : ""}`}
                    onClick={() => openThread(thread)}
                  >
                    <div className="contact-avatar">
                      {(
                        thread.partner.firstName ||
                        thread.partner.username ||
                        "?"
                      ).charAt(0)}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name-row">
                        <h4>
                          {thread.partner.firstName
                            ? `${thread.partner.firstName} ${thread.partner.lastName || ""}`.trim()
                            : thread.partner.username}
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

            {/* CHAT VIEW */}
            <div className="chat-window">
              {activeThread ? (
                <>
                  <div className="chat-header">
                    <h3>
                      {activeThread.partner.firstName
                        ? `${activeThread.partner.firstName} ${activeThread.partner.lastName || ""}`.trim()
                        : activeThread.partner.username}
                    </h3>
                  </div>
                  <div className="chat-messages">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`msg-bubble ${m.senderId === user.id ? "sent" : "received"}`}
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
                </>
              ) : (
                <div className="chat-header">
                  <h3 style={{ color: "#aaa", fontWeight: 400 }}>
                    Select a conversation
                  </h3>
                </div>
              )}
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

      {/* BROADCAST MODAL */}
      {showBroadcast && (
        <div className="modal-overlay" onClick={() => setShowBroadcast(false)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <h3>📢 Broadcast Notification</h3>
            <form onSubmit={handleBroadcast}>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Title *
              </label>
              <input
                value={bcForm.title}
                onChange={(e) =>
                  setBcForm((p) => ({ ...p, title: e.target.value }))
                }
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e0e0e0",
                  fontSize: 14,
                  boxSizing: "border-box",
                  marginBottom: 12,
                  outline: "none",
                }}
              />
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Message *
              </label>
              <textarea
                value={bcForm.body}
                onChange={(e) =>
                  setBcForm((p) => ({ ...p, body: e.target.value }))
                }
                required
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e0e0e0",
                  fontSize: 14,
                  boxSizing: "border-box",
                  marginBottom: 12,
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Send To
              </label>
              <select
                value={bcForm.targetRole}
                onChange={(e) =>
                  setBcForm((p) => ({ ...p, targetRole: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e0e0e0",
                  fontSize: 14,
                  boxSizing: "border-box",
                  marginBottom: 16,
                  outline: "none",
                }}
              >
                <option value="all">All Users</option>
                <option value="pet_owner">Pet Owners Only</option>
                <option value="veterinarian">Veterinarians Only</option>
                <option value="staff">Staff Only</option>
              </select>
              {bcMsg && (
                <p
                  style={{
                    color: bcMsg.includes("failed") ? "#c62828" : "#2e7d32",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  {bcMsg}
                </p>
              )}
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setShowBroadcast(false)}
                  style={{
                    background: "#f5f5f5",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 22px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bcSaving}
                  style={{
                    background: "#7c3aed",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 22px",
                    cursor: "pointer",
                    fontWeight: 600,
                    opacity: bcSaving ? 0.6 : 1,
                  }}
                >
                  {bcSaving ? "Sending…" : "Send Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
