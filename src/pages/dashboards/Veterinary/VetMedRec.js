import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetMedRec.css";
import "../../../css/responsive-tables.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecords,
  getMedicalRecordAiInsight,
  getPets,
  restoreMedicalRecord,
  updateMedicalRecord,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const VetMedRec = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");
  const [includeArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiModal, setAiModal] = useState(null); // { record, insight, loading, error }
  const [form, setForm] = useState({
    petId: "",
    appointmentId: "",
    diagnosis: "",
    treatment: "",
    prescription: "",
    notes: "",
    status: "Finalized",
    followUpDate: "",
  });

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [recordRes, petRes] = await Promise.all([
        getMedicalRecords({ includeArchived }),
        getPets(),
      ]);
      setRecords(recordRes.data || []);
      setPets(petRes.data || []);
    } catch {
      setError("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    const q = search.toLowerCase();
    const petName = rec.pet?.name?.toLowerCase() || "";
    return (
      petName.includes(q) ||
      (rec.id || "").toLowerCase().includes(q) ||
      (rec.diagnosis || "").toLowerCase().includes(q)
    );
  });

  const toggleArchive = async (record) => {
    try {
      if (record.isArchived) {
        await restoreMedicalRecord(record.id);
      } else {
        await deleteMedicalRecord(record.id);
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update record status");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      petId: pets[0]?.id || "",
      appointmentId: "",
      diagnosis: "",
      treatment: "",
      prescription: "",
      notes: "",
      status: "Finalized",
      followUpDate: "",
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      petId: record.petId,
      appointmentId: record.appointmentId || "",
      diagnosis: record.diagnosis || "",
      treatment: record.treatment || "",
      prescription: record.prescription || "",
      notes: record.notes || "",
      status: record.status || "Finalized",
      followUpDate: record.followUpDate
        ? new Date(record.followUpDate).toISOString().slice(0, 10)
        : "",
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSaving(false);
  };

  const openAiInsight = async (record, refresh = false) => {
    setAiModal({ record, insight: null, loading: true, error: "" });
    try {
      const res = await getMedicalRecordAiInsight(record.id, refresh);
      setAiModal({ record, loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || "Failed to generate AI insight",
      }));
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    if (!form.petId || !form.diagnosis) {
      setError("Pet and diagnosis are required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        followUpDate: form.followUpDate || null,
      };
      if (editing) {
        await updateMedicalRecord(editing.id, payload);
        setSuccess("Medical record updated successfully.");
      } else {
        const response = await createMedicalRecord(payload);
        if (response?.data?.autoLinkedAppointment) {
          setSuccess(
            `Medical record created. Auto-linked to appointment ${response.data.linkedAppointmentId}.`,
          );
        } else {
          setSuccess("Medical record created successfully.");
        }
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save medical record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <VetSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN CONTENT */}
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
          <h2>Clinical Medical Records</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/vet-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/vet-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="records-list-card">
            <div className="records-filters">
              <input
                type="text"
                placeholder="Search by Patient ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {/* <label className="archived-filter-toggle">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Show archived
              </label> */}
              <button className="new-entry-btn" onClick={openCreate}>
                New Entry
              </button>
            </div>

            <div className="table-desktop">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="record-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </td>
                      <td>
                        {rec.pet?.name} <br />
                        <small className="species-meta">
                          {rec.pet?.species || ""}
                        </small>
                      </td>
                      <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td>{rec.diagnosis}</td>
                      <td>
                        <span
                          className={`status-pill ${rec.status?.toLowerCase()}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="row-btn icon-btn row-btn-ai"
                            onClick={() => openAiInsight(rec)}
                            title="AI Health Insight"
                            aria-label="AI Health Insight"
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
                            className="row-btn icon-btn"
                            onClick={() => openEdit(rec)}
                            title="Edit record"
                            aria-label="Edit record"
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
                            className="row-btn row-btn-danger icon-btn"
                            onClick={() => toggleArchive(rec)}
                            title={
                              rec.isArchived
                                ? "Restore record"
                                : "Archive record"
                            }
                            aria-label={
                              rec.isArchived
                                ? "Restore record"
                                : "Archive record"
                            }
                          >
                            {rec.isArchived ? (
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

            <div className="table-mobile table-cards-list">
              {filteredRecords.map((rec) => (
                <div className="record-card" key={rec.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">
                      <div className="record-card-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </div>
                      <div className="record-card-patient">
                        {rec.pet?.name} ({rec.pet?.species || "N/A"})
                      </div>
                    </div>
                    <span
                      className={`status-pill ${rec.status?.toLowerCase()}`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="record-card-body">
                    <div className="record-card-row">
                      <span className="record-card-label">Date</span>
                      <span>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Diagnosis</span>
                      <span className="record-card-diagnosis">
                        {rec.diagnosis}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Actions</span>
                      <div className="row-actions">
                        <button
                          className="row-btn icon-btn row-btn-ai"
                          onClick={() => openAiInsight(rec)}
                          title="AI Health Insight"
                          aria-label="AI Health Insight"
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
                          className="row-btn icon-btn"
                          onClick={() => openEdit(rec)}
                          title="Edit record"
                          aria-label="Edit record"
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
                          className="row-btn row-btn-danger icon-btn"
                          onClick={() => toggleArchive(rec)}
                          title={
                            rec.isArchived ? "Restore record" : "Archive record"
                          }
                          aria-label={
                            rec.isArchived ? "Restore record" : "Archive record"
                          }
                        >
                          {rec.isArchived ? (
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

            {loading && (
              <p className="list-feedback">Loading medical records...</p>
            )}
            {!loading && success && (
              <p className="list-feedback" style={{ color: "#166534" }}>
                {success}
              </p>
            )}
            {!loading && !filteredRecords.length && (
              <p className="list-feedback">No medical records found.</p>
            )}
            {error && <p className="list-error">{error}</p>}
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitRecord}>
              <h3>{editing ? "Edit Medical Record" : "New Medical Record"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Pet</label>
                  <select
                    name="petId"
                    value={form.petId}
                    onChange={onChange}
                    required
                    disabled={Boolean(editing)}
                  >
                    <option value="">Select pet</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={onChange}>
                    <option value="Finalized">Finalized</option>
                    <option value="FollowUp">FollowUp</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Diagnosis</label>
                <input
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Treatment</label>
                  <input
                    name="treatment"
                    value={form.treatment}
                    onChange={onChange}
                  />
                </div>
                <div className="form-group">
                  <label>Prescription</label>
                  <input
                    name="prescription"
                    value={form.prescription}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Appointment ID (optional)</label>
                  <input
                    name="appointmentId"
                    value={form.appointmentId}
                    onChange={onChange}
                  />
                </div>
                <div className="form-group">
                  <label>Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={form.followUpDate}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={form.notes} onChange={onChange} />
              </div>

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
                  {new Date(aiModal.generatedAt).toLocaleString()}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {!aiModal.loading && aiModal.insight && (
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

export default VetMedRec;
