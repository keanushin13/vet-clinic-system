import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffActivityLog.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getActivityLogs } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const DEFAULT_LOG_LIMIT = 25;
const LOG_LIMIT_OPTIONS = [10, 25, 50, 100];

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "login", label: "Login History" },
  { value: "appointments", label: "Appointment Changes" },
  { value: "medical", label: "Record Modification" },
  { value: "payments", label: "Payment Actions" },
  { value: "inventory", label: "Inventory Updates" },
  { value: "users", label: "User / Account" },
  { value: "pets", label: "Pet Updates" },
];

function buildLogsCSV(rows) {
  const headers = ["Timestamp", "Staff", "Action", "Target", "Status"];
  const lines = [headers.join(",")];
  rows.forEach((l) => {
    const staff = l.staff?.firstName
      ? `${l.staff.firstName} ${l.staff.lastName || ""}`.trim()
      : l.staff?.username || "";
    lines.push(
      [
        `"${new Date(l.createdAt).toLocaleString()}"`,
        `"${staff}"`,
        `"${(l.action || "").replace(/"/g, '""')}"`,
        `"${(l.target || "").replace(/"/g, '""')}"`,
        l.status || "",
      ].join(",")
    );
  });
  return lines.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const StaffActivityLog = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [logData, setLogData] = useState({ logs: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LOG_LIMIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getActivityLogs({
        page,
        limit: pageSize,
        q: search.trim() || undefined,
        status: statusFilter || undefined,
        category: category || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      const data = res.data;
      if (data && Array.isArray(data.logs)) {
        setLogData(data);
      } else {
        setLogData({ logs: Array.isArray(data) ? data : [], total: 0, pages: 1 });
      }
    } catch {
      setError("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, category, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, category, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const logs = Array.isArray(logData.logs) ? logData.logs : [];
  const totalPages = Math.max(1, Number(logData.pages) || 1);
  const totalEntries = Number(logData.total) || logs.length;
  const firstEntry = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastEntry = totalEntries === 0 ? 0 : Math.min(page * pageSize, totalEntries);
  const hasFilters = Boolean(search || statusFilter || category || dateFrom || dateTo);

  const handleExport = () => {
    const csv = buildLogsCSV(logs);
    downloadCSV(csv, `activity-logs-page-${page}.csv`);
  };

  const staffName = (log) =>
    log.staff?.firstName
      ? `${log.staff.firstName} ${log.staff.lastName || ""}`.trim()
      : log.staff?.username || "—";

  const statusClass = (status) =>
    (status || "").toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="dashboard-container">
      <StaffSidebar isOpen={isOpen} onClose={close} />

      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <h2>Activity Log</h2>
          <div className="top-bar-right">
            <button className="notif-btn" onClick={() => navigate("/staff-notifications")}>
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="Profile" profilePath="/staff-profile" />
          </div>
        </header>

        <section className="content-body">
          <div className="activity-container">
            <div className="log-header-flex">
              <div className="log-title-block">
                <h3>Recent Operations</h3>
                <p>{totalEntries} entr{totalEntries === 1 ? "y" : "ies"} total</p>
              </div>
              <div className="log-action-group">
                <button className="log-export-btn" onClick={handleExport} disabled={logs.length === 0}>
                  Export CSV
                </button>
                <button className="log-reset-btn" onClick={resetFilters} disabled={!hasFilters}>
                  Reset
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="log-filter-bar">
              <label className="log-field log-search-field">
                <span>Search</span>
                <input
                  type="text"
                  placeholder="Search activity..."
                  className="log-search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </label>
              <label className="log-field">
                <span>Category</span>
                <select
                  className="log-filter-select"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="log-field">
                <span>Status</span>
                <select
                  className="log-filter-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
              <label className="log-field">
                <span>From</span>
                <input
                  type="date"
                  className="log-date-input"
                  value={dateFrom}
                  title="From date"
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                />
              </label>
              <label className="log-field">
                <span>To</span>
                <input
                  type="date"
                  className="log-date-input"
                  value={dateTo}
                  title="To date"
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                />
              </label>
            </div>

            {/* Desktop table */}
            <div className="log-table-card table-desktop">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Action Performed</th>
                    <th>Target Details</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && logs.map((log) => (
                    <tr key={log.id}>
                      <td className="staff-cell">
                        <div className="staff-avatar">{staffName(log).charAt(0)}</div>
                        {staffName(log)}
                      </td>
                      <td className="action-text">{log.action}</td>
                      <td>{log.target || "—"}</td>
                      <td className="time-text">{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`status-pill ${statusClass(log.status)}`}>
                          {log.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loading && <p className="list-placeholder">Loading activity logs...</p>}
              {!loading && logs.length === 0 && <p className="list-placeholder">No activity logs found.</p>}
              {error && <p className="modal-error">{error}</p>}
            </div>

            {/* Mobile cards */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p style={{ textAlign: "center", color: "#888" }}>Loading activity logs...</p>
              ) : logs.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888" }}>No activity logs found.</p>
              ) : (
                logs.map((log) => (
                  <div className="activity-card" key={log.id}>
                    <div className="activity-card-header">
                      <div className="activity-card-avatar">{staffName(log).charAt(0)}</div>
                      <div className="activity-card-name">{staffName(log)}</div>
                    </div>
                    <div className="activity-card-body">
                      <div className="activity-card-row">
                        <span className="activity-card-label">Action</span>
                        <span className="activity-card-action">{log.action}</span>
                      </div>
                      <div className="activity-card-row">
                        <span className="activity-card-label">Target</span>
                        <span>{log.target || "—"}</span>
                      </div>
                      <div className="activity-card-row">
                        <span className="activity-card-label">Timestamp</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="activity-card-row">
                        <span className="activity-card-label">Status</span>
                        <span className={`status-pill ${statusClass(log.status)}`}>{log.status || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {error && <p className="modal-error">{error}</p>}
            </div>

            <div className="log-pagination">
              <label className="log-page-size">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {LOG_LIMIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <span>entries</span>
              </label>

              <span className="log-page-info">
                Showing {firstEntry}-{lastEntry} of {totalEntries} entries
              </span>

              <div className="log-page-controls">
                <button
                  className="log-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="log-page-current">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="log-page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffActivityLog;
