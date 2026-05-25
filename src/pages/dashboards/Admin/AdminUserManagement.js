import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminUserManagement.css";
import "../../../css/responsive-tables.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  toggleUserActive,
  adminResetPassword,
  sendResetLink,
  verifyUser,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getUserStatus(u) {
  if (u.deletedAt) return "deleted";
  if (!u.isActive) return "suspended";
  if (!u.isVerified) return "unverified";
  return "active";
}

function StatusPill({ u }) {
  const s = getUserStatus(u);
  const labels = {
    deleted: "Deleted",
    suspended: "Suspended",
    unverified: "Unverified",
    active: "Active",
  };
  const cls = {
    deleted: "status-deleted",
    suspended: "status-suspended",
    unverified: "status-unverified",
    active: "status-active",
  };
  return <span className={`status-pill ${cls[s]}`}>{labels[s]}</span>;
}

const ROLE_LABELS = {
  pet_owner: "Pet Owner",
  veterinarian: "Veterinarian",
  staff: "Staff",
  admin: "Admin",
};

// Fields shown in edit modal per role
function editFieldsForRole(role) {
  switch (role) {
    case "pet_owner":
      return ["username", "firstName", "lastName", "email", "phone", "address"];
    case "veterinarian":
    case "staff":
    case "admin":
      return ["username", "firstName", "lastName", "email", "phone"];
    default:
      return ["username", "firstName", "lastName", "email", "phone"];
  }
}

const EMPTY_ADD_FORM = {
  role: "pet_owner",
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
};

const EMPTY_RESET_FORM = { newPassword: "", confirm: "" };

