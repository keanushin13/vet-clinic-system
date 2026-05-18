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

const LOG_LIMIT = 20;

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
        limit: LOG_LIMIT,
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
  }, [page, search, statusFilter, category, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, category, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleExport = () => {
    const csv = buildLogsCSV(logs);
    downloadCSV(csv, `activity-logs-page-${page}.csv`);
  };

  const logs = Array.isArray(logData.logs) ? logData.logs : [];

  const staffName = (log) =>
    log.staff?.firstName
      ? `${log.staff.firstName} ${log.staff.lastName || ""}`.trim()
      : log.staff?.username || "—";

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
              <h3>Recent Operations</h3>
              <button className="log-export-btn" onClick={handleExport} disabled={logs.length === 0}>
                Export CSV
              </button>
            </div>

            {/* Filter bar */}
            <div className="log-filter-bar">
              <input
                type="text"
                placeholder="Search activity..."
                className="log-search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <select
                className="log-filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
              <select
                className="log-filter-select"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="date"
                className="log-date-input"
                value={dateFrom}
                title="From date"
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
              <input
                type="date"
                className="log-date-input"
                value={dateTo}
                title="To date"
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
              <button className="log-reset-btn" onClick={resetFilters}>Reset</button>
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
                        <span className={`status-pill ${log.status?.toLowerCase()}`}>
                          {log.status}
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
                        <span className={`status-pill ${log.status?.toLowerCase()}`}>{log.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {error && <p className="modal-error">{error}</p>}
            </div>

            {/* Pagination */}
            {logData.pages > 1 && (
              <div className="log-pagination">
                <button
                  className="log-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span className="log-page-info">
                  Page {page} of {logData.pages} ({logData.total} entries)
                </span>
                <button
                  className="log-page-btn"
                  disabled={page === logData.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffActivityLog;
