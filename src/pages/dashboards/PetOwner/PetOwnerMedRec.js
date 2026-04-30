import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerMedRec.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMedicalRecords, getMedicalRecordAiInsight } from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const PetOwnerMedRec = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiModal, setAiModal] = useState(null); // { record, insight, loading, error }

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
      const recordRes = await getMedicalRecords();
      setRecords(recordRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  const openAiInsight = async (record) => {
    setAiModal({ record, insight: null, loading: true, error: "" });
    try {
      const res = await getMedicalRecordAiInsight(record.id);
      setAiModal({ record, loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || "Failed to generate AI insight",
      }));
    }
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ fontFamily: "Poppins", fontWeight: "600" }}>
              Health History
            </h3>
            <span
              style={{
                color: "#5f6876",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Records are managed by veterinarians
            </span>
          </div>

          {loading && <p>Loading records...</p>}
          {error && (
            <p style={{ color: "#c62828", marginBottom: "10px" }}>{error}</p>
          )}

          {!loading && records.length === 0 ? (
            <div
              className="dashboard-welcome-card"
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "15px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              }}
            >
              <p style={{ color: "#555" }}>No medical records found yet.</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {records.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#255065" }}>
                        {r.pet?.name}
                      </strong>
                      <div style={{ color: "#666", fontSize: "0.85rem" }}>
                        {r.diagnosis}
                      </div>
                      <div style={{ color: "#888", fontSize: "0.8rem" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          background:
                            r.status === "Finalized" ? "#dcfce7" : "#fef9c3",
                          color:
                            r.status === "Finalized" ? "#166534" : "#854d0e",
                        }}
                      >
                        {r.status}
                      </span>
                      <button
                        className="ai-insight-btn"
                        onClick={() => openAiInsight(r)}
                        title="Get AI Health Insight"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          width="14"
                          height="14"
                          style={{ marginRight: "5px" }}
                        >
                          <path
                            d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                        AI Insight
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

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
                <span>Generating health insight...</span>
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
