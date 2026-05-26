import { useEffect, useState, useCallback } from "react";
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
  createPet,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const LIMIT = 10;

function accountStatus(u) {
  if (u.deletedAt) return { label: "Deleted", cls: "status-deleted" };
  if (!u.isActive) return { label: "Suspended", cls: "status-suspended" };
  if (!u.isVerified)
    return {
      label: "Pending Verification",
      cls: "status-pending-verification",
    };
  return { label: "Active", cls: "status-active" };
}

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  address: "",
  password: "",
};

const emptyPetForm = {
  name: "",
  species: "",
  breed: "",
  sex: "",
  age: "",
  birthday: "",
  weight: "",
};

const StaffUserManagement = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  // ── List state ──────────────────────────────────────────────
  const [userPage, setUserPage] = useState({ users: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // ── User modal state ────────────────────────────────────────
  const [modalMode, setModalMode] = useState(null); // view | add | edit
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  // ── Post-creation pet flow ──────────────────────────────────
  const [createdUser, setCreatedUser] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [petSaving, setPetSaving] = useState(false);
  const [petError, setPetError] = useState("");

  // ── Data loading ────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const r = await getStaffClients({
        page,
        limit: LIMIT,
        q: search.trim() || undefined,
      });
      const data = r.data;
      setUserPage(
        data && Array.isArray(data.users)
          ? data
          : { users: Array.isArray(data) ? data : [], total: 0, pages: 1 },
      );
    } catch {
      setUserPage({ users: [], total: 0, pages: 1 });
    }
  }, [page, search]);

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Reset to page 1 when search changes
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // ── Modal helpers ────────────────────────────────────────────
  const openAdd = () => {
    setError("");
    setSelectedUser(null);
    setForm(emptyForm);
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
      address: u.address || "",
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

  // ── Submit user form ────────────────────────────────────────
  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (modalMode === "add") {
        const result = await createStaffClient({ ...form, role: "pet_owner" });
        closeModal();
        await loadUsers();
        setCreatedUser(result.data);
      } else if (modalMode === "edit" && selectedUser) {
        const payload = { ...form, role: "pet_owner" };
        if (!payload.password) delete payload.password;
        await updateStaffClient(selectedUser.id, payload);
        closeModal();
        await loadUsers();
      }
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
      /* ignore */
    }
  };

  // ── Pet modal helpers ────────────────────────────────────────
  const openPetModal = () => {
    setPetForm(emptyPetForm);
    setPetError("");
    setShowPetModal(true);
  };

  const closePetModal = () => {
    setShowPetModal(false);
    setCreatedUser(null);
    setPetError("");
  };

  const onPetChange = (e) => {
    const { name, value } = e.target;
    setPetForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPet = async (e) => {
    e.preventDefault();
    setPetError("");
    setPetSaving(true);
    try {
      await createPet({
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed || undefined,
        gender: petForm.sex || undefined,
        age: petForm.age ? parseInt(petForm.age, 10) : undefined,
        birthday: petForm.birthday || undefined,
        weight: petForm.weight ? parseFloat(petForm.weight) : undefined,
        ownerId: createdUser.id,
      });
      closePetModal();
    } catch (err) {
      setPetError(
        err.response?.data?.message || "Failed to create pet profile",
      );
    } finally {
      setPetSaving(false);
    }
  };

  // ── Shared icon components ──────────────────────────────────
  const viewPetsIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8 2 5 5.5 5 9c0 2.5 1.5 4.5 3 6l4 5 4-5c1.5-1.5 3-3.5 3-6 0-3.5-3-7-7-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
  const viewIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
  const editIcon = (
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
  );
  const deactivateIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const activateIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  );

  const displayUsers = Array.isArray(userPage.users) ? userPage.users : [];

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
          {/* Post-creation prompt */}
          {createdUser && !showPetModal && (
            <div className="new-client-prompt">
              <p>
                Client{" "}
                <strong>{createdUser.firstName || createdUser.username}</strong>{" "}
                created successfully. Would you like to add a pet profile now?
              </p>
              <div className="new-client-prompt-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setCreatedUser(null)}
                >
                  Skip
                </button>
                <button className="save-btn" onClick={openPetModal}>
                  Add Pet
                </button>
              </div>
            </div>
          )}

          <div className="user-mgmt-header">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="user-search"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <button className="add-user-btn" onClick={openAdd}>
              + Add New Client
            </button>
          </div>

          {/* Desktop table */}
          <div className="user-table-card table-desktop">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Contact Info</th>
                  <th>Address</th>
                  <th>Registered Pets</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "24px",
                      }}
                    >
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  displayUsers.map((u) => {
                    const st = accountStatus(u);
                    return (
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
                        <td
                          style={{
                            fontSize: "13px",
                            color: "#555",
                            maxWidth: "160px",
                          }}
                        >
                          {u.address || "—"}
                        </td>
                        <td>{u._count?.pets ?? 0} Pet(s)</td>
                        <td>
                          <span className={`user-status ${st.cls}`}>
                            {st.label}
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
                              {viewPetsIcon}
                            </button>
                            <button
                              className="btn-view icon-btn"
                              onClick={() => openView(u)}
                              title="View user"
                              aria-label="View user"
                            >
                              {viewIcon}
                            </button>
                            <button
                              className="btn-edit icon-btn"
                              onClick={() => openEdit(u)}
                              title="Edit user"
                              aria-label="Edit user"
                            >
                              {editIcon}
                            </button>
                            {!u.deletedAt && (
                              <button
                                className={`${u.isActive ? "btn-remove" : "btn-edit"} icon-btn`}
                                onClick={() => toggleStatus(u)}
                                title={
                                  u.isActive
                                    ? "Suspend client"
                                    : "Activate client"
                                }
                                aria-label={
                                  u.isActive
                                    ? "Suspend client"
                                    : "Activate client"
                                }
                              >
                                {u.isActive ? deactivateIcon : activateIcon}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="table-mobile table-cards-list">
            {displayUsers.map((u) => {
              const st = accountStatus(u);
              return (
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
                      <span className="user-card-label">Address</span>
                      <span>{u.address || "—"}</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Pets</span>
                      <span>{u._count?.pets ?? 0} Pet(s)</span>
                    </div>
                    <div className="user-card-row">
                      <span className="user-card-label">Status</span>
                      <span className={`user-status ${st.cls}`}>
                        {st.label}
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
                          {viewPetsIcon}
                        </button>
                        <button
                          className="btn-view icon-btn"
                          onClick={() => openView(u)}
                          title="View user"
                          aria-label="View user"
                        >
                          {viewIcon}
                        </button>
                        <button
                          className="btn-edit icon-btn"
                          onClick={() => openEdit(u)}
                          title="Edit user"
                          aria-label="Edit user"
                        >
                          {editIcon}
                        </button>
                        {!u.deletedAt && (
                          <button
                            className={`${u.isActive ? "btn-remove" : "btn-edit"} icon-btn`}
                            onClick={() => toggleStatus(u)}
                            title={
                              u.isActive ? "Suspend client" : "Activate client"
                            }
                            aria-label={
                              u.isActive ? "Suspend client" : "Activate client"
                            }
                          >
                            {u.isActive ? deactivateIcon : activateIcon}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {userPage.pages > 1 && (
            <div className="pagination-row">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span>
                Page {page} of {userPage.pages} ({userPage.total} client
                {userPage.total !== 1 ? "s" : ""})
              </span>
              <button
                disabled={page === userPage.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── User modal (view / add / edit) ── */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {modalMode === "view" && selectedUser ? (
              <>
                <h3>Client Details</h3>
                {(() => {
                  const st = accountStatus(selectedUser);
                  return (
                    <>
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
                        <strong>Phone:</strong> {selectedUser.phone || "—"}
                      </p>
                      <p>
                        <strong>Address:</strong> {selectedUser.address || "—"}
                      </p>
                      <p>
                        <strong>Pets:</strong> {selectedUser._count?.pets ?? 0}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className={`user-status ${st.cls}`}>
                          {st.label}
                        </span>
                      </p>
                    </>
                  );
                })()}
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
                  <label>
                    Username <span style={{ color: "#e53e3e" }}>*</span>
                  </label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Email <span style={{ color: "#e53e3e" }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number (11 digits)</label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: "8px", fontWeight: "500" }}>
                      +63
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone?.replace(/^63/, "") || ""}
                      placeholder="9XXXXXXXXX"
                      maxLength="11"
                      style={{ flex: 1 }}
                      onChange={(e) => {
                        const numOnly = e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 10);
                        const fullPhone = numOnly ? `63${numOnly}` : "";
                        setForm((prev) => ({ ...prev, phone: fullPhone }));
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    maxLength={50}
                    placeholder="Street, Barangay, City"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Password
                    {modalMode === "edit" ? " (leave blank to keep)" : " *"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    required={modalMode === "add"}
                    autoComplete="new-password"
                  />
                  <small className="field-hint">
                    Min 8 chars, include a letter, number, and special character
                    (@$!%*#?&amp;)
                  </small>
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

      {/* ── Pet creation modal ── */}
      {showPetModal && createdUser && (
        <div className="modal-overlay" onClick={closePetModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitPet} className="user-modal-form">
              <h3>Add Pet Profile</h3>
              <p
                style={{
                  color: "#666",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                For client:{" "}
                <strong>{createdUser.firstName || createdUser.username}</strong>
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Pet Name <span style={{ color: "#e53e3e" }}>*</span>
                  </label>
                  <input
                    name="name"
                    value={petForm.name}
                    onChange={onPetChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Species <span style={{ color: "#e53e3e" }}>*</span>
                  </label>
                  <input
                    name="species"
                    value={petForm.species}
                    onChange={onPetChange}
                    placeholder="Dog, Cat…"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Breed</label>
                <input
                  name="breed"
                  value={petForm.breed}
                  onChange={onPetChange}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Sex</label>
                  <select name="sex" value={petForm.sex} onChange={onPetChange}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Age (years)</label>
                  <input
                    type="number"
                    name="age"
                    value={petForm.age}
                    onChange={onPetChange}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Birthday</label>
                  <input
                    type="date"
                    name="birthday"
                    value={petForm.birthday}
                    onChange={onPetChange}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={petForm.weight}
                    onChange={onPetChange}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              {petError && <p className="modal-error">{petError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closePetModal}
                >
                  Skip
                </button>
                <button type="submit" className="save-btn" disabled={petSaving}>
                  {petSaving ? "Saving..." : "Save Pet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffUserManagement;
