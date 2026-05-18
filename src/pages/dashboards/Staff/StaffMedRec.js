import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetMedRec.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMedicalRecords, getAvailableVets, sendMessage, getUsers } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const REC_LIMIT = 10;

const CORRECTION_REASONS = [
  "Typographical Error",
  "Duplicate Entries",
  "Ownership Transfer",
  "Wrong Species",
];

const StaffMedRec = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [vets, setVets] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [search, setSearch] = useState("");
  const [recDateFrom, setRecDateFrom] = useState("");
  const [recDateTo, setRecDateTo] = useState("");
  const [recVetFilter, setRecVetFilter] = useState("");
  const [recPage, setRecPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Correction modal state
  const [correctionRec, setCorrectionRec] = useState(null);
  const [correctionReason, setCorrectionReason] = useState(CORRECTION_REASONS[0]);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [correctionSending, setCorrectionSending] = useState(false);
  const [correctionError, setCorrectionError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [recordRes, vetRes, adminRes] = await Promise.all([
        getMedicalRecords({ includeArchived: false }),
        getAvailableVets(),
        getUsers({ role: "admin", limit: 1 }),
      ]);
      setRecords(recordRes.data || []);
      setVets(vetRes.data || []);
      const admins = adminRes.data?.users || adminRes.data || [];
      if (admins.length > 0) setAdminId(admins[0].id);
    } catch {
      setError("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  // Filter records
  const selectedPetId = searchParams.get("petId");
  const filtered = useMemo(() => {
    return records.filter((rec) => {
      if (selectedPetId && rec.petId !== selectedPetId) return false;
      const q = search.toLowerCase();
      const matchSearch =
        (rec.pet?.name || "").toLowerCase().includes(q) ||
        (rec.id || "").toLowerCase().includes(q) ||
        (rec.diagnosis || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (recVetFilter && rec.vetId !== recVetFilter) return false;
      if (recDateFrom && new Date(rec.createdAt) < new Date(recDateFrom)) return false;
      if (recDateTo && new Date(rec.createdAt) > new Date(recDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [records, selectedPetId, search, recVetFilter, recDateFrom, recDateTo]);

  const recTotalPages = Math.max(1, Math.ceil(filtered.length / REC_LIMIT));
  const paginated = filtered.slice((recPage - 1) * REC_LIMIT, recPage * REC_LIMIT);

  const openCorrection = (rec) => {
    setCorrectionRec(rec);
    setCorrectionReason(CORRECTION_REASONS[0]);
    setCorrectionNotes("");
    setCorrectionError("");
  };

  const closeCorrection = () => {
    setCorrectionRec(null);
    setCorrectionError("");
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!adminId) {
      setCorrectionError("No admin user found to send correction request to.");
      return;
    }
    setCorrectionSending(true);
    setCorrectionError("");
    try {
      const petName = correctionRec.pet?.name || "Unknown";
      const recId = `REC-${correctionRec.id.slice(-6).toUpperCase()}`;
      const body = `[Correction Request]\nRecord: ${recId} — ${petName}\nReason: ${correctionReason}\n${correctionNotes ? `Notes: ${correctionNotes}` : ""}`;
      await sendMessage({ receiverId: adminId, body });
      closeCorrection();
    } catch (err) {
      setCorrectionError(err.response?.data?.message || "Failed to send correction request.");
    } finally {
      setCorrectionSending(false);
    }
  };

  return (
    <div className="dashboard-container">
      <StaffSidebar isOpen={isOpen} onClose={close} />

      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <h2>Medical Records</h2>
          <div className="top-bar-right">
            <button className="notif-btn" onClick={() => navigate("/staff-notifications")}>
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="User" profilePath="/staff-profile" />
          </div>
        </header>

        <section className="content-body">
          <div className="records-list-card">
            <div className="records-filters">
              <input
                type="text"
                placeholder="Search by ID, pet name, or diagnosis..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setRecPage(1); }}
              />
              <select
                className="rec-filter-select"
                value={recVetFilter}
                onChange={(e) => { setRecVetFilter(e.target.value); setRecPage(1); }}
              >
                <option value="">All Vets</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`${v.firstName || ""} ${v.lastName || ""}`.trim() || v.username}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="rec-date-input"
                value={recDateFrom}
                title="From date"
                onChange={(e) => { setRecDateFrom(e.target.value); setRecPage(1); }}
              />
              <input
                type="date"
                className="rec-date-input"
                value={recDateTo}
                title="To date"
                onChange={(e) => { setRecDateTo(e.target.value); setRecPage(1); }}
              />
              {(recVetFilter || recDateFrom || recDateTo) && (
                <button className="rec-reset-btn" onClick={() => { setRecVetFilter(""); setRecDateFrom(""); setRecDateTo(""); setRecPage(1); }}>
                  Reset
                </button>
              )}
              <button className="new-entry-btn" onClick={() => navigate("/staff-pets")}>
                Back to Pets
              </button>
            </div>

            {/* Desktop table */}
            <div className="table-desktop">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Diagnosis</th>
                    <th>Treatment</th>
                    <th>Prescription</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((rec) => (
                    <tr key={rec.id}>
                      <td className="record-id">REC-{rec.id.slice(-6).toUpperCase()}</td>
                      <td>
                        {rec.pet?.name}
                        <br />
                        <small className="species-meta">{rec.pet?.species || ""}</small>
                      </td>
                      <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td>{rec.diagnosis}</td>
                      <td>{rec.treatment || "—"}</td>
                      <td>{rec.prescription || "—"}</td>
                      <td>
                        <span className={`status-pill ${rec.status?.toLowerCase()}`}>{rec.status}</span>
                      </td>
                      <td>
                        <button
                          className="rec-correction-btn"
                          onClick={() => openCorrection(rec)}
                          title="Request correction"
                        >
                          Request Correction
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="table-mobile table-cards-list">
              {paginated.map((rec) => (
                <div className="record-card" key={rec.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">
                      <div className="record-card-id">REC-{rec.id.slice(-6).toUpperCase()}</div>
                      <div className="record-card-patient">
                        {rec.pet?.name} ({rec.pet?.species || "N/A"})
                      </div>
                    </div>
                    <span className={`status-pill ${rec.status?.toLowerCase()}`}>{rec.status}</span>
                  </div>
                  <div className="record-card-body">
                    <div className="record-card-row">
                      <span className="record-card-label">Date</span>
                      <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Diagnosis</span>
                      <span className="record-card-diagnosis">{rec.diagnosis}</span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Treatment</span>
                      <span>{rec.treatment || "—"}</span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Prescription</span>
                      <span>{rec.prescription || "—"}</span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Action</span>
                      <button className="rec-correction-btn" onClick={() => openCorrection(rec)}>
                        Request Correction
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && <p className="list-feedback">Loading medical records...</p>}
            {!loading && filtered.length === 0 && <p className="list-feedback">No medical records found.</p>}
            {error && <p className="list-error">{error}</p>}

            {/* Pagination */}
            {recTotalPages > 1 && (
              <div className="rec-pagination">
                <button className="rec-page-btn" disabled={recPage === 1} onClick={() => setRecPage((p) => p - 1)}>Prev</button>
                <span className="rec-page-info">Page {recPage} of {recTotalPages} ({filtered.length} records)</span>
                <button className="rec-page-btn" disabled={recPage === recTotalPages} onClick={() => setRecPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Request Correction Modal */}
      {correctionRec && (
        <div className="modal-overlay" onClick={closeCorrection}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitCorrection} className="user-modal-form">
              <h3>Request Record Correction</h3>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
                Record: <strong>REC-{correctionRec.id.slice(-6).toUpperCase()}</strong> —{" "}
                {correctionRec.pet?.name}
              </p>
              <div className="form-group">
                <label>Reason <span style={{ color: "#e53e3e" }}>*</span></label>
                <select
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  required
                >
                  {CORRECTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  rows={3}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  style={{ resize: "vertical", fontFamily: "Poppins, sans-serif", fontSize: "13px" }}
                />
              </div>
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                This will send a correction request to the admin via the messaging system.
              </p>
              {correctionError && <p className="modal-error">{correctionError}</p>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeCorrection}>Cancel</button>
                <button type="submit" className="save-btn" disabled={correctionSending}>
                  {correctionSending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMedRec;
