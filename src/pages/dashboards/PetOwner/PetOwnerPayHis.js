import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerPayHis.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getPayments } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const LIMIT = 10;

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("en-PH") : "—";
}

function fmtCurrency(n) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(n || 0));
}

function statusClass(s) {
  return (
    { Paid: "pay-status-paid", Pending: "pay-status-pending", Refunded: "pay-status-refunded" }[s] || ""
  );
}

function printReceipt(p) {
  const statusColor = { paid: "#166534", pending: "#854d0e", refunded: "#991b1b" };
  const statusBg   = { paid: "#dcfce7",  pending: "#fef9c3", refunded: "#fee2e2" };
  const key = (p.status || "").toLowerCase();

  const optionalRows = [
    p.reference
      ? `<tr><td class="td-lbl">Reference #</td><td class="td-val">${p.reference}</td></tr>`
      : "",
    p.appointment?.scheduledAt
      ? `<tr><td class="td-lbl">Appointment Date</td><td class="td-val">${fmtDate(p.appointment.scheduledAt)}</td></tr>`
      : "",
    p.notes
      ? `<tr><td class="td-lbl">Notes</td><td class="td-val" style="font-style:italic;color:#555">${p.notes}</td></tr>`
      : "",
  ].join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt — ${p.service || "Payment"}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#1a1a1a}
    .page{max-width:580px;margin:0 auto;padding:40px 48px}

    /* ── header ── */
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #255065;margin-bottom:26px}
    .clinic-name{font-size:20px;font-weight:700;color:#255065;letter-spacing:.3px}
    .clinic-sub{font-size:11px;color:#63b6c5;margin-top:3px}
    .badge{background:#255065;color:#fff;padding:5px 13px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px}

    /* ── meta grid ── */
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:26px}
    .m-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#999;margin-bottom:1px}
    .m-val{font-size:13px;font-weight:500;word-break:break-all}

    /* ── billing table ── */
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead th{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#999;padding:0 0 7px;border-bottom:1px solid #ddd}
    thead th:last-child{text-align:right}
    .td-lbl{font-size:13px;color:#555;padding:9px 0;border-bottom:1px solid #f3f3f3;width:55%}
    .td-val{font-size:13px;font-weight:500;text-align:right;padding:9px 0;border-bottom:1px solid #f3f3f3}
    .tr-total .td-lbl,.tr-total .td-val{border-top:2px solid #255065;border-bottom:none;padding-top:12px;font-size:15px;font-weight:700;color:#255065}

    /* ── status chip ── */
    .chip{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px}

    /* ── footer ── */
    .footer{margin-top:30px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:9px;color:#bbb}

    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <div>
      <div class="clinic-name">PawCruz Veterinary Clinic</div>
      <div class="clinic-sub">Official Payment Receipt</div>
    </div>
    <div class="badge">Receipt</div>
  </div>

  <div class="meta">
    <div><div class="m-lbl">Transaction ID</div><div class="m-val" style="font-size:11px">${p.id}</div></div>
    <div><div class="m-lbl">Date Issued</div><div class="m-val">${fmtDate(p.createdAt)}</div></div>
    <div><div class="m-lbl">Pet Name</div><div class="m-val">${p.pet?.name || "—"}</div></div>
    <div><div class="m-lbl">Payment Method</div><div class="m-val">${p.method || "—"}</div></div>
  </div>

  <table>
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td class="td-lbl">${p.service || "Veterinary Service"}</td><td class="td-val">${fmtCurrency(p.amount)}</td></tr>
      ${optionalRows}
      <tr class="tr-total"><td class="td-lbl">Total Amount</td><td class="td-val">${fmtCurrency(p.amount)}</td></tr>
    </tbody>
  </table>

  <div style="margin-bottom:20px">
    <span style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#999;margin-right:8px">Status</span>
    <span class="chip" style="background:${statusBg[key]||"#f3f4f6"};color:${statusColor[key]||"#374151"}">${p.status || "—"}</span>
  </div>

  <div class="footer">
    <span>PawCruz Veterinary Clinic</span>
    <span>Generated ${new Date().toLocaleString("en-PH")} &middot; Read-only copy</span>
  </div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

const PetOwnerPayHis = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    setLoading(true);
    getPayments()
      .then((r) => setPayments(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError(
            "Your account is suspended or inactive. Please contact the clinic for assistance."
          );
        } else {
          setError("Failed to load payment history. Please try again later.");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const hit = [p.service, p.pet?.name, p.method, p.reference].some(
          (f) => f?.toLowerCase().includes(q)
        );
        if (!hit) return false;
      }
      if (statusFilter && p.status !== statusFilter) return false;
      if (dateFrom && new Date(p.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(p.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [payments, search, statusFilter, dateFrom, dateTo]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amount || 0), 0),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const printSummary = () => {
    document.body.classList.add("printing");
    window.print();
    // Remove class after print dialog closes
    setTimeout(() => document.body.classList.remove("printing"), 500);
  };

  return (
    <div className="dashboard-container">
      <PetOwnerSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Payment History</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/pet-owner-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/pet-owner-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div
            className="payment-header-action"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontFamily: "Poppins", fontWeight: "600" }}>
              Transaction History
            </h3>
          </div>

          {/* Filter bar */}
          <div className="pay-toolbar">
            <input
              className="pay-search"
              placeholder="Search service, pet, method…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              className="pay-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
            <input
              type="date"
              className="pay-date-input"
              value={dateFrom}
              title="From date"
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <input
              type="date"
              className="pay-date-input"
              value={dateTo}
              title="To date"
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
            <button className="pay-reset-btn" onClick={resetFilters}>
              Reset
            </button>
          </div>

          {/* Summary row */}
          {!loading && !error && (
            <div className="pay-summary-row">
              <span className="pay-count">
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              </span>
              <button
                className="pay-download-btn"
                onClick={() => setShowSummary(true)}
                disabled={filtered.length === 0}
              >
                Download Summary
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <p className="pay-loading">Loading transactions…</p>
          ) : error ? (
            <div className="pay-error-card">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="pay-empty-card">
              {payments.length === 0
                ? "No transaction history available. Your receipts and invoices will be listed here after payment."
                : "No transactions match your current filters."}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {paginated.map((p) => (
                  <div key={p.id} className="pay-card">
                    <div className="pay-card-left">
                      <strong>{p.service || "—"}</strong>
                      <div className="pay-card-meta">
                        {p.pet?.name || "—"} &middot; {fmtDate(p.createdAt)}
                      </div>
                      <div className="pay-card-method">{p.method || "—"}</div>
                    </div>
                    <div className="pay-card-right">
                      <div className="pay-amount">{fmtCurrency(p.amount)}</div>
                      <span className={`pay-status-badge ${statusClass(p.status)}`}>
                        {p.status}
                      </span>
                      <br />
                      <button
                        className="pay-receipt-btn"
                        onClick={() => printReceipt(p)}
                      >
                        View Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pay-pagination">
                  <button
                    className="pay-page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="pay-page-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="pay-page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Summary Modal */}
        {showSummary && (
          <div
            className="pay-modal-overlay"
            onClick={() => setShowSummary(false)}
          >
            <div
              className="pay-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pay-modal-header">
                <h3>Payment History Summary</h3>
              </div>

              <div className="receipt-print-area">
                <div className="receipt-clinic-name">PawCruz Veterinary Clinic</div>
                <div className="receipt-clinic-sub">Payment History Summary</div>

                {(dateFrom || dateTo) && (
                  <div className="receipt-date-range">
                    Period:{" "}
                    {dateFrom ? fmtDate(dateFrom) : "—"} to{" "}
                    {dateTo ? fmtDate(dateTo) : "present"}
                  </div>
                )}

                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Pet</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>{fmtDate(p.createdAt)}</td>
                        <td>{p.service || "—"}</td>
                        <td>{p.pet?.name || "—"}</td>
                        <td>{p.method || "—"}</td>
                        <td>{p.status}</td>
                        <td>{fmtCurrency(p.amount)}</td>
                      </tr>
                    ))}
                    <tr className="summary-total-row">
                      <td colSpan={5}>
                        <strong>Total ({filtered.length} transaction{filtered.length !== 1 ? "s" : ""})</strong>
                      </td>
                      <td>
                        <strong>{fmtCurrency(totalAmount)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="receipt-footer">
                  PawCruz Veterinary Clinic &middot; Generated{" "}
                  {new Date().toLocaleString()} &middot; Read-only
                </div>
              </div>

              <div className="pay-modal-actions">
                <button
                  className="pay-modal-close-btn"
                  onClick={() => setShowSummary(false)}
                >
                  Close
                </button>
                <button
                  className="pay-modal-print-btn"
                  onClick={printSummary}
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PetOwnerPayHis;
