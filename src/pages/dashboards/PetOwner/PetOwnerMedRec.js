import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerMedRec.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getMedicalRecords,
  getMedicalRecordAiInsight,
  getPets,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

// ─── PDF export ───────────────────────────────────────────────────────────────

const printRecord = (record) => {
  const pet = record.pet || {};
  const vet = record.vet
    ? `Dr. ${record.vet.firstName || ""} ${record.vet.lastName || ""}`.trim()
    : "N/A";
  const dateStr = new Date(record.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const followUpStr = record.followUpDate
    ? new Date(record.followUpDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const badgeBg = record.status === "Finalized" ? "#dcfce7" : "#fef9c3";
  const badgeColor = record.status === "Finalized" ? "#166534" : "#854d0e";

  const html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Medical Record — ${pet.name || "Pet"}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#222;max-width:720px;margin:0 auto}
      h1{font-size:20px;color:#255065;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:24px}
      .section{margin-bottom:16px}
      .label{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.05em}
      .value{font-size:14px;color:#333;margin-top:3px;white-space:pre-wrap;min-height:18px}
      .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;background:${badgeBg};color:${badgeColor}}
      hr{border:none;border-top:1px solid #eee;margin:20px 0}
      .footer{margin-top:32px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
      @media print{body{padding:20px}}
    </style>
  </head><body>
    <h1>Medical Record — ${pet.name || "Pet"}</h1>
    <div class="sub">
      ${[pet.species, pet.breed].filter(Boolean).join(" · ")}
      &nbsp;|&nbsp; Date of Visit: ${dateStr}
      &nbsp;|&nbsp; <span class="badge">${record.status}</span>
    </div>
    <div class="section"><div class="label">Veterinarian</div><div class="value">${vet}</div></div>
    <hr/>
    <div class="section"><div class="label">Diagnosis</div><div class="value">${record.diagnosis || "—"}</div></div>
    <div class="section"><div class="label">Treatment Given</div><div class="value">${record.treatment || "—"}</div></div>
    <div class="section"><div class="label">Prescribed Medication</div><div class="value">${record.prescription || "—"}</div></div>
    <div class="section"><div class="label">Veterinarian Notes</div><div class="value">${record.notes || "—"}</div></div>
    ${followUpStr ? `<div class="section"><div class="label">Follow-up Date</div><div class="value">${followUpStr}</div></div>` : ""}
    <div class="footer">
      PawCruz Veterinary Clinic &nbsp;·&nbsp;
      Generated ${new Date().toLocaleString()} &nbsp;·&nbsp;
      Read-only copy for pet owner
    </div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const PetOwnerMedRec = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterPet, setFilterPet] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterSex, setFilterSex] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Expand / AI
  const [expandedId, setExpandedId] = useState(null);
  const [aiModal, setAiModal] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
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
      const [recRes, petRes] = await Promise.all([
        getMedicalRecords(),
        getPets(),
      ]);
      const recs = (recRes.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setRecords(recs);
      setPets(petRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  // ─── AI insight ─────────────────────────────────────────────────────────────

  const openAiInsight = async (record, refresh = false) => {
    setAiModal({ record, insight: null, loading: true, error: "" });
    try {
      const res = await getMedicalRecordAiInsight(record.id, refresh);
      setAiModal({ record, loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || "Failed to generate AI insight",
      }));
    }
  };

  // ─── Filters ────────────────────────────────────────────────────────────────

  const petMap = Object.fromEntries(pets.map((p) => [p.id, p]));
  const speciesOptions = [...new Set(pets.map((p) => p.species).filter(Boolean))];

  const filteredRecords = records.filter((r) => {
    const pet = r.pet || petMap[r.petId] || {};
    if (search && !pet.name?.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterPet && r.petId !== filterPet) return false;
    if (
      filterSpecies &&
      pet.species?.toLowerCase() !== filterSpecies.toLowerCase()
    )
      return false;
    if (filterSex && pet.gender?.toLowerCase() !== filterSex.toLowerCase())
      return false;
    if (filterAge === "young" && (pet.age == null || pet.age > 2)) return false;
    if (
      filterAge === "adult" &&
      (pet.age == null || pet.age < 3 || pet.age > 7)
    )
      return false;
    if (filterAge === "senior" && (pet.age == null || pet.age < 8)) return false;
    if (filterDateFrom && new Date(r.createdAt) < new Date(filterDateFrom))
      return false;
    if (
      filterDateTo &&
      new Date(r.createdAt) > new Date(filterDateTo + "T23:59:59")
    )
      return false;
    return true;
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const vetName = (r) =>
    r.vet
      ? `Dr. ${r.vet.firstName || ""} ${r.vet.lastName || ""}`.trim()
      : "—";

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  // ─── Render ──────────────────────────────────────────────────────────────────

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
          <h2>Medical Records</h2>
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
          {/* Page header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ fontFamily: "Poppins", fontWeight: 600 }}>
              Health History
            </h3>
            <span style={{ color: "#5f6876", fontSize: "0.9rem", fontWeight: 500 }}>
              Records are managed by veterinarians
            </span>
          </div>

          {error && (
            <p style={{ color: "#c62828", marginBottom: 12 }}>{error}</p>
          )}

          {/* ── Filter Bar ──────────────────────────────────────────────── */}
          <div className="medrec-filter-bar">
            {/* Search */}
            <input
              className="medrec-search"
              placeholder="Search by pet name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Pet */}
            <select
              className="medrec-select"
              value={filterPet}
              onChange={(e) => setFilterPet(e.target.value)}
            >
              <option value="">All Pets</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Species */}
            <select
              className="medrec-select"
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
            >
              <option value="">All Species</option>
              {speciesOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sex */}
            <select
              className="medrec-select"
              value={filterSex}
              onChange={(e) => setFilterSex(e.target.value)}
            >
              <option value="">All Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            {/* Age */}
            <select
              className="medrec-select"
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
            >
              <option value="">All Ages</option>
              <option value="young">Young (≤2 yrs)</option>
              <option value="adult">Adult (3–7 yrs)</option>
              <option value="senior">Senior (8+ yrs)</option>
            </select>

            {/* Date range */}
            <input
              type="date"
              className="medrec-date-input"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              title="Visit date from"
            />
            <input
              type="date"
              className="medrec-date-input"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              title="Visit date to"
            />
          </div>

          {/* Count */}
          {!loading && (
            <p className="medrec-count">
              Showing {filteredRecords.length} of {records.length} record
              {records.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* ── Records List ─────────────────────────────────────────────── */}
          {loading ? (
            <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
              Loading records…
            </p>
          ) : filteredRecords.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              }}
            >
              <p style={{ color: "#555" }}>
                {records.length === 0
                  ? "No medical records found yet."
                  : "No records match your filters."}
              </p>
            </div>
          ) : (
            <div className="medrec-list">
              {filteredRecords.map((r) => {
                const pet = r.pet || petMap[r.petId] || {};
                const isExpanded = expandedId === r.id;

                return (
                  <div key={r.id} className="medrec-card">
                    {/* ── Card header ─────────────────────────────────── */}
                    <div
                      className="medrec-card-header"
                      onClick={() => toggleExpand(r.id)}
                    >
                      {/* Avatar */}
                      <div className="medrec-avatar">
                        {pet.name?.charAt(0).toUpperCase() || "?"}
                      </div>

                      {/* Pet info */}
                      <div className="medrec-pet-info">
                        <div className="medrec-pet-name">
                          {pet.name || "Unknown Pet"}
                        </div>
                        <div className="medrec-pet-sub">
                          {[pet.species, pet.breed].filter(Boolean).join(" · ")}
                        </div>
                      </div>

                      {/* Diagnosis preview */}
                      <div className="medrec-diagnosis-preview">
                        {r.diagnosis || "No diagnosis"}
                      </div>

                      {/* Right side */}
                      <div className="medrec-card-right">
                        <span className="medrec-visit-date">
                          {fmtDate(r.createdAt)}
                        </span>
                        <span
                          className={`medrec-status-badge ${
                            r.status === "Finalized"
                              ? "badge-finalized"
                              : "badge-followup"
                          }`}
                        >
                          {r.status}
                        </span>
                        <button
                          className="pdf-btn"
                          title="Download PDF"
                          onClick={(e) => {
                            e.stopPropagation();
                            printRecord(r);
                          }}
                        >
                          🖨 PDF
                        </button>
                        <button
                          className="ai-insight-btn"
                          title="AI Health Insight"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAiInsight(r);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            width="13"
                            height="13"
                            style={{ marginRight: 4 }}
                          >
                            <path
                              d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          </svg>
                          AI
                        </button>
                        <button
                          className={`expand-btn${isExpanded ? " open" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(r.id);
                          }}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* ── Card body (expanded) ─────────────────────────── */}
                    {isExpanded && (
                      <div className="medrec-card-body">
                        <div className="medrec-details-grid">
                          <div className="medrec-field full-width">
                            <span className="medrec-field-label">Diagnosis</span>
                            <span className="medrec-field-value">
                              {r.diagnosis || "—"}
                            </span>
                          </div>
                          <div className="medrec-field">
                            <span className="medrec-field-label">
                              Treatment Given
                            </span>
                            <span className="medrec-field-value">
                              {r.treatment || "—"}
                            </span>
                          </div>
                          <div className="medrec-field">
                            <span className="medrec-field-label">
                              Prescribed Medication
                            </span>
                            <span className="medrec-field-value">
                              {r.prescription || "—"}
                            </span>
                          </div>
                          <div className="medrec-field full-width">
                            <span className="medrec-field-label">
                              Veterinarian Notes
                            </span>
                            <span className="medrec-field-value">
                              {r.notes || "—"}
                            </span>
                          </div>
                          <div className="medrec-field">
                            <span className="medrec-field-label">
                              Veterinarian
                            </span>
                            <span className="medrec-field-value">
                              {vetName(r)}
                            </span>
                          </div>
                          {r.followUpDate && (
                            <div className="medrec-field">
                              <span className="medrec-field-label">
                                Follow-up Date
                              </span>
                              <span className="medrec-field-value">
                                {fmtDate(r.followUpDate)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action footer */}
                        <div className="medrec-card-footer">
                          <button
                            className="medrec-footer-btn medrec-pdf-btn"
                            onClick={() => printRecord(r)}
                          >
                            🖨 Download PDF
                          </button>
                          <button
                            className="medrec-footer-btn medrec-ai-btn"
                            onClick={() => openAiInsight(r)}
                          >
                            ✨ Get AI Insight
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── AI Insight Modal ────────────────────────────────────────────────── */}
      {aiModal && (
        <div className="modal-overlay" onClick={() => setAiModal(null)}>
          <div
            className="modal-box ai-insight-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-insight-header">
              <div className="ai-generated-badge">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  width="14"
                  height="14"
                >
                  <path
                    d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                AI Generated
              </div>
              <h3>Health Insight — {aiModal.record?.pet?.name}</h3>
              <p className="ai-insight-subheading">
                {aiModal.record?.diagnosis}
              </p>
              <p className="ai-insight-subheading">
                Analyzed from full medical history across all records.
              </p>
            </div>

            {aiModal.loading && (
              <div className="ai-insight-loading">
                <div className="ai-loading-spinner" />
                <span>Generating health insight…</span>
              </div>
            )}

            {aiModal.error && (
              <p className="ai-insight-error">{aiModal.error}</p>
            )}

            {!aiModal.loading && aiModal.insight && (
              <div className="ai-insight-body">
                <div className="ai-insight-content">
                  {aiModal.insight
                    .split("\n")
                    .map((line, i) =>
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />,
                    )}
                </div>
                <div className="ai-disclaimer">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    width="14"
                    height="14"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 8v4m0 4h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {aiModal.disclaimer}
                </div>
                <div className="ai-meta">
                  {aiModal.aiModel} &middot;{" "}
                  {new Date(aiModal.generatedAt).toLocaleString()}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {!aiModal.loading && aiModal.insight && (
                <button
                  className="cancel-btn"
                  onClick={() => openAiInsight(aiModal.record, true)}
                >
                  Refresh
                </button>
              )}
              <button className="save-btn" onClick={() => setAiModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerMedRec;
