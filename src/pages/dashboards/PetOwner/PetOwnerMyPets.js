import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerMyPets.css";
import "../../../css/responsive-tables.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createPet,
  deletePet,
  getPets,
  updatePet,
  getMedicalRecords,
  getMedicalRecordAiInsight,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const emptyForm = {
  name: "",
  species: "Dog",
  breed: "",
  age: "",
  gender: "",
  status: "Healthy",
  notes: "",
};

const PetOwnerMyPets = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiModal, setAiModal] = useState(null); // { record, insight, loading, error }

  const filtered = pets.filter((p) =>
    (p.name + " " + p.species + " " + (p.breed || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    loadPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPets = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await getPets();
      setPets(r.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pets");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (pet) => {
    setEditing(pet);
    setForm({
      name: pet.name || "",
      species: pet.species || "Dog",
      breed: pet.breed || "",
      age: pet.age?.toString() || "",
      gender: pet.gender || "",
      status: pet.status || "Healthy",
      notes: pet.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const submitPet = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.species.trim()) {
      setError("Name and species are required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        species: form.species.trim(),
        breed: form.breed || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        notes: form.notes || null,
      };

      if (editing) {
        await updatePet(editing.id, payload);
      } else {
        await createPet(payload);
      }

      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      await loadPets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pet");
    } finally {
      setSaving(false);
    }
  };

  const archivePet = async (pet) => {
    if (!window.confirm(`Archive ${pet.name}?`)) return;
    try {
      await deletePet(pet.id);
      await loadPets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to archive pet");
    }
  };

  const openAiInsight = async (petOrRecord, refresh = false) => {
    setAiModal({
      record: petOrRecord?.petId ? petOrRecord : null,
      insight: null,
      loading: true,
      error: "",
    });
    try {
      let record = petOrRecord?.petId ? petOrRecord : null;

      if (!record) {
        // Request latest record for this pet from server (API filters by owner)
        const res = await getMedicalRecords({
          petId: petOrRecord.id,
          limit: 1,
        });
        const recs = res.data || [];
        if (!recs.length) {
          setAiModal({
            loading: false,
            error: "No medical records found for this pet.",
          });
          return;
        }
        record = recs[0];
      }

      // Request AI insight for the record
      const insightRes = await getMedicalRecordAiInsight(record.id, refresh);
      setAiModal({ record, loading: false, error: "", ...insightRes.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || "Failed to generate AI insight",
      }));
    }
  };

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
          <h2>My Pets</h2>
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
          <div className="pets-management-card">
            <div className="table-header-actions">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search pets by name or species..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="add-user-btn" onClick={openCreate}>
                + Add New Pet
              </button>
            </div>

            {error && <p className="pets-error">{error}</p>}

            {/* Desktop Table */}
            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Species / Breed</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", color: "#888" }}
                      >
                        Loading pets...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", color: "#888" }}
                      >
                        No pets found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((pet) => (
                      <tr key={pet.id}>
                        <td className="user-name-cell">
                          <div className="user-avatar-small">
                            {pet.name.charAt(0)}
                          </div>
                          <span>{pet.name}</span>
                        </td>
                        <td>
                          {pet.species}
                          {pet.breed ? ` — ${pet.breed}` : ""}
                        </td>
                        <td>{pet.age ? `${pet.age} yr(s)` : "—"}</td>
                        <td>{pet.gender || "—"}</td>
                        <td>
                          <span
                            className={`status-pill ${pet.status === "Healthy" ? "active" : "inactive"}`}
                          >
                            {pet.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="ai-insight-btn icon-btn"
                              title="AI Insight"
                              aria-label="AI Insight"
                              onClick={() => openAiInsight(pet)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              className="edit-btn icon-btn"
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
                              className="delete-btn icon-btn"
                              onClick={() => archivePet(pet)}
                              title="Archive pet"
                              aria-label="Archive pet"
                            >
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
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p style={{ textAlign: "center", color: "#888" }}>
                  Loading pets...
                </p>
              ) : filtered.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888" }}>
                  No pets found. Add one to get started.
                </p>
              ) : (
                filtered.map((pet) => (
                  <div className="pets-card" key={pet.id}>
                    <div className="pets-card-header">
                      <div className="pets-card-avatar">
                        {pet.name?.charAt(0) || "?"}
                      </div>
                      <div className="pets-card-name">{pet.name}</div>
                    </div>
                    <div className="pets-card-body">
                      <div className="pets-card-row">
                        <span className="pets-card-label">Species / Breed</span>
                        <span>
                          {pet.species}
                          {pet.breed ? ` — ${pet.breed}` : ""}
                        </span>
                      </div>
                      <div className="pets-card-row">
                        <span className="pets-card-label">Age</span>
                        <span>{pet.age ? `${pet.age} yr(s)` : "—"}</span>
                      </div>
                      <div className="pets-card-row">
                        <span className="pets-card-label">Gender</span>
                        <span>{pet.gender || "—"}</span>
                      </div>
                      <div className="pets-card-row">
                        <span className="pets-card-label">Status</span>
                        <span
                          className={`status-pill ${pet.status === "Healthy" ? "active" : "inactive"}`}
                        >
                          {pet.status}
                        </span>
                      </div>
                      <div className="pets-card-row">
                        <span className="pets-card-label">Actions</span>
                        <div className="action-btns">
                          <button
                            className="ai-insight-btn icon-btn"
                            title="AI Insight"
                            aria-label="AI Insight"
                            onClick={() => openAiInsight(pet)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="edit-btn icon-btn"
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
                            className="delete-btn icon-btn"
                            onClick={() => archivePet(pet)}
                            title="Archive pet"
                            aria-label="Archive pet"
                          >
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
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit Pet" : "Add New Pet"}</h3>

            <form onSubmit={submitPet} className="user-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    placeholder="Pet name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Species *</label>
                  <input
                    placeholder="e.g. Dog, Cat"
                    value={form.species}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, species: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    placeholder="Breed"
                    value={form.breed}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, breed: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Age"
                    value={form.age}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, age: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gender: e.target.value }))
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, status: e.target.value }))
                    }
                    required
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
                  rows={3}
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Pet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aiModal && (
        <div className="modal-overlay" onClick={() => setAiModal(null)}>
          <div
            className="modal-box ai-insight-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-insight-header">
              <div className="ai-generated-badge">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  width="14"
                  height="14"
                >
                  <path
                    d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                AI Generated
              </div>
              <h3>Health Insight — {aiModal.record?.pet?.name}</h3>
              <p className="ai-insight-subheading">
                {aiModal.record?.diagnosis}
              </p>
              <p className="ai-insight-subheading">
                Analyzed from full medical history across all records.
              </p>
            </div>

            {aiModal.loading && (
              <div className="ai-insight-loading">
                <div className="ai-loading-spinner" />
                <span>Generating health insight...</span>
              </div>
            )}

            {aiModal.error && (
              <p className="ai-insight-error">{aiModal.error}</p>
            )}

            {!aiModal.loading && aiModal.insight && (
              <div className="ai-insight-body">
                <div className="ai-insight-content">
                  {aiModal.insight
                    .split("\n")
                    .map((line, i) =>
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />,
                    )}
                </div>
                <div className="ai-disclaimer">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    width="14"
                    height="14"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 8v4m0 4h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {aiModal.disclaimer}
                </div>
                <div className="ai-meta">
                  {aiModal.fromCache
                    ? "Cached insight · "
                    : "Freshly generated · "}
                  {aiModal.aiModel} &middot;{" "}
                  {aiModal.generatedAt
                    ? new Date(aiModal.generatedAt).toLocaleString()
                    : ""}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {!aiModal.loading &&
                aiModal.insight &&
                user &&
                (user.role === "veterinarian" ||
                  user.role === "staff" ||
                  user.role === "admin") && (
                  <button
                    className="cancel-btn"
                    onClick={() => openAiInsight(aiModal.record, true)}
                  >
                    Refresh
                  </button>
                )}
              <button className="save-btn" onClick={() => setAiModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerMyPets;
