import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getPets,
  createPet,
  updatePet,
  deletePet,
  restorePet,
} from "../../../api/api";
import "../../../css/OwnerPets.css";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const EMPTY_PET_FORM = {
  name: "",
  species: "",
  breed: "",
  gender: "",
  age: "",
  birthday: "",
  weight: "",
  status: "Healthy",
  notes: "",
};

const statusClass = (s) => (s || "").toLowerCase().replace(/\s+/g, "");

const AdminOwnerPets = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const owner = location.state?.owner || null;

  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  // modals
  const [modalMode, setModalMode] = useState(null); // "add" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_PET_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(() => {
    setLoading(true);
    getPets({ ownerId: id })
      .then((r) => setPets(Array.isArray(r.data) ? r.data : r.data.pets || []))
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/login");
      return;
    }
    loadPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPets]);

  const ownerName = owner
    ? owner.firstName
      ? `${owner.firstName} ${owner.lastName || ""}`.trim()
      : owner.username
    : "Pet Owner";

  const visiblePets = pets.filter((p) => {
    if (!showArchived && p.isArchived) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.species || "").toLowerCase().includes(q) ||
      (p.breed || "").toLowerCase().includes(q)
    );
  });

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm({ ...EMPTY_PET_FORM, ownerId: id });
    setFormError("");
    setEditTarget(null);
    setModalMode("add");
  };

  const openEdit = (pet) => {
    setForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      gender: pet.gender || "",
      age: pet.age !== null && pet.age !== undefined ? String(pet.age) : "",
      birthday: pet.birthday ? pet.birthday.split("T")[0] : "",
      weight:
        pet.weight !== null && pet.weight !== undefined
          ? String(pet.weight)
          : "",
      status: pet.status || "Healthy",
      notes: pet.notes || "",
    });
    setFormError("");
    setEditTarget(pet);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
  };

  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = { ...form, ownerId: id };
      if (!payload.age) delete payload.age;
      if (!payload.birthday) delete payload.birthday;
      if (!payload.weight) delete payload.weight;
      if (modalMode === "add") {
        await createPet(payload);
      } else {
        await updatePet(editTarget.id, payload);
      }
      closeModal();
      loadPets();
    } catch (err) {
      setFormError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (pet) => {
    if (!window.confirm(`Archive ${pet.name}?`)) return;
    try {
      await deletePet(pet.id);
      loadPets();
    } catch {}
  };

  const handleRestore = async (pet) => {
    if (!window.confirm(`Restore ${pet.name}?`)) return;
    try {
      await restorePet(pet.id);
      loadPets();
    } catch {}
  };

  // ── render ─────────────────────────────────────────────────────────────────

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
          <h2>Client Pets</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin Profile"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {/* Owner info card */}
          <div className="owner-header-card">
            <div className="owner-avatar-lg">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="owner-header-info">
              <h3>{ownerName}</h3>
              <div className="owner-header-meta">
                {owner?.email && <span>{owner.email}</span>}
                {owner?.username && <span>@{owner.username}</span>}
                <span>
                  {pets.filter((p) => !p.isArchived).length} Active Pet(s)
                </span>
              </div>
            </div>
          </div>

          {/* toolbar */}
          <div className="owner-pets-header">
            <button
              className="back-btn"
              onClick={() => navigate("/admin-users")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Users
            </button>
            <h3>Registered Pets</h3>
          </div>

          <div className="owner-pets-toolbar">
            <div className="owner-pets-search">
              <input
                type="text"
                placeholder="Search by name, species, or breed..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="show-deleted-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show Archived
            </label>
            <button className="add-user-btn" onClick={openAdd}>
              + Add Pet
            </button>
          </div>

          {loading ? (
            <div className="op-loading">Loading pets…</div>
          ) : visiblePets.length === 0 ? (
            <div className="op-empty-state">
              <p>
                {search ? "No pets match your search." : "No pets to display."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="owner-pets-table-card op-desktop-only">
                <table className="owner-pets-table">
                  <thead>
                    <tr>
                      <th>Pet Name</th>
                      <th>Species</th>
                      <th>Breed</th>
                      <th>Gender / Age</th>
                      <th>Weight</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePets.map((pet) => (
                      <tr
                        key={pet.id}
                        className={pet.isArchived ? "row-deleted" : ""}
                      >
                        <td>
                          <div className="op-pet-name-cell">
                            <div className="op-pet-avatar">
                              {pet.image ? (
                                <img src={pet.image} alt={pet.name} />
                              ) : (
                                (pet.name || "?").charAt(0).toUpperCase()
                              )}
                            </div>
                            <span>{pet.name}</span>
                          </div>
                        </td>
                        <td>{pet.species || "—"}</td>
                        <td>{pet.breed || "—"}</td>
                        <td>
                          {pet.gender || "—"}
                          {pet.age != null ? ` / ${pet.age} yr(s)` : ""}
                        </td>
                        <td>{pet.weight != null ? `${pet.weight} kg` : "—"}</td>
                        <td>
                          <span
                            className={`op-status-tag ${statusClass(pet.status)}`}
                          >
                            {pet.status === "UnderTreatment"
                              ? "Under Treatment"
                              : pet.status || "—"}
                          </span>
                          {pet.isArchived && (
                            <span className="op-archived-tag">Archived</span>
                          )}
                        </td>
                        <td>{pet.notes || "—"}</td>
                        <td>
                          <PetActions
                            pet={pet}
                            onEdit={openEdit}
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="op-cards-list op-mobile-only">
                {visiblePets.map((pet) => (
                  <div
                    key={pet.id}
                    className={`op-pet-card${pet.isArchived ? " row-deleted" : ""}`}
                  >
                    <div className="op-pet-card-header">
                      <div className="op-pet-avatar">
                        {pet.image ? (
                          <img src={pet.image} alt={pet.name} />
                        ) : (
                          (pet.name || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="op-pet-card-title">
                        <span className="op-pet-card-name">{pet.name}</span>
                        <span
                          className={`op-status-tag ${statusClass(pet.status)}`}
                        >
                          {pet.status === "UnderTreatment"
                            ? "Under Treatment"
                            : pet.status || "—"}
                        </span>
                        {pet.isArchived && (
                          <span className="op-archived-tag">Archived</span>
                        )}
                      </div>
                    </div>
                    <div className="op-pet-card-body">
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Species</span>
                        <span>{pet.species || "—"}</span>
                      </div>
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Breed</span>
                        <span>{pet.breed || "—"}</span>
                      </div>
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Gender / Age</span>
                        <span>
                          {pet.gender || "—"}
                          {pet.age != null ? ` / ${pet.age} yr(s)` : ""}
                        </span>
                      </div>
                      {pet.weight != null && (
                        <div className="op-pet-card-row">
                          <span className="op-card-label">Weight</span>
                          <span>{pet.weight} kg</span>
                        </div>
                      )}
                      {pet.notes && (
                        <div className="op-pet-card-row">
                          <span className="op-card-label">Notes</span>
                          <span>{pet.notes}</span>
                        </div>
                      )}
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Actions</span>
                        <PetActions
                          pet={pet}
                          onEdit={openEdit}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Add / Edit Pet Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalMode === "add" ? "Add Pet" : `Edit — ${editTarget?.name}`}
            </h3>
            <form onSubmit={handleSubmit} className="user-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    placeholder="Pet name"
                  />
                </div>
                <div className="form-group">
                  <label>Species *</label>
                  <input
                    name="species"
                    value={form.species}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Dog, Cat"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    name="breed"
                    value={form.breed}
                    onChange={handleFormChange}
                    placeholder="Breed"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                  >
                    <option value="">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age (years)</label>
                  <input
                    name="age"
                    type="number"
                    min="0"
                    value={form.age}
                    onChange={handleFormChange}
                    placeholder="Age"
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    name="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.weight}
                    onChange={handleFormChange}
                    placeholder="Weight"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Birthday</label>
                  <input
                    name="birthday"
                    type="date"
                    value={form.birthday}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="UnderTreatment">Under Treatment</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

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
                      ? "Add Pet"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function PetActions({ pet, onEdit, onArchive, onRestore }) {
  return (
    <div className="action-btns">
      {!pet.isArchived && (
        <>
          <button
            className="edit-btn icon-btn"
            onClick={() => onEdit(pet)}
            title="Edit pet"
            aria-label="Edit pet"
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
            className="delete-btn icon-btn"
            onClick={() => onArchive(pet)}
            title="Archive pet"
            aria-label="Archive pet"
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
      {pet.isArchived && (
        <button
          className="restore-btn icon-btn"
          onClick={() => onRestore(pet)}
          title="Restore pet"
          aria-label="Restore pet"
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

export default AdminOwnerPets;
