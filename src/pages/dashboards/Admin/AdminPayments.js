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
import bellIcon from "../../../assets/Bell_Icon.png";
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
  const LIMIT = 15;

  // Invoice modal
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      const r = await getPayments(params);
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
  }, [statusFilter, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
  }, [user, navigate, load]);

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const owner = p.appointment?.owner
      ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.toLowerCase()
      : "";
    return (
      owner.includes(q) ||
      (p.appointment?.pet?.name || "").toLowerCase().includes(q) ||
      (p.method || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

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
          <div className="appt-card">
            <div className="appt-toolbar">
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
                      const owner = p.appointment?.owner
                        ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() ||
                          p.appointment.owner.username
                        : "—";
                      const pet = p.appointment?.pet?.name || "—";
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
                  const owner = p.appointment?.owner
                    ? `${p.appointment.owner.firstName || ""} ${p.appointment.owner.lastName || ""}`.trim() ||
                      p.appointment.owner.username
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
                  {invoiceData.billing ? (
                    <>
                      <div className="invoice-row">
                        <span>Owner</span>
                        <span>{invoiceData.billing.ownerName || "—"}</span>
                      </div>
                      <div className="invoice-row">
                        <span>Pet</span>
                        <span>{invoiceData.billing.petName || "—"}</span>
                      </div>
                      <div className="invoice-row">
                        <span>Veterinarian</span>
                        <span>{invoiceData.billing.vetName || "—"}</span>
                      </div>
                      <div className="invoice-row">
                        <span>Appointment</span>
                        <span>
                          {invoiceData.billing.scheduledAt
                            ? new Date(
                                invoiceData.billing.scheduledAt,
                              ).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                      <div className="invoice-row">
                        <span>Diagnosis</span>
                        <span>{invoiceData.billing.diagnosis || "—"}</span>
                      </div>
                      <hr />
                      {Array.isArray(invoiceData.billing.items) &&
                        invoiceData.billing.items.map((item, i) => (
                          <div className="invoice-row" key={i}>
                            <span>{item.name}</span>
                            <span>{fmtCurrency(item.total)}</span>
                          </div>
                        ))}
                      <hr />
                      <div className="invoice-row total-row">
                        <span>Total</span>
                        <span>
                          {fmtCurrency(
                            invoiceData.billing.total ??
                              invoiceData.payment.amount,
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
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
