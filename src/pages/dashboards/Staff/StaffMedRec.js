import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetMedRec.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMedicalRecords } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffMedRec = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const recordRes = await getMedicalRecords({ includeArchived: false });
      setRecords(recordRes.data || []);
    } catch {
      setError("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  // Filter records by petId if provided in query params
  const selectedPetId = searchParams.get("petId");
  const filteredRecords = records.filter((rec) => {
    if (selectedPetId && rec.petId !== selectedPetId) return false;
    const q = search.toLowerCase();
    const petName = rec.pet?.name?.toLowerCase() || "";
    return (
      petName.includes(q) ||
      (rec.id || "").toLowerCase().includes(q) ||
      (rec.diagnosis || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-container">
      <StaffSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN CONTENT */}
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
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="records-list-card">
            <div className="records-filters">
              <input
                type="text"
                placeholder="Search by Patient ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="new-entry-btn"
                onClick={() => navigate("/staff-pets")}
              >
                Back to Pets
              </button>
            </div>

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
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="record-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </td>
                      <td>
                        {rec.pet?.name} <br />
                        <small className="species-meta">
                          {rec.pet?.species || ""}
                        </small>
                      </td>
                      <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td>{rec.diagnosis}</td>
                      <td>{rec.treatment || "—"}</td>
                      <td>{rec.prescription || "—"}</td>
                      <td>
                        <span
                          className={`status-pill ${rec.status?.toLowerCase()}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-mobile table-cards-list">
              {filteredRecords.map((rec) => (
                <div className="record-card" key={rec.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">
                      <div className="record-card-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </div>
                      <div className="record-card-patient">
                        {rec.pet?.name} ({rec.pet?.species || "N/A"})
                      </div>
                    </div>
                    <span
                      className={`status-pill ${rec.status?.toLowerCase()}`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="record-card-body">
                    <div className="record-card-row">
                      <span className="record-card-label">Date</span>
                      <span>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Diagnosis</span>
                      <span className="record-card-diagnosis">
                        {rec.diagnosis}
                      </span>
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
                      <span className="record-card-label">Status</span>
                      <span
                        className={`status-pill ${rec.status?.toLowerCase()}`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <p className="list-feedback">Loading medical records...</p>
            )}
            {!loading && !filteredRecords.length && (
              <p className="list-feedback">No medical records found.</p>
            )}
            {error && <p className="list-error">{error}</p>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffMedRec;
