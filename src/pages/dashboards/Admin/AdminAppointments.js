import { useEffect, useState, useCallback, useMemo } from "react";
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
  InProgress: "status-inprogress",
  "In Progress": "status-inprogress",
  Completed: "status-completed",
  Late: "status-late",
  Cancelled: "status-cancelled",
};

const normalizeAppointmentStatus = (status, fallback = "Pending") =>
  String(status || fallback).trim().toLowerCase().replace(/\s+/g, "");

const getAppointmentStatusLabel = (status) => {
  const normalized = normalizeAppointmentStatus(status);
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    inprogress: "In Progress",
    completed: "Completed",
    late: "Late",
    cancelled: "Cancelled",
  };
  return labels[normalized] || status || "Pending";
};

const getAppointmentStatusClass = (status) =>
  STATUS_COLORS[status] ||
  {
    pending: "status-pending",
    confirmed: "status-confirmed",
    inprogress: "status-inprogress",
    completed: "status-completed",
    late: "status-late",
    cancelled: "status-cancelled",
  }[normalizeAppointmentStatus(status)] ||
  "";

const VISIT_REASONS = [
  "Checkup",
  "Vaccination",
  "Grooming",
  "Dental",
  "Surgery",
  "Emergency",
  "Follow-up",
  "Deworming",
  "Lab Test",
  "Consultation",
];

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

function toLocalDatetimeInput(d) {
  if (!d) return "";
  const date = new Date(d);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isToday(d) {
  if (!d) return false;
  const t = new Date(d);
  const now = new Date();
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  );
}

