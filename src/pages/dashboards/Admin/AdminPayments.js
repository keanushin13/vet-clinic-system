import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getPayments,
  updatePayment,
  getAppointmentBillingSummary,
} from "../../../api/api";
import "../../../css/AdminPayments.css";
import userIcon from "../../../assets/Profile.png";

const STATUS_COLORS = {
  Pending: "status-pending",
  Paid: "status-active",
  Refunded: "status-suspended",
  Partial: "status-info",
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}
function fmtCurrency(n) {
  return Number(n || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function buildCSV(rows) {
  const headers = ["ID", "Owner", "Pet", "Amount", "Method", "Status", "Date"];
  const lines = [headers.join(",")];
  for (const p of rows) {
    const owner = p.appointment?.owner
      ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() ||
        p.appointment.owner.username
      : "";
    const pet = p.appointment?.pet?.name || "";
    lines.push(
      [
        p.id,
        `"${owner}"`,
        `"${pet}"`,
        p.amount,
        p.method || "",
        p.status,
        fmtDate(p.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export default function AdminPayments() {
  const navigate = useNavigate();
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    [],
  );
  const { isOpen, toggle, close } = useSidebar();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Invoice modal
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPayments({});
      setPayments(
        Array.isArray(r.data)
          ? r.data
          : Array.isArray(r.data?.payments)
            ? r.data.payments
            : [],
      );
    } catch {
      setPayments([]);
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
  }, [user, navigate, load]);

  useEffect(() => { setPage(1); }, [limit, statusFilter, methodFilter, dateFrom, dateTo, search]);

  const filtered = payments.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (methodFilter && p.method !== methodFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(p.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(p.createdAt) > to) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const ownerName = p.owner
        ? (`${p.owner.firstName || ""} ${p.owner.lastName || ""}`.trim() || p.owner.username || "").toLowerCase()
        : (p.appointment?.owner
            ? (`${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() || p.appointment.owner.username || "").toLowerCase()
            : "");
      const petName = (p.pet?.name || p.appointment?.pet?.name || "").toLowerCase();
      if (
        !ownerName.includes(q) &&
        !petName.includes(q) &&
        !(p.method || "").toLowerCase().includes(q) &&
        !(p.service || "").toLowerCase().includes(q) &&
        !(p.status || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleRefund = async (id) => {
    if (!window.confirm("Mark this payment as Refunded?")) return;
    try {
      await updatePayment(id, { status: "Refunded" });
      load();
    } catch {
      /* ignore */
    }
  };

  const openInvoice = async (p) => {
    setInvoiceLoading(true);
    setInvoiceData(null);
    try {
      const r = await getAppointmentBillingSummary(p.appointmentId);
      setInvoiceData({ billing: r.data, payment: p });
    } catch {
      setInvoiceData({ billing: null, payment: p });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = buildCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_export.csv";
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
          <h2>Payments</h2>
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
              <label className="entries-select-label">
                Show&nbsp;
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="entries-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                &nbsp;entries
              </label>
              <input
                className="appt-search"
                placeholder="Search owner, pet, method…"
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
                <option value="Paid">Paid</option>
                <option value="Refunded">Refunded</option>
                <option value="Partial">Partial</option>
              </select>
              <select
                className="appt-filter-select"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
              </select>
              <input
                type="date"
                className="appt-date-input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                title="From"
              />
              <input
                type="date"
                className="appt-date-input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                title="To"
              />
              <button className="export-btn" onClick={exportCSV}>
                ⬇ Export CSV
              </button>
            </div>
            <div className="table-summary">{filtered.length} payment(s)</div>

            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Pet</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
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
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => {
                      const owner = p.owner
                        ? `${p.owner.firstName || ""} ${p.owner.lastName || ""}`.trim() || p.owner.username
                        : p.appointment?.owner
                          ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() || p.appointment.owner.username
                          : "—";
                      const pet = p.pet?.name || p.appointment?.pet?.name || "—";
                      return (
                        <tr key={p.id}>
                          <td>{owner}</td>
                          <td>{pet}</td>
                          <td>{fmtCurrency(p.amount)}</td>
                          <td>{p.method || "—"}</td>
                          <td>
                            <span
                              className={`status-pill ${STATUS_COLORS[p.status] || ""}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td>{fmtDate(p.createdAt)}</td>
                          <td>
                            <div className="action-btns">
                              <button
                                className="icon-btn edit-btn"
                                title="View Invoice"
                                onClick={() => openInvoice(p)}
                              >
                                🧾
                              </button>
                              {p.status === "Paid" && (
                                <button
                                  className="suspend-btn icon-btn"
                                  title="Refund"
                                  onClick={() => handleRefund(p.id)}
                                >
                                  ↩
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No payments found.</p>
              ) : (
                paginated.map((p) => {
                  const owner = p.owner
                    ? `${p.owner.firstName || ""} ${p.owner.lastName || ""}`.trim() || p.owner.username
                    : p.appointment?.owner
                      ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() || p.appointment.owner.username
                      : "—";
                  return (
                    <div className="user-card" key={p.id}>
                      <div className="user-card-header">
                        <div className="user-card-avatar">
                          {owner.charAt(0)}
                        </div>
                        <div className="user-card-name">
                          {owner} · {p.appointment?.pet?.name || "—"}
                        </div>
                      </div>
                      <div className="user-card-body">
                        <div className="user-card-row">
                          <span className="user-card-label">Amount</span>
                          <span>{fmtCurrency(p.amount)}</span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Method</span>
                          <span>{p.method || "—"}</span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Status</span>
                          <span
                            className={`status-pill ${STATUS_COLORS[p.status] || ""}`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="user-card-row">
                          <span className="user-card-label">Actions</span>
                          <div className="action-btns">
                            <button
                              className="edit-btn icon-btn"
                              onClick={() => openInvoice(p)}
                            >
                              🧾
                            </button>
                            {p.status === "Paid" && (
                              <button
                                className="suspend-btn icon-btn"
                                onClick={() => handleRefund(p.id)}
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

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
                  <button
                    className="page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    &lsaquo; Prev
                  </button>

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
                      ),
                    )}

                  <button
                    className="page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next &rsaquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Invoice Modal */}
      {(invoiceData || invoiceLoading) && (
        <div className="modal-overlay" onClick={() => setInvoiceData(null)}>
          <div
            className="modal-box invoice-box"
            onClick={(e) => e.stopPropagation()}
          >
            {invoiceLoading ? (
              <p>Loading invoice…</p>
            ) : (
              <>
                <div className="invoice-header">
                  <h3>Payment Invoice</h3>
                  <button className="save-btn" onClick={() => window.print()}>
                    🖨 Print
                  </button>
                </div>
                <div className="invoice-body">
                  {invoiceData.billing ? (() => {
                    const b = invoiceData.billing;
                    const appt = b.appointment || {};
                    const owner = appt.owner
                      ? `${appt.owner.firstName || ""} ${appt.owner.lastName || ""}`.trim() || appt.owner.username
                      : "—";
                    const vet = appt.vet
                      ? `${appt.vet.firstName || ""} ${appt.vet.lastName || ""}`.trim() || appt.vet.username
                      : "—";
                    return (
                      <>
                        <div className="invoice-row">
                          <span>Owner</span>
                          <span>{owner}</span>
                        </div>
                        <div className="invoice-row">
                          <span>Pet</span>
                          <span>{appt.pet?.name || "—"}</span>
                        </div>
                        <div className="invoice-row">
                          <span>Veterinarian</span>
                          <span>{vet}</span>
                        </div>
                        <div className="invoice-row">
                          <span>Appointment</span>
                          <span>
                            {appt.scheduledAt
                              ? new Date(appt.scheduledAt).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                        <div className="invoice-row">
                          <span>Reason</span>
                          <span>{appt.reason || "—"}</span>
                        </div>
                        <hr />
                        <div className="invoice-row">
                          <span>Checkup Fee</span>
                          <span>{fmtCurrency(b.checkupRate)}</span>
                        </div>
                        {Array.isArray(b.usageLines) && b.usageLines.map((line, i) => (
                          <div className="invoice-row" key={i}>
                            <span>
                              {line.inventoryItemName}
                              {line.quantityUsed ? ` × ${line.quantityUsed}` : ""}
                            </span>
                            <span>{fmtCurrency(line.lineTotal)}</span>
                          </div>
                        ))}
                        <hr />
                        <div className="invoice-row total-row">
                          <span>Total</span>
                          <span>
                            {fmtCurrency(b.total ?? invoiceData.payment.amount)}
                          </span>
                        </div>
                      </>
                    );
                  })() : (
                    <>
                      <div className="invoice-row">
                        <span>Amount</span>
                        <span>{fmtCurrency(invoiceData.payment.amount)}</span>
                      </div>
                      <div className="invoice-row">
                        <span>Method</span>
                        <span>{invoiceData.payment.method || "—"}</span>
                      </div>
                      <div className="invoice-row">
                        <span>Status</span>
                        <span>{invoiceData.payment.status}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setInvoiceData(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
