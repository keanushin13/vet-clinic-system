import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerMessages.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import PetOwnerChatBot from "./PetOwnerChatBot";
import {
  deleteMessage,
  getAvailableVets,
  getMessageThread,
  getMessageThreads,
  getNotifications,
  getUsers,
  sendMessage,
  updateMessage,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import broadcastIcon from "../../../assets/broadcast.png";
import chatImage from "../../../assets/chat.png";
import userIcon from "../../../assets/Profile.png";
import supportIcon from "../../../assets/support.png";

const isBroadcastNotification = (notification) => {
  const type = String(notification?.type || "").toLowerCase();
  const title = String(notification?.title || "").toLowerCase();
  const body = String(notification?.body || "").toLowerCase();
  return (
    type.includes("broadcast") ||
    type.includes("announcement") ||
    title.includes("announcement") ||
    body.includes("announcement")
  );
};

const getFullName = (person) =>
  person?.firstName
    ? `${person.firstName} ${person.lastName || ""}`.trim()
    : person?.username || "Unknown";

const getMessageRole = (person) => {
  const role = String(person?.messageRole || person?.role || "").toLowerCase();
  return role === "vet" ? "veterinarian" : role;
};

const isStaffOrVet = (person) =>
  ["staff", "veterinarian"].includes(getMessageRole(person));

const readUserList = (data, seen = new Set()) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object" || seen.has(data)) return [];
  seen.add(data);

  const keys = ["users", "data", "payload", "results", "items"];
  return keys.flatMap((key) => readUserList(data[key], seen));
};

const readDirectUserList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const sameUser = (a, b) => String(a) === String(b);

const normalizeMessageUser = (person, fallbackRole = "") => {
  const id = person?.id ?? person?._id;
  return {
    ...person,
    id,
    messageRole: getMessageRole(person) || fallbackRole,
  };
};

