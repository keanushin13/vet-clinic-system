import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffUserManagement.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getStaffClients,
  createStaffClient,
  updateStaffClient,
  toggleStaffClientActive,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffUserManagement = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null); // view | add | edit
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const loadUsers = () =>
    getStaffClients()
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]));

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setError("");
    setSelectedUser(null);
    setForm({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
    });
    setModalMode("add");
  };

  const openEdit = (u) => {
    setError("");
    setSelectedUser(u);
    setForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
    });
    setModalMode("edit");
  };

  const openView = (u) => {
    setSelectedUser(u);
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setError("");
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (modalMode === "add") {
        await createStaffClient({ ...form, role: "pet_owner" });
      } else if (modalMode === "edit" && selectedUser) {
        const payload = { ...form, role: "pet_owner" };
        if (!payload.password) delete payload.password;
        await updateStaffClient(selectedUser.id, payload);
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    try {
      await toggleStaffClientActive(u.id);
      await loadUsers();
    } catch {
      setError("Failed to update client status");
    }
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
          <h2>User Management</h2>
          <div className="top-bar-right">
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
          <div className="user-mgmt-header">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by name or email..."
                className="user-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="add-user-btn" onClick={openAdd}>
              + Add New Client
            </button>
          </div>

          <>
            <div className="user-table-card table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Contact Info</th>
                    <th>Registered Pets</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-mini-avatar">
                            {(u.firstName || u.username).charAt(0)}
                          </div>
                          <strong>
                            {u.firstName
                              ? `${u.firstName} ${u.lastName}`
                              : u.username}
                          </strong>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info-cell">
                          <span>{u.email}</span>
                          <small>{u.phone || "—"}</small>
                        </div>
                      </td>
                      <td>{u._count?.pets ?? 0} Pet(s)</td>
                      <td>
                        <span
                          className={`user-status ${u.isActive ? "active" : "suspended"}`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-view icon-btn"
                            onClick={() =>
                              navigate(`/staff-users/${u.id}/pets`, {
                                state: { owner: u },
                              })
                            }
                            title="View pets"
                            aria-label="View pets"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 2C8 2 5 5.5 5 9c0 2.5 1.5 4.5 3 6l4 5 4-5c1.5-1.5 3-3.5 3-6 0-3.5-3-7-7-7z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="12"
                                cy="9"
                                r="2"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          </button>
                          <button
                            className="btn-view icon-btn"
                            onClick={() => openView(u)}
                            title="View user"
                            aria-label="View user"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          </button>
                          <button
                            className="btn-edit icon-btn"
                            onClick={() => openEdit(u)}
                            title="Edit user"
                            aria-label="Edit user"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 20h4l10-10-4-4L4 16v4z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 6l4 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            className={`${u.isActive ? "btn-remove" : "btn-edit"} icon-btn`}
                            onClick={() => toggleStatus(u)}
                            title={
                              u.isActive ? "Deactivate user" : "Activate user"
                            }
                            aria-label={
                              u.isActive ? "Deactivate user" : "Activate user"
                            }
                          >
                            {u.isActive ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M8 7H5l3-3m-3 3 3 3"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 7h8a5 5 0 1 1 0 10h-2"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-mobile table-cards-list">
              {filteredUsers.map((u) => (
                <div className="user-card" key={u.id}>
                  <div className="user-card-header">
                    <div className="user-card-avatar">
                      {(u.firstName || u.username).charAt(0)}
                    </div>
                    <div className="user-card-name">
                      {u.firstName
                        ? `${u.firstName} ${u.lastName}`
                        : u.username}
                    </div>
                  </div>
                  <div className="user-card-body">
                    <div className="user-card-row">
                      <span className="user-card-label">Contact</span>
                      <span>{u.email}</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Phone</span>
                      <span>{u.phone || "—"}</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Pets</span>
                      <span>{u._count?.pets ?? 0} Pet(s)</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Status</span>
                      <span
                        className={`user-status ${u.isActive ? "active" : "suspended"}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Actions</span>
                      <div className="action-btns">
                        <button
                          className="btn-view icon-btn"
                          onClick={() =>
                            navigate(`/staff-users/${u.id}/pets`, {
                              state: { owner: u },
                            })
                          }
                          title="View pets"
                          aria-label="View pets"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 2C8 2 5 5.5 5 9c0 2.5 1.5 4.5 3 6l4 5 4-5c1.5-1.5 3-3.5 3-6 0-3.5-3-7-7-7z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="9"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-view icon-btn"
                          onClick={() => openView(u)}
                          title="View user"
                          aria-label="View user"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-edit icon-btn"
                          onClick={() => openEdit(u)}
                          title="Edit user"
                          aria-label="Edit user"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 20h4l10-10-4-4L4 16v4z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 6l4 4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className={`${u.isActive ? "btn-remove" : "btn-edit"} icon-btn`}
                          onClick={() => toggleStatus(u)}
                          title={
                            u.isActive ? "Deactivate user" : "Activate user"
                          }
                          aria-label={
                            u.isActive ? "Deactivate user" : "Activate user"
                          }
                        >
                          {u.isActive ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M8 7H5l3-3m-3 3 3 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 7h8a5 5 0 1 1 0 10h-2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        </section>
      </main>

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {modalMode === "view" && selectedUser ? (
              <>
                <h3>Client Details</h3>
                <p>
                  <strong>Name:</strong> {selectedUser.firstName || ""}{" "}
                  {selectedUser.lastName || ""}
                </p>
                <p>
                  <strong>Username:</strong> {selectedUser.username}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Phone:</strong> {selectedUser.phone || "-"}
                </p>
                <p>
                  <strong>Pets:</strong> {selectedUser._count?.pets ?? 0}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {selectedUser.isActive ? "Active" : "Inactive"}
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={() => {
                      closeModal();
                      navigate(`/staff-users/${selectedUser.id}/pets`, {
                        state: { owner: selectedUser },
                      });
                    }}
                  >
                    View Pets
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitForm} className="user-modal-form">
                <h3>
                  {modalMode === "add" ? "Add New Client" : "Edit Client"}
                </h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={onChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={onChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: "8px", fontWeight: "500" }}>
                      +63
                    </span>
                    <input
                      type="number"
                      name="phone"
                      value={form.phone?.replace(/^63/, "") || ""}
                      placeholder="Enter number"
                      maxLength="10"
                      pattern="[0-9]*"
                      style={{ flex: 1 }}
                      onChange={(e) => {
                        const numOnly = e.target.value.replace(/[^0-9]/g, "");
                        const phone = numOnly.replace(/^63/, "").slice(0, 10);
                        const fullPhone = phone ? `63${phone}` : "";
                        onChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: "phone",
                            value: fullPhone,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Password
                    {modalMode === "edit" ? " (optional)" : ""}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    required={modalMode === "add"}
                  />
                </div>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffUserManagement;
