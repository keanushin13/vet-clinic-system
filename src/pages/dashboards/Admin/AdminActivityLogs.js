import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getActivityLogs } from "../../../api/api";
import "../../../css/AdminActivityLogs.css";
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const CATEGORIES = [
  { value: "", label: "All Activity" },
  { value: "login", label: "Login Activity" },
  { value: "appointments", label: "Appointments" },
  { value: "medical", label: "Medical Records" },
  { value: "inventory", label: "Inventory" },
  { value: "payments", label: "Payments" },
  { value: "users", label: "Users" },
  { value: "pets", label: "Pets" },
];

const STATUS_COLORS = {
  Success: "status-active",
  Pending: "status-pending",
  Failed: "status-suspended",
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleString() : "—";
}

function buildCSV(rows) {
  const headers = ["Action", "Target", "Staff", "Status", "Date"];
  const lines = [headers.join(",")];
  for (const l of rows) {
    lines.push(
      [
        `"${l.action || ""}"`,
        `"${l.target || ""}"`,
        `"${l.staff ? `${l.staff.firstName || ""} ${l.staff.lastName || ""}`.trim() || l.staff.username : ""}"`,
        l.status || "",
        fmtDate(l.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export default function AdminActivityLogs() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (category) params.category = category;
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await getActivityLogs(params);
      const data = r.data || {};
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, search, statusFilter, dateFrom, dateTo]);

  const resetPage = () => setPage(1);

  const exportCSV = () => {
    const csv = buildCSV(logs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity_logs_export.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          <h2>Activity Logs</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {/* Category tabs */}
          <div className="al-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`al-tab${category === c.value ? " active" : ""}`}
                onClick={() => {
                  setCategory(c.value);
                  resetPage();
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="appt-card">
            <div className="appt-toolbar">
              <input
                className="appt-search"
                placeholder="Search action, target, staff…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
              />
              <select
                className="appt-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  resetPage();
                }}
              >
                <option value="">All Status</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
              <input
                type="date"
                className="appt-date-input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  resetPage();
                }}
                title="From"
              />
              <input
                type="date"
                className="appt-date-input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  resetPage();
                }}
                title="To"
              />
              <button className="export-btn" onClick={exportCSV}>
                ⬇ Export CSV
              </button>
            </div>
            <div className="table-summary">{total} log(s) total</div>

            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Staff / User</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        Loading…
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((l) => (
                      <tr key={l.id}>
                        <td>{l.action}</td>
                        <td>{l.target || "—"}</td>
                        <td>
                          {l.staff
                            ? `${l.staff.firstName || ""} ${l.staff.lastName || ""}`.trim() ||
                              l.staff.username
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${STATUS_COLORS[l.status] || ""}`}
                          >
                            {l.status || "—"}
                          </span>
                        </td>
                        <td>{fmtDate(l.createdAt)}</td>
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
              ) : logs.length === 0 ? (
                <p className="empty-row">No logs found.</p>
              ) : (
                logs.map((l) => (
                  <div className="user-card" key={l.id}>
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        {(l.action || "?").charAt(0)}
                      </div>
                      <div className="user-card-name">{l.action}</div>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row">
                        <span className="user-card-label">Target</span>
                        <span>{l.target || "—"}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Staff</span>
                        <span>
                          {l.staff
                            ? `${l.staff.firstName || ""} ${l.staff.lastName || ""}`.trim() ||
                              l.staff.username
                            : "—"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Status</span>
                        <span
                          className={`status-pill ${STATUS_COLORS[l.status] || ""}`}
                        >
                          {l.status || "—"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Date</span>
                        <span>{fmtDate(l.createdAt)}</span>
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
    </div>
  );
}
