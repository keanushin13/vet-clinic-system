import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import VetConfirmModal from "../../../components/VetConfirmModal";
import "../../../css/VetMessages.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  deleteMessage,
  getMessageThread,
  getMessageThreads,
  getUsers,
  sendMessage,
  updateMessage,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

// Quick-message templates the vet can insert with one click
const QUICK_TEMPLATES = [
  {
    label: "Appointment Update",
    body: "Hi, I wanted to update you regarding your upcoming appointment. Please feel free to reply if you have any questions.",
  },
  {
    label: "Follow-up Reminder",
    body: "Hi, this is a follow-up reminder for your pet's scheduled check-up. Please confirm your availability or let us know if you need to reschedule.",
  },
];

const ROLE_FILTERS = [
  { value: "all", label: "All" },
  { value: "pet_owner", label: "Pet Owners" },
  { value: "staff_admin", label: "Staff & Admin" },
];

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
};

const VetMessages = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const messagesEndRef = useRef(null);

  const [activeChat, setActiveChat] = useState(null);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCompose, setShowCompose] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingBody, setEditingBody] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  const loadThreads = () =>
    getMessageThreads()
      .then((r) => setThreads(r.data || []))
      .catch(() => {});

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Thread filtering ──
  const filteredThreads = threads.filter((t) => {
    const partner = t.partner || {};
    const name = `${partner.firstName || ""} ${partner.lastName || ""} ${partner.username || ""}`.toLowerCase();
    if (threadSearch && !name.includes(threadSearch.toLowerCase())) return false;
    if (roleFilter === "pet_owner" && partner.role !== "pet_owner") return false;
    if (roleFilter === "staff_admin" && partner.role !== "staff" && partner.role !== "admin")
      return false;
    return true;
  });

  const openCompose = () => {
    getUsers()
      .then((r) => {
        setAllUsers((r.data || []).filter((u) => u.id !== user.id));
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
      .then((r) => setMessages(r.data || []))
      .catch(() => setMessages([]));
  };

  const openThread = (thread) => {
    setActiveChat(thread);
    getMessageThread(thread.partner.id)
      .then((r) => setMessages(r.data || []))
      .catch(() => {});
  };

  const handleSend = async () => {
    const body = newMsg.trim();
    if (!body || !activeChat) return;
    setNewMsg("");
    await sendMessage({ receiverId: activeChat.partner.id, body });
    getMessageThread(activeChat.partner.id)
      .then((r) => setMessages(r.data || []))
      .catch(() => {});
    loadThreads();
  };

  const insertTemplate = (templateBody) => {
    setNewMsg(templateBody);
  };

  const startEditMessage = (m) => {
    setEditingMessageId(m.id);
    setEditingBody(m.body);
  };

  const saveMessageEdit = async () => {
    if (!editingBody.trim() || !activeChat) return;
    await updateMessage(editingMessageId, { body: editingBody.trim() });
    setEditingMessageId(null);
    setEditingBody("");
    getMessageThread(activeChat.partner.id)
      .then((r) => setMessages(r.data || []))
      .catch(() => {});
  };

  const removeMessage = async (id) => {
    if (!activeChat) return;
    setConfirmModal({ type: "delete-message", id, loading: false });
  };

  const confirmRemoveMessage = async () => {
    if (!confirmModal?.id || !activeChat) return;
    setConfirmModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteMessage(confirmModal.id);
      getMessageThread(activeChat.partner.id)
        .then((r) => setMessages(r.data || []))
        .catch(() => {});
    } finally {
      setConfirmModal(null);
    }
  };

  const partnerDisplayName = (partner) =>
    partner?.firstName
      ? `${partner.firstName} ${partner.lastName || ""}`.trim()
      : partner?.username || "";

  const roleLabel = (role) => {
    if (role === "pet_owner") return "Pet Owner";
    if (role === "veterinarian") return "Veterinarian";
    if (role === "staff") return "Staff";
    if (role === "admin") return "Admin";
    return role || "";
  };

  return (
    <div className="dashboard-container">
      <VetSidebar isOpen={isOpen} onClose={close} />

      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span />
            <span />
            <span />
          </button>
          <h2>Messages</h2>
          <div className="top-bar-right">
            <button className="notif-btn" onClick={() => navigate("/vet-notifications")}>
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="User" profilePath="/vet-profile" />
          </div>
        </header>

        <section className="content-body no-scroll">
          <div className="messaging-wrapper">

            {/* ── CONTACT SIDEBAR ── */}
            <div className="contact-sidebar">
              {/* Search + New button */}
              <div className="search-messages">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="compose-btn" onClick={openCompose}>
                    + New
                  </button>
                </div>

                {/* Role filter tabs */}
                <div className="msg-role-tabs">
                  {ROLE_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`msg-role-tab ${roleFilter === f.value ? "active" : ""}`}
                      onClick={() => setRoleFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread list */}
              <div className="contact-list">
                {filteredThreads.length === 0 && (
                  <p className="msg-empty-threads">No conversations found.</p>
                )}
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.partner.id}
                    className={`contact-item ${activeChat?.partner?.id === thread.partner.id ? "active" : ""} ${thread.unread > 0 ? "unread" : ""}`}
                    onClick={() => openThread(thread)}
                  >
                    <div className="contact-avatar">
                      {(thread.partner?.firstName || thread.partner?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name-row">
                        <h4>{partnerDisplayName(thread.partner)}</h4>
                        <span>{thread.lastAt ? fmtDate(thread.lastAt) : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ margin: 0 }}>{thread.lastMessage}</p>
                        {thread.partner?.role && (
                          <span className="contact-role-badge">{roleLabel(thread.partner.role)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CHAT WINDOW ── */}
            <div className="chat-window">
              {/* Chat header */}
              <div className="chat-header">
                {activeChat ? (
                  <div className="chat-header-info">
                    <div className="chat-partner-avatar">
                      {(activeChat.partner?.firstName || activeChat.partner?.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3>{partnerDisplayName(activeChat.partner)}</h3>
                      {activeChat.partner?.role && (
                        <span className="chat-partner-role">
                          {roleLabel(activeChat.partner.role)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <h3 style={{ color: "#aaa", fontWeight: 400 }}>
                    Select a conversation or start a new one
                  </h3>
                )}
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {!activeChat && (
                  <div className="chat-empty-state">
                    <p>No conversation selected.</p>
                    <p>Choose a contact from the sidebar or click <strong>+ New</strong> to start a chat.</p>
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.senderId === user?.id;
                  const isEditing = editingMessageId === m.id;
                  return (
                    <div key={m.id} className={`msg-bubble ${isMine ? "sent" : "received"}`}>
                      {isEditing ? (
                        <div className="msg-edit-wrap">
                          <input
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveMessageEdit()}
                          />
                          <button className="msg-action" onClick={saveMessageEdit}>Save</button>
                          <button className="msg-action" onClick={() => { setEditingMessageId(null); setEditingBody(""); }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="msg-body">{m.body}</span>
                          <span className={`msg-timestamp ${isMine ? "sent" : ""}`}>
                            {m.createdAt ? fmtTime(m.createdAt) : ""}
                          </span>
                          {isMine && (
                            <div className="msg-actions-row">
                              <button className="msg-action" onClick={() => startEditMessage(m)}>Edit</button>
                              <button className="msg-action msg-action-danger" onClick={() => removeMessage(m.id)}>
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              {activeChat && (
                <div className="chat-input-area">
                  <div className="chat-input-col">
                    {/* Quick-template buttons */}
                    <div className="quick-templates">
                      {QUICK_TEMPLATES.map((t) => (
                        <button
                          key={t.label}
                          className="quick-template-btn"
                          onClick={() => insertTemplate(t.body)}
                          title={t.body}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="chat-input-row">
                      <input
                        type="text"
                        placeholder="Type your message here..."
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      />
                      <button className="send-btn" onClick={handleSend} disabled={!newMsg.trim()}>
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── COMPOSE MODAL ── */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal-box compose-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Message</h3>
            <input
              className="compose-search"
              type="text"
              placeholder="Search by name, role, or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              autoFocus
            />
            <div className="compose-user-list">
              {allUsers
                .filter((u) =>
                  (
                    `${u.firstName || ""} ${u.lastName || ""} ${u.username} ${u.email} ${u.role}`
                  )
                    .toLowerCase()
                    .includes(userSearch.toLowerCase()),
                )
                .map((u) => (
                  <div key={u.id} className="compose-user-item" onClick={() => startThread(u)}>
                    <div className="contact-avatar">
                      {(u.firstName || u.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="compose-name">
                        {u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username}
                      </div>
                      <div className="compose-role">
                        {roleLabel(u.role)} · {u.email}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <button className="cancel-btn" style={{ marginTop: 12 }} onClick={() => setShowCompose(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmModal?.type === "delete-message" && (
        <VetConfirmModal
          title="Delete Message"
          message="Delete this message from the conversation?"
          confirmLabel="Delete"
          tone="danger"
          loading={confirmModal.loading}
          onCancel={() => setConfirmModal(null)}
          onConfirm={confirmRemoveMessage}
        />
      )}
    </div>
  );
};

export default VetMessages;
