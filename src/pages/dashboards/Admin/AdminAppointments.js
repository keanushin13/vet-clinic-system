import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getUsers,
  getPets,
} from "../../../api/api";
import "../../../css/AdminAppointments.css";
import userIcon from "../../../assets/Profile.png";

const STATUS_COLORS = {
  Pending: "status-pending",
  Confirmed: "status-confirmed",
  Completed: "status-completed",
  Cancelled: "status-cancelled",
};

const EMPTY_FORM = {
  petId: "",
  ownerId: "",
  vetId: "",
  scheduledAt: "",
  reason: "",
  status: "Pending",
  notes: "",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export default function AdminAppointments() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Modal
  const [modalMode, setModalMode] = useState(null); // "add" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Selects for dropdowns
  const [vets, setVets] = useState([]);
  const [petOwners, setPetOwners] = useState([]);
  const [ownerPets, setOwnerPets] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      const r = await getAppointments(params);
      setAppointments(Array.isArray(r.data) ? r.data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
    getUsers({ role: "veterinarian" })
      .then((r) => setVets(r.data?.users || r.data || []))
      .catch(() => {});
    getUsers({ role: "pet_owner" })
      .then((r) => setPetOwners(r.data?.users || r.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo]);

  const fetchOwnerPets = async (ownerId) => {
    if (!ownerId) {
      setOwnerPets([]);
      return;
    }
    try {
      const r = await getPets({ ownerId });
      setOwnerPets(Array.isArray(r.data) ? r.data : []);
    } catch {
      setOwnerPets([]);
    }
  };

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.pet?.name || "").toLowerCase().includes(q) ||
      (a.owner?.firstName || "").toLowerCase().includes(q) ||
      (a.owner?.lastName || "").toLowerCase().includes(q) ||
      (a.owner?.username || "").toLowerCase().includes(q) ||
      (a.vet?.firstName || "").toLowerCase().includes(q) ||
      (a.reason || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setOwnerPets([]);
    setFormError("");
    setEditTarget(null);
    setModalMode("add");
  };

  const openEdit = (a) => {
    setForm({
      petId: a.petId || "",
      ownerId: a.ownerId || "",
      vetId: a.vetId || "",
      scheduledAt: a.scheduledAt
        ? new Date(a.scheduledAt).toISOString().slice(0, 16)
        : "",
      reason: a.reason || "",
      status: a.status || "Pending",
      notes: a.notes || "",
    });
    fetchOwnerPets(a.ownerId);
    setFormError("");
    setEditTarget(a);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "ownerId") fetchOwnerPets(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        petId: form.petId,
        ownerId: form.ownerId,
        vetId: form.vetId || undefined,
        scheduledAt: form.scheduledAt,
        reason: form.reason,
        status: form.status,
        notes: form.notes,
      };
      if (modalMode === "add") {
        await createAppointment(payload);
      } else {
        await updateAppointment(editTarget.id, payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAppointment(id, { status });
      load();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel/delete this appointment?")) return;
    try {
      await deleteAppointment(id);
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
          <h2>Appointments</h2>
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
            {/* Toolbar */}
            <div className="appt-toolbar">
              <input
                className="appt-search"
                placeholder="Search pet, owner, vet, reason…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="appt-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                className="appt-date-input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                title="From date"
              />
              <input
                type="date"
                className="appt-date-input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                title="To date"
              />
              <button className="add-user-btn" onClick={openAdd}>
                + Book Appointment
              </button>
            </div>

            <div className="table-summary">
              {filtered.length} appointment(s)
            </div>

            {/* Desktop table */}
            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Pet</th>
                    <th>Owner</th>
                    <th>Veterinarian</th>
                    <th>Scheduled</th>
                    <th>Reason</th>
                    <th>Status</th>
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
                        No appointments found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((a) => (
                      <tr key={a.id}>
                        <td>{a.pet?.name || "—"}</td>
                        <td>
                          {a.owner
                            ? `${a.owner.firstName || ""} ${a.owner.lastName || ""}`.trim() ||
                              a.owner.username
                            : "—"}
                        </td>
                        <td>
                          {a.vet ? (
                            `Dr. ${a.vet.firstName || ""} ${a.vet.lastName || ""}`.trim()
                          ) : (
                            <span className="appt-unassigned">Unassigned</span>
                          )}
                        </td>
                        <td>{fmtDate(a.scheduledAt)}</td>
                        <td>{a.reason || "—"}</td>
                        <td>
                          <span
                            className={`status-pill ${STATUS_COLORS[a.status] || ""}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            {a.status === "Pending" && (
                              <button
                                className="activate-btn icon-btn"
                                title="Confirm"
                                onClick={() =>
                                  handleStatusChange(a.id, "Confirmed")
                                }
                              >
                                ✓
                              </button>
                            )}
                            {(a.status === "Pending" ||
                              a.status === "Confirmed") && (
                              <button
                                className="suspend-btn icon-btn"
                                title="Cancel"
                                onClick={() =>
                                  handleStatusChange(a.id, "Cancelled")
                                }
                              >
                                ✕
                              </button>
                            )}
                            <button
                              className="edit-btn icon-btn"
                              title="Edit"
                              onClick={() => openEdit(a)}
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
                              title="Delete"
                              onClick={() => handleDelete(a.id)}
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

            {/* Mobile cards */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No appointments found.</p>
              ) : (
                paginated.map((a) => (
                  <div className="user-card" key={a.id}>
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        {(a.pet?.name || "?").charAt(0)}
                      </div>
                      <div className="user-card-name">
                        {a.pet?.name || "—"} · {fmtDate(a.scheduledAt)}
                      </div>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row">
                        <span className="user-card-label">Owner</span>
                        <span>
                          {a.owner
                            ? `${a.owner.firstName || ""} ${a.owner.lastName || ""}`.trim() ||
                              a.owner.username
                            : "—"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Vet</span>
                        <span>
                          {a.vet
                            ? `Dr. ${a.vet.firstName || ""} ${a.vet.lastName || ""}`.trim()
                            : "Unassigned"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Reason</span>
                        <span>{a.reason || "—"}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Status</span>
                        <span
                          className={`status-pill ${STATUS_COLORS[a.status] || ""}`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Actions</span>
                        <div className="action-btns">
                          {a.status === "Pending" && (
                            <button
                              className="activate-btn icon-btn"
                              onClick={() =>
                                handleStatusChange(a.id, "Confirmed")
                              }
                            >
                              ✓
                            </button>
                          )}
                          {(a.status === "Pending" ||
                            a.status === "Confirmed") && (
                            <button
                              className="suspend-btn icon-btn"
                              onClick={() =>
                                handleStatusChange(a.id, "Cancelled")
                              }
                            >
                              ✕
                            </button>
                          )}
                          <button
                            className="edit-btn icon-btn"
                            onClick={() => openEdit(a)}
                          >
                            ✎
                          </button>
                          <button
                            className="delete-btn icon-btn"
                            onClick={() => handleDelete(a.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
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

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalMode === "add" ? "Book Appointment" : "Edit Appointment"}
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Owner */}
              <label>Pet Owner *</label>
              <select
                name="ownerId"
                value={form.ownerId}
                onChange={handleChange}
                required
              >
                <option value="">Select owner</option>
                {petOwners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.firstName
                      ? `${o.firstName} ${o.lastName || ""}`.trim()
                      : o.username}{" "}
                    ({o.email})
                  </option>
                ))}
              </select>

              {/* Pet */}
              <label>Pet *</label>
              <select
                name="petId"
                value={form.petId}
                onChange={handleChange}
                required
              >
                <option value="">Select pet</option>
                {ownerPets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species})
                  </option>
                ))}
              </select>

              {/* Vet */}
              <label>Veterinarian</label>
              <select name="vetId" value={form.vetId} onChange={handleChange}>
                <option value="">Unassigned</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    Dr.{" "}
                    {v.firstName
                      ? `${v.firstName} ${v.lastName || ""}`.trim()
                      : v.username}
                  </option>
                ))}
              </select>

              {/* Scheduled */}
              <label>Scheduled At *</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
                required
              />

              {/* Reason */}
              <label>Reason</label>
              <input
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Visit reason"
              />

              {/* Status */}
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              {/* Notes */}
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
              />

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