// ─── component ───────────────────────────────────────────────────────────────

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  // list state
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(25);

  // filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // modals
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | "reset"
  const [editTarget, setEditTarget] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [form, setForm] = useState(EMPTY_ADD_FORM);
  const [resetForm, setResetForm] = useState(EMPTY_RESET_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (roleFilter !== "all") params.role = roleFilter;
    if (showDeleted) params.showDeleted = "true";
    if (search) params.q = search;
    getUsers(params)
      .then((r) => {
        // Support both paginated { users, total, pages } and legacy array
        if (Array.isArray(r.data)) {
          setUsers(r.data);
          setTotal(r.data.length);
          setPages(1);
        } else {
          setUsers(r.data.users || []);
          setTotal(r.data.total || 0);
          setPages(r.data.pages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, roleFilter, showDeleted, search]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadUsers]);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, showDeleted, search, limit]);

  // ── actions ────────────────────────────────────────────────────────────────

  const handleToggleActive = (u) => {
    if (!u.isActive) {
      setConfirmModal({
        title: `Activate ${u.username}?`,
        message: `This will restore ${u.username}'s access to the system.`,
        confirmLabel: "Activate",
        confirmClass: "save-btn",
        onConfirm: async () => {
          try { await toggleUserActive(u.id); loadUsers(); } catch {}
        },
      });
      return;
    }
    setConfirmModal({
      title: `Suspend ${u.username}?`,
      message: `${u.username} will no longer be able to log in until reactivated.`,
      confirmLabel: "Suspend",
      confirmClass: "danger-btn",
      onConfirm: async () => {
        try { await toggleUserActive(u.id); loadUsers(); } catch {}
      },
    });
  };

  const handleSoftDelete = (u) => {
    setConfirmModal({
      title: `Delete ${u.username}?`,
      message: `This will remove ${u.username} from the active list. They can be restored later.`,
      confirmLabel: "Delete",
      confirmClass: "danger-btn",
      onConfirm: async () => {
        try { await deleteUser(u.id); loadUsers(); } catch {}
      },
    });
  };

  const handleRestore = async (u) => {
    if (!window.confirm(`Restore ${u.username}?`)) return;
    try {
      await restoreUser(u.id);
      loadUsers();
    } catch {}
  };

  const handleVerify = (u) => {
    setConfirmModal({
      title: `Verify ${u.username}?`,
      message: `This will manually mark ${u.username} as a verified pet owner.`,
      confirmLabel: "Verify",
      confirmClass: "save-btn",
      onConfirm: async () => {
        try { await verifyUser(u.id); loadUsers(); } catch {}
      },
    });
  };

  // ── modals ─────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_ADD_FORM);
    setFieldErrors({});
    setFormError("");
    setEditTarget(null);
    setModalMode("add");
  };

  const openEdit = (u) => {
    setForm({
      username: u.username || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      phone: u.phone || "",
      address: u.address || "",
      password: "",
      role: u.role,
    });
    setFieldErrors({});
    setFormError("");
    setEditTarget(u);
    setModalMode("edit");
  };

  const openReset = (u) => {
    setResetForm(EMPTY_RESET_FORM);
    setFieldErrors({});
    setFormError("");
    setEditTarget(u);
    setModalMode("reset");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
  };

  const handleFormChange = (e) => {
    const { name } = e.target;
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    // clear the error for this field as the user types
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // client-side validation → returns fieldErrors object (empty = valid)
  const validateAdd = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address";
    }
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (form.role === "pet_owner" && !form.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (form.phone.trim() && !/^\d{11}$/.test(form.phone.trim())) {
      errs.phone = "Phone must be exactly 11 digits";
    }
    if (form.role === "pet_owner" && !form.address.trim())
      errs.address = "Address is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (modalMode === "add") {
      const errs = validateAdd();
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }
    }

    setSaving(true);
    try {
      if (modalMode === "add") {
        const payload = { ...form };
        if (form.role !== "pet_owner") delete payload.address;
        await createUser(payload);
      } else {
        const fields = editFieldsForRole(editTarget.role);
        const payload = {};
        fields.forEach((f) => {
          if (form[f] !== undefined && form[f] !== "") payload[f] = form[f];
        });
        if (!payload.password) delete payload.password;
        await updateUser(editTarget.id, payload);
      }
      closeModal();
      loadUsers();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && typeof data.errors === "object") {
        setFieldErrors(data.errors);
      } else {
        setFormError(data?.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    setFormError("");
    setSaving(true);
    try {
      await sendResetLink(editTarget.id);
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to send link");
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />

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
          <div className="user-management-card">
            {/* ── toolbar ── */}
            <div className="table-header-actions">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-row">
                <label className="entries-select-label">
                  Show&nbsp;
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="entries-select"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  &nbsp;entries
                </label>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="role-filter-select"
                >
                  <option value="all">All Roles</option>
                  <option value="pet_owner">Pet Owner</option>
                  <option value="veterinarian">Veterinarian</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>

                <label className="show-deleted-toggle">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                  />
                  Show Deleted
                </label>
              </div>

              <button className="add-user-btn" onClick={openAdd}>
                + Add New User
              </button>
            </div>


            {/* ── desktop table ── */}
            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.deletedAt ? "row-deleted" : ""}>
                      <td className="user-name-cell">
                        <div className="user-avatar-small">
                          {(u.firstName || u.username || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span>
                          {u.firstName
                            ? `${u.firstName} ${u.lastName || ""}`.trim()
                            : u.username}
                        </span>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        <StatusPill u={u} />
                      </td>
                      <td>
                        <UserActions
                          u={u}
                          onEdit={openEdit}
                          onViewPets={() =>
                            navigate(`/admin-users/${u.id}/pets`, {
                              state: { owner: u },
                            })
                          }
                          onToggleActive={handleToggleActive}
                          onDelete={handleSoftDelete}
                          onRestore={handleRestore}
                          onResetPw={openReset}
                          onVerify={handleVerify}
                        />
                      </td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── mobile cards ── */}
            <div className="table-mobile table-cards-list">
              {users.map((u) => (
                <div
                  className={`user-card${u.deletedAt ? " row-deleted" : ""}`}
                  key={u.id}
                >
                  <div className="user-card-header">
                    <div className="user-card-avatar">
                      {(u.firstName || u.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="user-card-name">
                      {u.firstName
                        ? `${u.firstName} ${u.lastName || ""}`.trim()
                        : u.username}
                    </div>
                  </div>
                  <div className="user-card-body">
                    <div className="user-card-row">
                      <span className="user-card-label">Email</span>
                      <span>{u.email}</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Role</span>
                      <span className={`role-badge ${u.role}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Phone</span>
                      <span>{u.phone || "—"}</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Status</span>
                      <StatusPill u={u} />
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Actions</span>
                      <UserActions
                        u={u}
                        onEdit={openEdit}
                        onViewPets={() =>
                          navigate(`/admin-users/${u.id}/pets`, {
                            state: { owner: u },
                          })
                        }
                        onToggleActive={handleToggleActive}
                        onDelete={handleSoftDelete}
                        onRestore={handleRestore}
                        onResetPw={openReset}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {!loading && users.length === 0 && (
                <p className="empty-row">No users found.</p>
              )}
            </div>

            {/* ── pagination ── */}
            <div className="pagination-bar">
              <span className="pagination-info">
                {loading
                  ? "Loading..."
                  : total === 0
                    ? "No entries"
                    : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} entries`}
              </span>

              {pages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    &lsaquo; Prev
                  </button>

                  {Array.from({ length: pages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (pages <= 5) return true;
                      if (p === 1 || p === pages) return true;
                      return Math.abs(p - page) <= 1;
                    })
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push("ellipsis-" + p);
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item) =>
                      typeof item === "string" ? (
                        <span key={item} className="page-ellipsis">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          className={`page-btn${item === page ? " page-btn-active" : ""}`}
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}

                  <button
                    className="page-btn"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next &rsaquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Add / Edit Modal ── */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalMode === "add"
                ? "Add New User"
                : `Edit — ${editTarget?.username}`}
            </h3>
            <form onSubmit={handleSubmit} className="user-modal-form">
              {/* role selector — add only */}
              {modalMode === "add" && (
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="pet_owner">Pet Owner</option>
                    <option value="veterinarian">Veterinarian</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {/* first + last name — all roles */}
              {(modalMode === "add" ||
                (modalMode === "edit" &&
                  editFieldsForRole(editTarget?.role).includes("firstName"))) && (
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleFormChange}
                      placeholder="First name"
                      className={fieldErrors.firstName ? "input-error" : ""}
                    />
                    {fieldErrors.firstName && (
                      <p className="field-error">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleFormChange}
                      placeholder="Last name"
                      className={fieldErrors.lastName ? "input-error" : ""}
                    />
                    {fieldErrors.lastName && (
                      <p className="field-error">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* username */}
              <div className="form-group">
                <label>Username *</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  placeholder="Username"
                  className={fieldErrors.username ? "input-error" : ""}
                />
                {fieldErrors.username && (
                  <p className="field-error">{fieldErrors.username}</p>
                )}
              </div>

              {/* email — all roles */}
              {(modalMode === "add" ||
                (modalMode === "edit" &&
                  editFieldsForRole(editTarget?.role).includes("email"))) && (
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="Email"
                    className={fieldErrors.email ? "input-error" : ""}
                  />
                  {fieldErrors.email && (
                    <p className="field-error">{fieldErrors.email}</p>
                  )}
                </div>
              )}

              {/* phone — all roles */}
              {(modalMode === "add" ||
                (modalMode === "edit" &&
                  editFieldsForRole(editTarget?.role).includes("phone"))) && (
                <div className="form-group">
                  <label>
                    Phone{" "}
                    {form.role === "pet_owner" ? "*" : ""}
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="09XXXXXXXXX"
                    className={fieldErrors.phone ? "input-error" : ""}
                  />
                  {fieldErrors.phone && (
                    <p className="field-error">{fieldErrors.phone}</p>
                  )}
                </div>
              )}

              {/* address */}
              {((modalMode === "add" && form.role === "pet_owner") ||
                (modalMode === "edit" &&
                  editFieldsForRole(editTarget?.role).includes("address"))) && (
                <div className="form-group">
                  <label>Address *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="Full address"
                    className={fieldErrors.address ? "input-error" : ""}
                  />
                  {fieldErrors.address && (
                    <p className="field-error">{fieldErrors.address}</p>
                  )}
                </div>
              )}


              {/* add mode hint */}
              {modalMode === "add" && (
                <p className="modal-hint">
                  A "Set Password" link will be emailed to the user to activate their account.
                </p>
              )}

              {formError && <p className="modal-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : modalMode === "add"
                      ? "Create User"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Modal (Suspend / Delete) ── */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-box confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmModal.title}</h3>
            <p className="confirm-modal-message">{confirmModal.message}</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className={confirmModal.confirmClass}
                onClick={async () => {
                  setConfirmModal(null);
                  await confirmModal.onConfirm();
                }}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {modalMode === "reset" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password — {editTarget?.username}</h3>
            <div className="user-modal-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="text"
                  value={editTarget?.email || ""}
                  readOnly
                  className="input-readonly"
                />
              </div>
              <p className="modal-hint">
                A password reset link will be sent to this email address. The
                link expires in 24 hours.
              </p>
              {formError && <p className="modal-error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSendResetLink}
                  disabled={saving}
                >
                  {saving ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── UserActions sub-component ───────────────────────────────────────────────

function UserActions({
  u,
  onEdit,
  onViewPets,
  onToggleActive,
  onDelete,
  onRestore,
  onResetPw,
  onVerify,
}) {
  const isDeleted = Boolean(u.deletedAt);
  return (
    <div className="action-btns">
      {u.role === "pet_owner" && !u.isVerified && !isDeleted && (
        <button
          className="verify-btn icon-btn"
          onClick={() => onVerify(u)}
          title="Verify user"
          aria-label="Verify user"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 12l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {u.role === "pet_owner" && !isDeleted && (
        <button
          className="edit-btn icon-btn"
          onClick={() => onViewPets(u)}
          title="View pets"
          aria-label="View pets"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      )}

      {!isDeleted && (
        <>
          <button
            className="edit-btn icon-btn"
            onClick={() => onEdit(u)}
            title="Edit user"
            aria-label="Edit user"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            className={`icon-btn ${u.isActive ? "suspend-btn" : "activate-btn"}`}
            onClick={() => onToggleActive(u)}
            title={u.isActive ? "Suspend" : "Activate"}
            aria-label={u.isActive ? "Suspend" : "Activate"}
          >
            {u.isActive ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M10 9v6M14 9v6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M10 8l6 4-6 4V8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            className="icon-btn"
            onClick={() => onResetPw(u)}
            title="Reset password"
            aria-label="Reset password"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3a9 9 0 1 0 9 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M15 3h6v6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="8"
                y="11"
                width="8"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 11V9a2 2 0 0 1 4 0"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>

          <button
            className="delete-btn icon-btn"
            onClick={() => onDelete(u)}
            title="Delete user"
            aria-label="Delete user"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {isDeleted && (
        <button
          className="restore-btn icon-btn"
          onClick={() => onRestore(u)}
          title="Restore user"
          aria-label="Restore user"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 12a9 9 0 1 0 9-9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M3 3v6h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default AdminUserManagement;
