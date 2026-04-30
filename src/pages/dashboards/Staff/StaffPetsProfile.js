import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffPetsProfile.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getPets,
  createPet,
  updatePet,
  deletePet,
  restorePet,
  getStaffClients,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffPetsProfile = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    age: "",
    gender: "",
    status: "Healthy",
    notes: "",
    ownerId: "",
  });

  const loadPets = () =>
    getPets()
      .then((r) => setPets(r.data))
      .catch(() => setPets([]));

  const loadOwners = () =>
    getStaffClients()
      .then((r) => setOwners(r.data.filter((o) => o.isActive)))
      .catch(() => setOwners([]));

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadPets();
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPets = pets.filter((pet) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const ownerName = pet.owner
      ? `${pet.owner.firstName || ""} ${pet.owner.lastName || ""} ${pet.owner.username || ""}`
      : "";
    return (
      (pet.name || "").toLowerCase().includes(q) ||
      (pet.breed || "").toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setError("");
    setSelectedPet(null);
    setForm({
      name: "",
      species: "",
      breed: "",
      age: "",
      gender: "",
      status: "Healthy",
      notes: "",
      ownerId: owners[0]?.id || "",
    });
    setModalMode("create");
  };

  const openEdit = (pet) => {
    setError("");
    setSelectedPet(pet);
    setForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      age: pet.age ?? "",
      gender: pet.gender || "",
      status: pet.status || "Healthy",
      notes: pet.notes || "",
      ownerId: pet.ownerId || "",
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedPet(null);
    setError("");
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPet = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        age: form.age === "" ? null : Number(form.age),
      };

      if (modalMode === "create") {
        await createPet(payload);
      } else if (modalMode === "edit" && selectedPet) {
        await updatePet(selectedPet.id, payload);
      }

      closeModal();
      await loadPets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pet");
    } finally {
      setSaving(false);
    }
  };

  const archiveToggle = async (pet) => {
    try {
      if (pet.isArchived) await restorePet(pet.id);
      else await deletePet(pet.id);
      await loadPets();
    } catch {
      setError("Failed to update pet status");
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
          <h2>Pets Profile</h2>
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
          <div className="pets-mgmt-header">
            <div className="pet-search-bar">
              <input
                type="text"
                placeholder="Search by pet name, breed, or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="add-pet-btn" onClick={openCreate}>
              + Register Pet
            </button>
          </div>

          {/* Desktop table & Mobile cards */}
          <>
            {/* Desktop Table */}
            <div className="pets-table-card table-desktop">
              <table className="pets-table">
                <thead>
                  <tr>
                    <th>Pet Name</th>
                    <th>Owner</th>
                    <th>Breed</th>
                    <th>Gender / Age</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPets.map((pet) => (
                    <tr key={pet.id}>
                      <td>
                        <div className="pet-name-cell">
                          <div className="pet-avatar-placeholder">
                            {pet.name?.charAt(0) || "?"}
                          </div>
                          <span>{pet.name}</span>
                        </div>
                      </td>
                      <td>
                        {pet.owner
                          ? `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() ||
                            pet.owner.username
                          : "—"}
                      </td>
                      <td>{pet.breed || "—"}</td>
                      <td>
                        {pet.gender || "—"}
                        {pet.age !== null && pet.age !== undefined
                          ? ` / ${pet.age} yr(s)`
                          : ""}
                      </td>
                      <td>
                        <span
                          className={`pet-status-tag ${pet.status?.toLowerCase().replace(/ /g, "-")}`}
                        >
                          {pet.status}
                        </span>
                      </td>
                      <td>
                        <div className="pet-action-btns">
                          <button
                            className="btn-view-records icon-btn"
                            onClick={() =>
                              navigate(`/staff-medical-records?petId=${pet.id}`)
                            }
                            title="View records"
                            aria-label="View records"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M7 4h8l4 4v12H7z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M15 4v4h4M10 12h6M10 16h6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="btn-edit-pet icon-btn"
                            onClick={() => openEdit(pet)}
                            title="Edit pet"
                            aria-label="Edit pet"
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
                            className="btn-remove-pet icon-btn"
                            onClick={() => archiveToggle(pet)}
                            title={
                              pet.isArchived ? "Restore pet" : "Archive pet"
                            }
                            aria-label={
                              pet.isArchived ? "Restore pet" : "Archive pet"
                            }
                          >
                            {pet.isArchived ? (
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
                            ) : (
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
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile table-cards-list">
              {filteredPets.map((pet) => (
                <div className="pets-card" key={pet.id}>
                  <div className="pets-card-header">
                    <div className="pets-card-avatar">
                      {pet.name?.charAt(0) || "?"}
                    </div>
                    <div className="pets-card-name">{pet.name}</div>
                  </div>
                  <div className="pets-card-body">
                    <div className="pets-card-row">
                      <span className="pets-card-label">Owner</span>
                      <span>
                        {pet.owner
                          ? `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() ||
                            pet.owner.username
                          : "—"}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Breed</span>
                      <span>{pet.breed || "—"}</span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Gender / Age</span>
                      <span>
                        {pet.gender || "—"}
                        {pet.age !== null && pet.age !== undefined
                          ? ` / ${pet.age} yr(s)`
                          : ""}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Status</span>
                      <span
                        className={`pet-status-tag ${pet.status?.toLowerCase().replace(/ /g, "-")}`}
                      >
                        {pet.status}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Actions</span>
                      <div className="pet-action-btns">
                        <button
                          className="btn-view-records icon-btn"
                          onClick={() =>
                            navigate(`/staff-medical-records?petId=${pet.id}`)
                          }
                          title="View records"
                          aria-label="View records"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M7 4h8l4 4v12H7z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15 4v4h4M10 12h6M10 16h6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-edit-pet icon-btn"
                          onClick={() => openEdit(pet)}
                          title="Edit pet"
                          aria-label="Edit pet"
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
                          className="btn-remove-pet icon-btn"
                          onClick={() => archiveToggle(pet)}
                          title={pet.isArchived ? "Restore pet" : "Archive pet"}
                          aria-label={
                            pet.isArchived ? "Restore pet" : "Archive pet"
                          }
                        >
                          {pet.isArchived ? (
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
                          ) : (
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
            <form onSubmit={submitPet} className="user-modal-form">
              <h3>{modalMode === "create" ? "Register Pet" : "Edit Pet"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Species</label>
                  <input
                    name="species"
                    value={form.species}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input name="breed" value={form.breed} onChange={onChange} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={onChange}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={onChange}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={onChange}>
                    <option value="Healthy">Healthy</option>
                    <option value="UnderTreatment">Under Treatment</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Owner</label>
                <select
                  name="ownerId"
                  value={form.ownerId}
                  onChange={onChange}
                  required
                  disabled={modalMode === "edit"}
                >
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.firstName || owner.username} {owner.lastName || ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input name="notes" value={form.notes} onChange={onChange} />
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
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPetsProfile;
