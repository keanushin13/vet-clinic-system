import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getPets } from "../../../api/api";
import "../../../css/OwnerPets.css";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const AdminOwnerPets = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  // Owner info passed via navigate state from AdminUserManagement
  const owner = location.state?.owner || null;

  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/login");
      return;
    }
    getPets({ ownerId: id })
      .then((r) => setPets(r.data))
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
          <h2>Client Pets</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin Profile"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {/* Owner info card */}
          <div className="owner-header-card">
            <div className="owner-avatar-lg">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="owner-header-info">
              <h3>{ownerName}</h3>
              <div className="owner-header-meta">
                {owner?.email && <span>{owner.email}</span>}
                {owner?.username && <span>@{owner.username}</span>}
                {owner && (
                  <span
                    className={`owner-status-tag ${owner.isVerified ? "active" : "inactive"}`}
                  >
                    {owner.isVerified ? "Active" : "Unverified"}
                  </span>
                )}
                <span>{pets.length} Pet(s)</span>
              </div>
            </div>
          </div>

          {/* Page header row */}
          <div className="owner-pets-header">
            <button
              className="back-btn"
              onClick={() => navigate("/admin-users")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Users
            </button>
            <h3>Registered Pets</h3>
          </div>

          {/* Search */}
          <div className="owner-pets-search">
            <input
              type="text"
              placeholder="Search by pet name, species, or breed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Desktop table / Mobile cards */}
          {loading ? (
            <div className="op-loading">Loading pets…</div>
          ) : filteredPets.length === 0 ? (
            <div className="op-empty-state">
              <p>
                {search
                  ? "No pets match your search."
                  : "This client has no registered pets yet."}
              </p>
            </div>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="owner-pets-table-card op-desktop-only">
                <table className="owner-pets-table">
                  <thead>
                    <tr>
                      <th>Pet Name</th>
                      <th>Species</th>
                      <th>Breed</th>
                      <th>Gender / Age</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPets.map((pet) => (
                      <tr key={pet.id}>
                        <td>
                          <div className="op-pet-name-cell">
                            <div className="op-pet-avatar">
                              {pet.image ? (
                                <img src={pet.image} alt={pet.name} />
                              ) : (
                                (pet.name || "?").charAt(0).toUpperCase()
                              )}
                            </div>
                            <span>{pet.name}</span>
                          </div>
                        </td>
                        <td>{pet.species || "—"}</td>
                        <td>{pet.breed || "—"}</td>
                        <td>
                          {pet.gender || "—"}
                          {pet.age !== null && pet.age !== undefined
                            ? ` / ${pet.age} yr(s)`
                            : ""}
                        </td>
                        <td>
                          <span
                            className={`op-status-tag ${statusClass(pet.status)}`}
                          >
                            {pet.status === "UnderTreatment"
                              ? "Under Treatment"
                              : pet.status || "—"}
                          </span>
                        </td>
                        <td>{pet.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="op-cards-list op-mobile-only">
                {filteredPets.map((pet) => (
                  <div key={pet.id} className="op-pet-card">
                    <div className="op-pet-card-header">
                      <div className="op-pet-avatar">
                        {pet.image ? (
                          <img src={pet.image} alt={pet.name} />
                        ) : (
                          (pet.name || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="op-pet-card-title">
                        <span className="op-pet-card-name">{pet.name}</span>
                        <span
                          className={`op-status-tag ${statusClass(pet.status)}`}
                        >
                          {pet.status === "UnderTreatment"
                            ? "Under Treatment"
                            : pet.status || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="op-pet-card-body">
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Species</span>
                        <span>{pet.species || "—"}</span>
                      </div>
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Breed</span>
                        <span>{pet.breed || "—"}</span>
                      </div>
                      <div className="op-pet-card-row">
                        <span className="op-card-label">Gender / Age</span>
                        <span>
                          {pet.gender || "—"}
                          {pet.age !== null && pet.age !== undefined
                            ? ` / ${pet.age} yr(s)`
                            : ""}
                        </span>
                      </div>
                      {pet.notes && (
                        <div className="op-pet-card-row">
                          <span className="op-card-label">Notes</span>
                          <span>{pet.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminOwnerPets;
