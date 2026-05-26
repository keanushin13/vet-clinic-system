import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getPets } from "../../../api/api";
import "../../../css/OwnerPets.css";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffOwnerPets = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const owner = location.state?.owner || null;

  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "staff") {
      navigate("/login");
      return;
    }
    getPets({ ownerId: id })
      .then((r) =>
        setPets(Array.isArray(r.data) ? r.data : r.data?.pets || [])
      )
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ownerName = owner
    ? owner.firstName
      ? `${owner.firstName} ${owner.lastName || ""}`.trim()
      : owner.username
    : "Pet Owner";

  const filteredPets = pets.filter((pet) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (pet.name || "").toLowerCase().includes(q) ||
      (pet.species || "").toLowerCase().includes(q) ||
      (pet.breed || "").toLowerCase().includes(q)
    );
  });

  const statusClass = (status) => {
    if (!status) return "";
    return status.toLowerCase().replace(/\s+/g, "");
  };

  const statusLabel = (status) =>
    status === "UnderTreatment" ? "Under Treatment" : status || "No status";

  const genderAge = (pet) => {
    const gender = pet.gender || "Not set";
    const age =
      pet.age !== null && pet.age !== undefined ? `${pet.age} yr(s)` : "Age N/A";
    return `${gender} / ${age}`;
  };

  const healthyPets = pets.filter((pet) => pet.status === "Healthy").length;
  const underCarePets = pets.filter(
    (pet) => pet.status === "UnderTreatment"
  ).length;

  return (
    <div className="dashboard-container">
      <StaffSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Client Pets</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Profile"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body staff-owner-pets">
          <div className="staff-owner-hero">
            <button
              className="staff-owner-back"
              onClick={() => navigate("/staff-users")}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Clients
            </button>

            <div className="staff-owner-summary">
              <div className="owner-avatar-lg staff-owner-avatar">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div className="staff-owner-copy">
                <span className="staff-owner-eyebrow">Client Pet Records</span>
                <h3>{ownerName}</h3>
                <div className="staff-owner-meta">
                  {owner?.email && <span>{owner.email}</span>}
                  {owner?.phone && <span>{owner.phone}</span>}
                  {owner && (
                    <span
                      className={`owner-status-tag ${
                        owner.isActive ? "active" : "inactive"
                      }`}
                    >
                      {owner.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="staff-owner-stats">
              <div className="staff-owner-stat">
                <span>Total Pets</span>
                <strong>{pets.length}</strong>
              </div>
              <div className="staff-owner-stat">
                <span>Healthy</span>
                <strong>{healthyPets}</strong>
              </div>
              <div className="staff-owner-stat">
                <span>Under Care</span>
                <strong>{underCarePets}</strong>
              </div>
            </div>
          </div>

          <div className="staff-pets-toolbar">
            <div>
              <h3>Registered Pets</h3>
              <span>
                Showing {filteredPets.length} of {pets.length}
              </span>
            </div>
            <label className="staff-pets-search">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search pet name, species, or breed"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="op-loading">Loading pets...</div>
          ) : filteredPets.length === 0 ? (
            <div className="op-empty-state">
              <p>
                {search
                  ? "No pets match your search."
                  : "This client has no registered pets yet."}
              </p>
            </div>
          ) : (
            <div className="staff-pet-grid">
              {filteredPets.map((pet) => (
                <article key={pet.id} className="staff-pet-box">
                  <div className="staff-pet-box-header">
                    <div className="staff-pet-avatar">
                      {pet.image ? (
                        <img src={pet.image} alt={pet.name} />
                      ) : (
                        (pet.name || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="staff-pet-title">
                      <h4>{pet.name || "Unnamed Pet"}</h4>
                      <span
                        className={`op-status-tag ${statusClass(pet.status)}`}
                      >
                        {statusLabel(pet.status)}
                      </span>
                    </div>
                  </div>

                  <div className="staff-pet-details">
                    <div>
                      <span>Species</span>
                      <strong>{pet.species || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Breed</span>
                      <strong>{pet.breed || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Gender / Age</span>
                      <strong>{genderAge(pet)}</strong>
                    </div>
                    <div>
                      <span>Weight</span>
                      <strong>
                        {pet.weight !== null && pet.weight !== undefined
                          ? `${pet.weight} kg`
                          : "N/A"}
                      </strong>
                    </div>
                  </div>

                  <div className="staff-pet-notes">
                    <span>Notes</span>
                    <p>{pet.notes || "No notes available."}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StaffOwnerPets;