export default function AdminAppointments() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const { isOpen, toggle, close } = useSidebar();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vetFilter, setVetFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);

  // Modal
  const [modalMode, setModalMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Dropdown data
  const [vets, setVets] = useState([]);
  const [petOwners, setPetOwners] = useState([]);
  const [ownerPets, setOwnerPets] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAppointments({});
      setAppointments(Array.isArray(r.data) ? r.data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
    getUsers({ role: "veterinarian", limit: 1000 })
      .then((r) => setVets(r.data?.users || r.data || []))
      .catch(() => {});
    getUsers({ role: "pet_owner", limit: 1000 })
      .then((r) => setPetOwners(r.data?.users || r.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, vetFilter, reasonFilter, dateFrom, dateTo, limit]);

  const fetchOwnerPets = async (ownerId) => {
    if (!ownerId) { setOwnerPets([]); return; }
    try {
      const r = await getPets({ ownerId });
      setOwnerPets(Array.isArray(r.data) ? r.data : []);
    } catch {
      setOwnerPets([]);
    }
  };

  // Stats derived from all appointments
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "pending").length;
    const confirmed = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "confirmed").length;
    const inprogress = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "inprogress").length;
    const completed = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "completed").length;
    const late = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "late").length;
    const cancelled = appointments.filter((a) => normalizeAppointmentStatus(a.status) === "cancelled").length;
    const today = appointments.filter((a) => isToday(a.scheduledAt)).length;
    return { total, pending, confirmed, inprogress, completed, late, cancelled, today };
  }, [appointments]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (
        statusFilter &&
        normalizeAppointmentStatus(a.status) !== normalizeAppointmentStatus(statusFilter)
      ) return false;
      if (vetFilter && a.vetId !== vetFilter) return false;
      if (reasonFilter && !(a.reason || "").toLowerCase().includes(reasonFilter.toLowerCase())) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(a.scheduledAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(a.scheduledAt) > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const ownerName = a.owner
          ? `${a.owner.firstName || ""} ${a.owner.lastName || ""}`.trim().toLowerCase() ||
            (a.owner.username || "").toLowerCase()
          : "";
        const vetName = a.vet
          ? `${a.vet.firstName || ""} ${a.vet.lastName || ""}`.trim().toLowerCase() ||
            (a.vet.username || "").toLowerCase()
          : "";
        if (
          !(a.pet?.name || "").toLowerCase().includes(q) &&
          !ownerName.includes(q) &&
          !vetName.includes(q) &&
          !(a.reason || "").toLowerCase().includes(q) &&
          !(a.notes || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [appointments, search, statusFilter, vetFilter, reasonFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setOwnerPets([]);
    setFormError("");
    setEditTarget(null);
    setModalMode("add");
  };

  const openEdit = (a) => {
    const ownerId = a.ownerId || a.owner?.id || "";
    const vetId = a.vetId || a.vet?.id || "";
    const petId = a.petId || a.pet?.id || "";

    // Ensure the appointment's owner is in the dropdown even if not in the paginated list
    if (ownerId && a.owner) {
      setPetOwners((prev) => {
        const exists = prev.some((o) => o.id === ownerId);
        return exists ? prev : [a.owner, ...prev];
      });
    }
    // Ensure the appointment's vet is in the dropdown
    if (vetId && a.vet) {
      setVets((prev) => {
        const exists = prev.some((v) => v.id === vetId);
        return exists ? prev : [a.vet, ...prev];
      });
    }

    setForm({
      petId,
      ownerId,
      vetId,
      scheduledAt: toLocalDatetimeInput(a.scheduledAt),
      reason: a.reason || "",
      status: a.status || "Pending",
      notes: a.notes || "",
    });
    fetchOwnerPets(ownerId);
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
      if (modalMode === "add") await createAppointment(payload);
      else await updateAppointment(editTarget.id, payload);
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
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await deleteAppointment(id);
      load();
    } catch { /* ignore */ }
  };

  const statCards = [
    { label: "Total", value: stats.total, cls: "stat-total" },
    { label: "Pending", value: stats.pending, cls: "stat-pending" },
    { label: "Confirmed", value: stats.confirmed, cls: "stat-confirmed" },
    { label: "In Progress", value: stats.inprogress, cls: "stat-inprogress" },
    { label: "Completed", value: stats.completed, cls: "stat-completed" },
    { label: "Late", value: stats.late, cls: "stat-late" },
    { label: "Cancelled", value: stats.cancelled, cls: "stat-cancelled" },
    { label: "Today", value: stats.today, cls: "stat-today" },
  ];

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />
      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <h2>Admin Appointment Management</h2>
          <div className="top-bar-right">
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="Admin" profilePath="/admin-profile" />
          </div>
        </header>

        <section className="content-body">
          {/* Stats */}
          <div className="appt-stats-grid">
            {statCards.map((s) => (
              <div key={s.label} className={`appt-stat-card ${s.cls}`}>
                <span className="appt-stat-value">{loading ? "—" : s.value}</span>
                <span className="appt-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="appt-card">
            {/* Toolbar row 1: search + entries + add */}
            <div className="appt-toolbar">
              <input
                className="appt-search"
                placeholder="Search pet, owner, vet, reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className="entries-select-label">
                Show&nbsp;
                <select
                  className="entries-select"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                &nbsp;entries
              </label>
              <button className="add-user-btn" onClick={openAdd}>
                + Book Appointment
              </button>
            </div>

            {/* Toolbar row 2: filters */}
            <div className="appt-toolbar appt-toolbar-filters">
              <select
                className="appt-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Late">Late</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                className="appt-filter-select"
                value={vetFilter}
                onChange={(e) => setVetFilter(e.target.value)}
              >
                <option value="">All Veterinarians</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    Dr. {v.firstName ? `${v.firstName} ${v.lastName || ""}`.trim() : v.username}
                  </option>
                ))}
              </select>

              <select
                className="appt-filter-select"
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
              >
                <option value="">All Visit Reasons</option>
                {VISIT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <input
                type="date"
                className="appt-date-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Date From"
              />
              <input
                type="date"
                className="appt-date-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Date To"
              />
            </div>

            {/* Desktop table */}
            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Pet Name</th>
                    <th>Owner</th>
                    <th>Veterinarian</th>
                    <th>Scheduled Date &amp; Time</th>
                    <th>Visit Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="empty-row">Loading…</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan="7" className="empty-row">No appointments found.</td></tr>
                  ) : (
                    paginated.map((a) => {
                      const ownerName = a.owner
                        ? `${a.owner.firstName || ""} ${a.owner.lastName || ""}`.trim() || a.owner.username
                        : "—";
                      return (
                        <tr key={a.id}>
                          <td>{a.pet?.name || "—"}</td>
                          <td>{ownerName}</td>
                          <td>
                            {a.vet
                              ? `Dr. ${a.vet.firstName || ""} ${a.vet.lastName || ""}`.trim()
                              : <span className="appt-unassigned">Unassigned</span>}
                          </td>
                          <td>{fmtDate(a.scheduledAt)}</td>
                          <td>{a.reason || "—"}</td>
                          <td>
                            <span className={`status-pill ${getAppointmentStatusClass(a.status)}`}>
                              {getAppointmentStatusLabel(a.status)}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns">
                              {normalizeAppointmentStatus(a.status) === "pending" && (
                                <button
                                  className="activate-btn icon-btn"
                                  title="Confirm"
                                  onClick={() => handleStatusChange(a.id, "Confirmed")}
                                >
                                  ✓
                                </button>
                              )}
                              {(["pending", "confirmed", "inprogress"].includes(normalizeAppointmentStatus(a.status))) && (
                                <button
                                  className="suspend-btn icon-btn"
                                  title="Cancel"
                                  onClick={() => handleStatusChange(a.id, "Cancelled")}
                                >
                                  ✕
                                </button>
                              )}
                              <button
                                className="edit-btn icon-btn"
                                title="Edit"
                                onClick={() => openEdit(a)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  <path d="M12 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </button>
                              <button
                                className="delete-btn icon-btn"
                                title="Delete"
                                onClick={() => handleDelete(a.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
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
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No appointments found.</p>
              ) : (
                paginated.map((a) => {
                  const ownerName = a.owner
                    ? `${a.owner.firstName || ""} ${a.owner.lastName || ""}`.trim() || a.owner.username
                    : "—";
                  return (
                    <div className="user-card" key={a.id}>
                      <div className="user-card-header">
                        <div className="user-card-avatar">{(a.pet?.name || "?").charAt(0)}</div>
                        <div className="user-card-name">{a.pet?.name || "—"}</div>
                      </div>
                      <div className="user-card-body">
                        <div className="user-card-row">
                          <span className="user-card-label">Owner</span>
                          <span>{ownerName}</span>
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
                          <span className="user-card-label">Scheduled</span>
                          <span>{fmtDate(a.scheduledAt)}</span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Reason</span>
                          <span>{a.reason || "—"}</span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Status</span>
                          <span className={`status-pill ${getAppointmentStatusClass(a.status)}`}>
                            {getAppointmentStatusLabel(a.status)}
                          </span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Actions</span>
                          <div className="action-btns">
                            {normalizeAppointmentStatus(a.status) === "pending" && (
                              <button
                                className="activate-btn icon-btn"
                                title="Confirm"
                                onClick={() => handleStatusChange(a.id, "Confirmed")}
                              >✓</button>
                            )}
                            {(["pending", "confirmed", "inprogress"].includes(normalizeAppointmentStatus(a.status))) && (
                              <button
                                className="suspend-btn icon-btn"
                                title="Cancel"
                                onClick={() => handleStatusChange(a.id, "Cancelled")}
                              >✕</button>
                            )}
                            <button className="edit-btn icon-btn" onClick={() => openEdit(a)}>✎</button>
                            <button className="delete-btn icon-btn" onClick={() => handleDelete(a.id)}>🗑</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
              <span className="pagination-info">
                {loading
                  ? "Loading..."
                  : filtered.length === 0
                    ? "No entries"
                    : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, filtered.length)} of ${filtered.length} entries`}
              </span>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  &lsaquo; Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - page) <= 2;
                  })
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("ellipsis-" + p);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item) =>
                    typeof item === "string" ? (
                      <span key={item} className="page-ellipsis">…</span>
                    ) : (
                      <button
                        key={item}
                        className={`page-btn${item === page ? " page-btn-active" : ""}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next &rsaquo;
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add/Edit Modal */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === "add" ? "Book Appointment" : "Edit Appointment"}</h3>
            <form onSubmit={handleSubmit}>
              <label>Pet Owner *</label>
              <select name="ownerId" value={form.ownerId} onChange={handleChange} required>
                <option value="">Select owner</option>
                {petOwners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.firstName ? `${o.firstName} ${o.lastName || ""}`.trim() : o.username} ({o.email})
                  </option>
                ))}
              </select>

              <label>Pet *</label>
              <select name="petId" value={form.petId} onChange={handleChange} required>
                <option value="">Select pet</option>
                {ownerPets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>

              <label>Veterinarian</label>
              <select name="vetId" value={form.vetId} onChange={handleChange}>
                <option value="">Unassigned</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    Dr. {v.firstName ? `${v.firstName} ${v.lastName || ""}`.trim() : v.username}
                  </option>
                ))}
              </select>

              <label>Scheduled At *</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
                required
              />

              <label>Visit Reason</label>
              <select name="reason" value={form.reason} onChange={handleChange}>
                <option value="">Select reason</option>
                {VISIT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value={form.reason && !VISIT_REASONS.includes(form.reason) ? form.reason : "__other"}>
                  {form.reason && !VISIT_REASONS.includes(form.reason) ? form.reason : "Other"}
                </option>
              </select>

              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Late">Late</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} />

              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
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
