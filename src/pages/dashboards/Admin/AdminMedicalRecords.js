import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getMedicalRecords,
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

function ownerName(rec) {
  const o = rec.pet?.owner;
  if (!o) return "—";
  return `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.username || "—";
}

function vetName(rec) {
  if (!rec.vet) return "—";
  return `Dr. ${rec.vet.firstName || ""} ${rec.vet.lastName || ""}`.trim();
}

export default function AdminMedicalRecords() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState("");
  const [vetFilter, setVetFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // View modal
  const [viewTarget, setViewTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getMedicalRecords({
        includeArchived: showArchived ? "true" : undefined,
        limit: 500,
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

  useEffect(() => {
    setPage(1);
  }, [limit, search, statusFilter, vetFilter, reasonFilter, dateFrom, dateTo, showArchived]);

  // Unique vets for dropdown
  const vetOptions = useMemo(() => {
    const seen = new Map();
    for (const r of records) {
      if (r.vet && !seen.has(r.vet.id)) {
        seen.set(r.vet.id, vetName(r));
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [records]);

  const filtered = records.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (vetFilter && r.vet?.id !== vetFilter) return false;
    if (reasonFilter && r.modificationReason !== reasonFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(r.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(r.createdAt) > to) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matches =
        (r.pet?.name || "").toLowerCase().includes(q) ||
        ownerName(r).toLowerCase().includes(q) ||
        vetName(r).toLowerCase().includes(q) ||
        (r.diagnosis || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleArchive = async (id) => {
    try {
      await deleteMedicalRecord(id);
      load();
    } catch { /* ignore */ }
  };

  const handleRestore = async (id) => {
    try {
      await restoreMedicalRecord(id);
      load();
    } catch { /* ignore */ }
  };

  const handlePrint = (rec) => {
    setViewTarget({ ...rec, _print: true });
  };

  useEffect(() => {
    if (viewTarget?._print) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [viewTarget]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setVetFilter("");
    setReasonFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />
      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <h2>Pet Medical Records</h2>
          <div className="top-bar-right">
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="Admin" profilePath="/admin-profile" />
          </div>
        </header>

        <section className="content-body">
          <div className="appt-card">
            {/* ── Toolbar ── */}
            <div className="appt-toolbar medrec-toolbar">
              <label className="entries-select-label">
                Show&nbsp;
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="entries-select">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                &nbsp;entries
              </label>

              <input
                className="appt-search"
                placeholder="Search pet name, owner, vet, diagnosis…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select className="appt-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="Finalized">Finalized</option>
                <option value="FollowUp">Follow Up</option>
              </select>

              <select className="appt-filter-select" value={vetFilter} onChange={(e) => setVetFilter(e.target.value)}>
                <option value="">Veterinarian</option>
                {vetOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>

              <select className="appt-filter-select" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
                <option value="">Modified Reason</option>
                {MODIFICATION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <input type="date" className="appt-date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Date Started" />
              <input type="date" className="appt-date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Date Ended" />
            </div>

            {/* ── Second row: Show Archived + summary ── */}
            <div className="medrec-subbar">
              <label className="show-deleted-toggle">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show Archived
              </label>
              <span className="table-summary">{filtered.length} record(s)</span>
              <button className="medrec-reset-btn" onClick={resetFilters}>Reset Filters</button>
            </div>

            {/* ── Desktop table ── */}
            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Pet Name</th>
                    <th>Pet Owner</th>
                    <th>Veterinarian</th>
                    <th>Visit Date</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="empty-row">Loading…</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan="7" className="empty-row">No records found.</td></tr>
                  ) : (
                    paginated.map((rec) => (
                      <tr key={rec.id} className={rec.isArchived ? "row-deleted" : ""}>
                        <td>{rec.pet?.name || "—"}</td>
                        <td>{ownerName(rec)}</td>
                        <td>{vetName(rec)}</td>
                        <td>{fmtDate(rec.appointment?.scheduledAt || rec.createdAt)}</td>
                        <td className="medrec-diagnosis-cell">{rec.diagnosis || "—"}</td>
                        <td>
                          <span className={`status-pill ${STATUS_COLORS[rec.status] || ""}`}>
                            {rec.status === "FollowUp" ? "Follow Up" : rec.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="icon-btn edit-btn"
                              title="View Full Record"
                              onClick={() => setViewTarget(rec)}
                            >
                              👁
                            </button>
                            <button
                              className="icon-btn"
                              title="Print as PDF"
                              onClick={() => handlePrint(rec)}
                            >
                              🖨
                            </button>
                            {!rec.isArchived ? (
                              <button
                                className="icon-btn delete-btn"
                                title="Archive"
                                onClick={() => handleArchive(rec.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="icon-btn restore-btn"
                                title="Restore"
                                onClick={() => handleRestore(rec.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none">
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M3 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

            {/* ── Mobile cards ── */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No records found.</p>
              ) : (
                paginated.map((rec) => (
                  <div className="user-card" key={rec.id} style={rec.isArchived ? { opacity: 0.6 } : {}}>
                    <div className="user-card-header">
                      <div className="user-card-avatar">{(rec.pet?.name || "?").charAt(0)}</div>
                      <div className="user-card-name">
                        {rec.pet?.name || "—"} · {fmtDate(rec.appointment?.scheduledAt || rec.createdAt)}
                      </div>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row">
                        <span className="user-card-label">Owner</span>
                        <span>{ownerName(rec)}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Vet</span>
                        <span>{vetName(rec)}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Diagnosis</span>
                        <span>{rec.diagnosis || "—"}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Status</span>
                        <span className={`status-pill ${STATUS_COLORS[rec.status] || ""}`}>
                          {rec.status === "FollowUp" ? "Follow Up" : rec.status}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Actions</span>
                        <div className="action-btns">
                          <button className="icon-btn edit-btn" onClick={() => setViewTarget(rec)}>👁</button>
                          <button className="icon-btn" onClick={() => handlePrint(rec)}>🖨</button>
                          {!rec.isArchived ? (
                            <button className="icon-btn delete-btn" onClick={() => handleArchive(rec.id)}>
                              <svg viewBox="0 0 24 24" fill="none">
                                <path d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          ) : (
                            <button className="icon-btn restore-btn" onClick={() => handleRestore(rec.id)}>↺</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Pagination ── */}
            <div className="pagination-bar">
              <span className="pagination-info">
                {loading
                  ? "Loading..."
                  : filtered.length === 0
                    ? "No entries"
                    : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, filtered.length)} of ${filtered.length} entries`}
              </span>
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>&lsaquo; Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - page) <= 1;
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
                  <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next &rsaquo;</button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── View Full Record Modal ── */}
      {viewTarget && (
        <div className="modal-overlay" onClick={() => setViewTarget(null)}>
          <div className="modal-box medrec-view-box" onClick={(e) => e.stopPropagation()}>
            <div className="medrec-view-header">
              <h3>Medical Record</h3>
              <button className="save-btn" onClick={() => window.print()}>🖨 Print as PDF</button>
            </div>

            <div className="medrec-view-grid">
              <div className="medrec-view-row">
                <span className="medrec-view-label">Pet</span>
                <span>{viewTarget.pet?.name || "—"} ({viewTarget.pet?.species || "—"})</span>
              </div>
              <div className="medrec-view-row">
                <span className="medrec-view-label">Owner</span>
                <span>{ownerName(viewTarget)}</span>
              </div>
              <div className="medrec-view-row">
                <span className="medrec-view-label">Veterinarian</span>
                <span>{vetName(viewTarget)}</span>
              </div>
              <div className="medrec-view-row">
                <span className="medrec-view-label">Visit Date</span>
                <span>{fmtDate(viewTarget.appointment?.scheduledAt || viewTarget.createdAt)}</span>
              </div>
              <div className="medrec-view-row">
                <span className="medrec-view-label">Status</span>
                <span className={`status-pill ${STATUS_COLORS[viewTarget.status] || ""}`}>
                  {viewTarget.status === "FollowUp" ? "Follow Up" : viewTarget.status}
                </span>
              </div>
            </div>

            <hr className="medrec-divider" />

            <div className="medrec-view-section">
              <p className="medrec-view-label">Diagnosis</p>
              <p className="medrec-view-text">{viewTarget.diagnosis || "—"}</p>
            </div>
            <div className="medrec-view-section">
              <p className="medrec-view-label">Treatment</p>
              <p className="medrec-view-text">{viewTarget.treatment || "—"}</p>
            </div>
            <div className="medrec-view-section">
              <p className="medrec-view-label">Prescription</p>
              <p className="medrec-view-text">{viewTarget.prescription || "—"}</p>
            </div>
            <div className="medrec-view-section">
              <p className="medrec-view-label">Notes</p>
              <p className="medrec-view-text">{viewTarget.notes || "—"}</p>
            </div>
            {viewTarget.modificationReason && (
              <div className="medrec-view-section">
                <p className="medrec-view-label">Modification Reason</p>
                <p className="medrec-view-text">{viewTarget.modificationReason}</p>
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setViewTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
