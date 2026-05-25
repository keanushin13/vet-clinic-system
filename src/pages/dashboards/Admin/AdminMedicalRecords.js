import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
  restoreMedicalRecord,
} from "../../../api/api";
import "../../../css/AdminMedicalRecords.css";
import userIcon from "../../../assets/Profile.png";

const MODIFICATION_REASONS = [
  "Typographical Error",
  "Duplicate Entries",
  "Ownership Transfer",
  "Wrong Species",
];

const STATUS_COLORS = {
  Finalized: "status-active",
  FollowUp: "status-suspended",
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function AdminMedicalRecords() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Edit modal
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getMedicalRecords({
        includeArchived: showArchived ? "true" : undefined,
        limit: 200,
      });
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.diagnosis || "").toLowerCase().includes(q) ||
      (r.pet?.name || "").toLowerCase().includes(q) ||
      (r.vet?.firstName || "").toLowerCase().includes(q) ||
      (r.vet?.lastName || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const openEdit = (rec) => {
    setForm({
      diagnosis: rec.diagnosis || "",
      treatment: rec.treatment || "",
      prescription: rec.prescription || "",
      notes: rec.notes || "",
      status: rec.status || "Finalized",
      modificationReason: "",
    });
    setFormError("");
    setEditTarget(rec);
  };

  const closeModal = () => {
    setEditTarget(null);
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.modificationReason) {
      setFormError("Modification reason is required.");
      return;
    }
    setSaving(true);
    try {
      await updateMedicalRecord(editTarget.id, form);
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this medical record?")) return;
    try {
      await deleteMedicalRecord(id);
      load();
    } catch {
      /* ignore */
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreMedicalRecord(id);
      load();
    } catch {
      /* ignore */
    }
  };

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
          <h2>Medical Records</h2>
          <div className="top-bar-right">
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="appt-card">
            <div className="appt-toolbar">
              <input
                className="appt-search"
                placeholder="Search diagnosis, pet, vet…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <label className="show-deleted-toggle">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => {
                    setShowArchived(e.target.checked);
                    setPage(1);
                  }}
                />
                Show Archived
              </label>
            </div>
            <div className="table-summary">{filtered.length} record(s)</div>

            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Pet</th>
                    <th>Veterinarian</th>
                    <th>Date</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Modified Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        Loading…
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((rec) => (
                      <tr
                        key={rec.id}
                        className={rec.isArchived ? "row-deleted" : ""}
                      >
                        <td>{rec.pet?.name || "—"}</td>
                        <td>
                          {rec.vet
                            ? `Dr. ${rec.vet.firstName || ""} ${rec.vet.lastName || ""}`.trim()
                            : "—"}
                        </td>
                        <td>{fmtDate(rec.createdAt)}</td>
                        <td>{rec.diagnosis}</td>
                        <td>
                          <span
                            className={`status-pill ${STATUS_COLORS[rec.status] || ""}`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td>{rec.modificationReason || "—"}</td>
                        <td>
                          <div className="action-btns">
                            {!rec.isArchived && (
                              <button
                                className="edit-btn icon-btn"
                                title="Edit"
                                onClick={() => openEdit(rec)}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
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
                            )}
                            {!rec.isArchived ? (
                              <button
                                className="delete-btn icon-btn"
                                title="Archive"
                                onClick={() => handleDelete(rec.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="restore-btn icon-btn"
                                title="Restore"
                                onClick={() => handleRestore(rec.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No records found.</p>
              ) : (
                paginated.map((rec) => (
                  <div
                    className="user-card"
                    key={rec.id}
                    style={rec.isArchived ? { opacity: 0.6 } : {}}
                  >
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        {(rec.pet?.name || "?").charAt(0)}
                      </div>
                      <div className="user-card-name">
                        {rec.pet?.name} · {fmtDate(rec.createdAt)}
                      </div>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row">
                        <span className="user-card-label">Vet</span>
                        <span>
                          {rec.vet
                            ? `Dr. ${rec.vet.firstName || ""} ${rec.vet.lastName || ""}`.trim()
                            : "—"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Diagnosis</span>
                        <span>{rec.diagnosis}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Status</span>
                        <span
                          className={`status-pill ${STATUS_COLORS[rec.status] || ""}`}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Actions</span>
                        <div className="action-btns">
                          {!rec.isArchived && (
                            <button
                              className="edit-btn icon-btn"
                              onClick={() => openEdit(rec)}
                            >
                              ✎
                            </button>
                          )}
                          {!rec.isArchived ? (
                            <button
                              className="delete-btn icon-btn"
                              onClick={() => handleDelete(rec.id)}
                            >
                              🗑
                            </button>
                          ) : (
                            <button
                              className="restore-btn icon-btn"
                              onClick={() => handleRestore(rec.id)}
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-row">
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Edit Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Medical Record</h3>
            <p className="modal-hint">Changes are logged to Activity Log.</p>
            <form onSubmit={handleSubmit}>
              <label>Diagnosis *</label>
              <input
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                required
              />
              <label>Treatment</label>
              <textarea
                name="treatment"
                value={form.treatment}
                onChange={handleChange}
                rows={2}
              />
              <label>Prescription</label>
              <input
                name="prescription"
                value={form.prescription}
                onChange={handleChange}
              />
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
              />
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Finalized">Finalized</option>
                <option value="FollowUp">Follow Up</option>
              </select>
              <label>Modification Reason *</label>
              <select
                name="modificationReason"
                value={form.modificationReason}
                onChange={handleChange}
                required
              >
                <option value="">Select reason…</option>
                {MODIFICATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