const PetOwnerMessages = () => {
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
  const [composeRoleFilter, setComposeRoleFilter] = useState("staff");
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeErrors, setComposeErrors] = useState({
    staff: "",
    veterinarian: "",
  });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingBody, setEditingBody] = useState("");
  const [broadcasts, setBroadcasts] = useState([]);
  const [activeSpecialChat, setActiveSpecialChat] = useState(null);

  const unreadBroadcasts = broadcasts.filter((broadcast) => !broadcast.isRead);

  const loadThreads = () =>
    getMessageThreads()
      .then((r) => setThreads(r.data))
      .catch(() => {});

  const loadBroadcasts = () =>
    getNotifications()
      .then((r) => {
        const items = Array.isArray(r.data) ? r.data : [];
        setBroadcasts(items.filter(isBroadcastNotification).slice(0, 6));
      })
      .catch(() => setBroadcasts([]));

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    loadThreads();
    loadBroadcasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCompose = () => {
    setAllUsers([]);
    setUserSearch("");
    setComposeRoleFilter("staff");
    setComposeErrors({ staff: "", veterinarian: "" });
    setComposeLoading(true);
    setShowCompose(true);

    Promise.allSettled([
      getUsers({ page: 1, limit: 1000 }),
      getUsers({ role: "staff", limit: 1000 }),
      getUsers({ role: "veterinarian", limit: 1000 }),
      getAvailableVets(),
    ])
      .then((results) => {
        const readUsers = (result, messageRole) => {
          if (result.status !== "fulfilled") return [];

          const recursiveUsers = readUserList(result.value.data);
          const directUsers = readDirectUserList(result.value.data);
          const sourceUsers = recursiveUsers.length > 0 ? recursiveUsers : directUsers;

          return sourceUsers.map((candidate) =>
            normalizeMessageUser(candidate, messageRole),
          );
        };

        const users = [
          ...readUsers(results[0], ""),
          ...readUsers(results[1], "staff"),
          ...readUsers(results[2], "veterinarian"),
          ...readUsers(results[3], "veterinarian"),
          ...threads
            .map((thread) => thread.partner)
            .map((partner) => normalizeMessageUser(partner))
            .filter(Boolean),
        ]
          .filter((candidate) => candidate.id)
          .filter((candidate) => !sameUser(candidate.id, user.id))
          .filter((candidate) => !candidate.deletedAt && candidate.isActive !== false)
          .filter(isStaffOrVet);

        const uniqueUsers = Array.from(
          new Map(users.map((candidate) => [candidate.id, candidate])).values(),
        );

        const hasStaff = uniqueUsers.some((candidate) => getMessageRole(candidate) === "staff");
        const hasVet = uniqueUsers.some((candidate) => getMessageRole(candidate) === "veterinarian");
        const vetSourceFailed =
          results[2].status === "rejected" && results[3].status === "rejected";

        setAllUsers(uniqueUsers);
        setComposeErrors({
          staff:
            !hasStaff
              ? "Staff contacts could not be loaded. Please try again later or contact the clinic."
              : "",
          veterinarian:
            !hasVet && vetSourceFailed
              ? "Veterinary contacts could not be loaded. Please try again later or contact the clinic."
              : "",
        });
      })
      .catch(() => {
        setAllUsers([]);
        setComposeErrors({
          staff: "Staff contacts could not be loaded. Please try again later or contact the clinic.",
          veterinarian: "Veterinary contacts could not be loaded. Please try again later or contact the clinic.",
        });
      })
      .finally(() => setComposeLoading(false));
  };

  const startThread = (u) => {
    setShowCompose(false);
    setActiveSpecialChat(null);
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
    setActiveSpecialChat(null);
    setActiveChat(thread);
    getMessageThread(thread.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
  };

  const openSpecialChat = (type) => {
    setActiveSpecialChat(type);
    setActiveChat(null);
    setMessages([]);
    setEditingMessageId(null);
    setEditingBody("");
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

  const startEditMessage = (m) => {
    setEditingMessageId(m.id);
    setEditingBody(m.body);
  };

  const saveEdit = async () => {
    if (!editingBody.trim() || !activeChat) return;
    await updateMessage(editingMessageId, { body: editingBody.trim() });
    setEditingMessageId(null);
    setEditingBody("");
    getMessageThread(activeChat.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
  };

  const removeMsg = async (id) => {
    if (!window.confirm("Delete this message?") || !activeChat) return;
    await deleteMessage(id);
    getMessageThread(activeChat.partner.id)
      .then((r) => setMessages(r.data))
      .catch(() => {});
  };

  const composeUsers = allUsers.filter(
    (candidate) =>
      getMessageRole(candidate) === composeRoleFilter &&
      getFullName(candidate).toLowerCase().includes(userSearch.toLowerCase()),
  );
  const composeRoleError = composeErrors[composeRoleFilter] || "";

  return (
    <div className="dashboard-container">
      <PetOwnerSidebar isOpen={isOpen} onClose={close} />

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
              className="notif-btn"
              onClick={() => navigate("/pet-owner-notifications")}
            >
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
              <div className="special-chat-list" aria-label="Support chats">
                <button
                  type="button"
                  className={`special-chat-card chatbot-highlight ${activeSpecialChat === "quickassist" ? "active" : ""}`}
                  onClick={() => openSpecialChat("quickassist")}
                >
                  <span className="special-chat-icon">
                    <img src={supportIcon} alt="" aria-hidden="true" />
                  </span>
                  <span className="special-chat-meta">
                    <strong>Quick Assist</strong>
                    <span>Clinic help</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`special-chat-card broadcast-highlight ${activeSpecialChat === "broadcast" ? "active" : ""}`}
                  onClick={() => openSpecialChat("broadcast")}
                >
                  <span className="special-chat-icon broadcast">
                    <img src={broadcastIcon} alt="" aria-hidden="true" />
                  </span>
                  <span className="special-chat-meta">
                    <strong>Broadcast Channel</strong>
                    <span>
                      {unreadBroadcasts.length > 0
                        ? `${unreadBroadcasts.length} unread`
                        : "Clinic updates"}
                    </span>
                  </span>
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
            <div className={`chat-window ${activeSpecialChat ? "special-chat-window" : ""}`}>
              {activeSpecialChat === "quickassist" ? (
                <PetOwnerChatBot enabled user={user} variant="embedded" />
              ) : activeSpecialChat === "broadcast" ? (
                <>
                  <div className="chat-header">
                    <h3>Broadcast Channel</h3>
                  </div>
                  <div className="chat-messages broadcast-thread">
                    {broadcasts.length === 0 ? (
                      <div className="empty-chat-state">
                        No broadcast channel messages yet.
                      </div>
                    ) : (
                      broadcasts.map((broadcast) => (
                        <div
                          key={broadcast.id}
                          className={`msg-bubble received broadcast-main-bubble${broadcast.isRead ? "" : " unread"}`}
                        >
                          <strong>
                            {broadcast.title || "Clinic announcement"}
                          </strong>
                          <span>{broadcast.body || "No details provided."}</span>
                          <small>
                            {broadcast.createdAt
                              ? new Date(broadcast.createdAt).toLocaleString()
                              : ""}
                          </small>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="chat-header">
                    <h3>
                      {activeChat?.partner?.firstName
                        ? `${activeChat.partner.firstName} ${activeChat.partner.lastName || ""}`.trim()
                        : activeChat?.partner?.username || "Select a conversation"}
                    </h3>
                  </div>
                  <div className="chat-messages">
                    {!activeChat ? (
                      <div className="empty-chat-state empty-chat-state-hero">
                        <img src={chatImage} alt="" aria-hidden="true" />
                        <h3>Select a conversation</h3>
                        <p>
                          Choose who you want to message, or open Quick Assist
                          and Broadcast Channel from the left side.
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.senderId === user?.id;
                        const isEditing = editingMessageId === m.id;
                        return (
                          <div
                            key={m.id}
                            className={`msg-bubble ${isMine ? "sent" : "received"}`}
                          >
                            {isEditing ? (
                              <div className="msg-edit-wrap">
                                <input
                                  value={editingBody}
                                  onChange={(e) => setEditingBody(e.target.value)}
                                />
                                <button className="msg-action" onClick={saveEdit}>
                                  Save
                                </button>
                                <button
                                  className="msg-action"
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingBody("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span>{m.body}</span>
                                {isMine && (
                                  <div className="msg-actions-row">
                                    <button
                                      className="msg-action"
                                      onClick={() => startEditMessage(m)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="msg-action msg-action-danger"
                                      onClick={() => removeMsg(m.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {activeChat ? (
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
                  ) : null}
                </>
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
            <div className="compose-role-tabs" aria-label="Choose recipient type">
              <button
                type="button"
                className={composeRoleFilter === "staff" ? "active" : ""}
                onClick={() => setComposeRoleFilter("staff")}
              >
                Staff
              </button>
              <button
                type="button"
                className={composeRoleFilter === "veterinarian" ? "active" : ""}
                onClick={() => setComposeRoleFilter("veterinarian")}
              >
                Veterinary
              </button>
            </div>
            <input
              className="compose-search"
              type="text"
              placeholder="Search full name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              disabled={composeLoading}
              autoFocus
            />
            <div className="compose-user-list">
              {composeLoading ? (
                <div className="compose-empty compose-loading">
                  Loading contacts...
                </div>
              ) : composeRoleError ? (
                <div className="compose-empty compose-error">
                  {composeRoleError}
                </div>
              ) : composeUsers.length === 0 ? (
                <div className="compose-empty">
                  No {composeRoleFilter === "staff" ? "staff" : "veterinary"} users found.
                </div>
              ) : (
                composeUsers.map((u) => (
                  <div
                    key={u.id}
                    className="compose-user-item"
                    onClick={() => startThread(u)}
                  >
                    <div className="contact-avatar">
                      {getFullName(u).charAt(0)}
                    </div>
                    <div>
                      <div className="compose-name">
                        {getFullName(u)}
                      </div>
                    </div>
                  </div>
                ))
              )}
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

export default PetOwnerMessages;
