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
  broadcastNotification,
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

  // Unread filter for concerns queue
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastRole, setBroadcastRole] = useState("all");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState("");

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

  const sendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastSending(true);
    setBroadcastError("");
    setBroadcastSuccess("");
    try {
      const res = await broadcastNotification(broadcastTitle, broadcastBody, broadcastRole === "all" ? undefined : broadcastRole);
      setBroadcastSuccess(`Sent to ${res.data?.count ?? "all"} user(s).`);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastRole("all");
    } catch (err) {
      setBroadcastError(err.response?.data?.message || "Failed to send broadcast.");
    } finally {
      setBroadcastSending(false);
    }
  };

  const displayedThreads = threads.filter((t) => {
    if (!unreadOnly) return true;
    // Show threads where someone is waiting for a response (last message not from current user)
    return t.unread > 0 || (t.lastSenderId && t.lastSenderId !== user?.id);
  });

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
          <h2>Staff Messages</h2>
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
                style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
              >
                <input
                  type="text"
                  placeholder="Search contacts..."
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="compose-btn" onClick={openCompose}>+ New</button>
                <button className="broadcast-btn" onClick={() => { setShowBroadcast(true); setBroadcastError(""); setBroadcastSuccess(""); }}>
                  Broadcast
                </button>
              </div>
              <label className="unread-toggle">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                />
                Unread / Concerns only
              </label>
              <div className="contact-list">
                {displayedThreads.map((thread) => (
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

      {/* BROADCAST MODAL */}
      {showBroadcast && (
        <div className="modal-overlay" onClick={() => setShowBroadcast(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={sendBroadcast} className="user-modal-form">
              <h3>Broadcast Announcement</h3>
              <div className="form-group">
                <label>Title <span style={{ color: "#e53e3e" }}>*</span></label>
                <input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Announcement title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Message <span style={{ color: "#e53e3e" }}>*</span></label>
                <textarea
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  required
                  style={{ resize: "vertical", fontFamily: "Poppins, sans-serif", fontSize: "13px" }}
                />
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <select value={broadcastRole} onChange={(e) => setBroadcastRole(e.target.value)}>
                  <option value="all">All Users</option>
                  <option value="pet_owner">Pet Owners</option>
                  <option value="veterinarian">Veterinarians</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              {broadcastError && <p className="modal-error">{broadcastError}</p>}
              {broadcastSuccess && <p style={{ color: "#166534", fontSize: "13px" }}>{broadcastSuccess}</p>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowBroadcast(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={broadcastSending}>
                  {broadcastSending ? "Sending..." : "Send Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMessages;
