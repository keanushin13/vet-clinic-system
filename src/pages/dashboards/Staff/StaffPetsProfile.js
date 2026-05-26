import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffPetsProfile.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getPets,
  createPet,
  updatePet,
  deletePet,
  restorePet,
  getStaffClients,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const SPECIES_OPTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Fish",
  "Turtle",
  "Horse",
  "Goat",
  "Pig",
  "Ferret",
  "Chinchilla",
  "Hedgehog",
  "Sugar Glider",
  "Snake",
  "Lizard",
  "Amphibian",
  "Exotic Pet",
  "Other",
];

const BREED_OPTIONS_BY_SPECIES = {
  Dog: [
    "Aspin",
    "Mixed Breed",
    "Labrador Retriever",
    "Golden Retriever",
    "German Shepherd",
    "Shih Tzu",
    "Poodle",
    "Pomeranian",
    "Chihuahua",
    "Beagle",
    "Siberian Husky",
    "Other",
  ],
  Cat: [
    "Puspin",
    "Domestic Shorthair",
    "Domestic Longhair",
    "Persian",
    "Siamese",
    "Maine Coon",
    "Bengal",
    "British Shorthair",
    "Ragdoll",
    "Other",
  ],
  Bird: [
    "Parakeet",
    "Cockatiel",
    "Lovebird",
    "Canary",
    "Finch",
    "Parrot",
    "Macaw",
    "Cockatoo",
    "Other",
  ],
  Rabbit: [
    "Holland Lop",
    "Mini Rex",
    "Netherland Dwarf",
    "Lionhead",
    "Flemish Giant",
    "Mixed Breed",
    "Other",
  ],
  Hamster: [
    "Syrian",
    "Dwarf Campbell",
    "Winter White",
    "Roborovski",
    "Chinese",
    "Other",
  ],
  "Guinea Pig": [
    "American",
    "Abyssinian",
    "Peruvian",
    "Silkie",
    "Teddy",
    "Other",
  ],
  Fish: ["Betta", "Goldfish", "Guppy", "Molly", "Koi", "Tetra", "Other"],
  Turtle: [
    "Red-Eared Slider",
    "Box Turtle",
    "Painted Turtle",
    "Map Turtle",
    "Other",
  ],
  Horse: ["Thoroughbred", "Arabian", "Quarter Horse", "Pony", "Other"],
  Goat: ["Boer", "Nubian", "Saanen", "Alpine", "Native", "Other"],
  Pig: ["Pot-bellied", "Mini Pig", "Native Pig", "Other"],
  Ferret: ["Standard", "Angora", "Other"],
  Chinchilla: ["Standard Grey", "Beige", "White", "Black Velvet", "Other"],
  Hedgehog: ["African Pygmy", "Algerian", "Other"],
  "Sugar Glider": ["Standard Grey", "Leucistic", "Mosaic", "Other"],
  Snake: [
    "Ball Python",
    "Corn Snake",
    "King Snake",
    "Milk Snake",
    "Boa Constrictor",
    "Other",
  ],
  Lizard: [
    "Bearded Dragon",
    "Leopard Gecko",
    "Crested Gecko",
    "Iguana",
    "Skink",
    "Other",
  ],
  Amphibian: ["Frog", "Toad", "Salamander", "Axolotl", "Newt", "Other"],
  "Exotic Pet": [
    "Reptile",
    "Small Mammal",
    "Arachnid",
    "Insect",
    "Marsupial",
    "Other",
  ],
  Other: ["Mixed Breed", "Unknown", "Other"],
};

const PETS_PER_PAGE = 10;

const ownerDisplayName = (owner) => {
  if (!owner) return "";
  return (
    `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() ||
    owner.username ||
    owner.email ||
    "Pet Owner"
  );
};

const StaffPetsProfile = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    age: "",
    gender: "",
    status: "Healthy",
    notes: "",
    ownerId: "",
  });

  const loadPets = () =>
    getPets()
      .then((r) => setPets(r.data))
      .catch(() => setPets([]));

  const loadOwners = () =>
    getStaffClients()
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : r.data?.users || [];
        setOwners(data.filter((o) => o.isActive));
      })
      .catch(() => setOwners([]));

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadPets();
    loadOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPets = pets.filter((pet) => {
    const q = search.toLowerCase().trim();
    const matchesStatus =
      statusFilter === "all" || pet.status === statusFilter;
    const ownerName = pet.owner
      ? `${pet.owner.firstName || ""} ${pet.owner.lastName || ""} ${pet.owner.username || ""}`
      : "";
    const matchesSearch =
      !q ||
      (pet.name || "").toLowerCase().includes(q) ||
      (pet.breed || "").toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPets.length / PETS_PER_PAGE)
  );
  const paginatedPets = filteredPets.slice(
    (page - 1) * PETS_PER_PAGE,
    page * PETS_PER_PAGE
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const openCreate = () => {
    setError("");
    setSelectedPet(null);
    setForm({
      name: "",
      species: "",
      breed: "",
      age: "",
      gender: "",
      status: "Healthy",
      notes: "",
      ownerId: owners[0]?.id || "",
    });
    setModalMode("create");
  };

  const openEdit = (pet) => {
    setError("");
    setSelectedPet(pet);
    setForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      age: pet.age ?? "",
      gender: pet.gender || "",
      status: pet.status || "Healthy",
      notes: pet.notes || "",
      ownerId: pet.ownerId || "",
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedPet(null);
    setError("");
  };

  const openDeleteConfirm = (pet) => {
    setError("");
    setSelectedPet(pet);
    setModalMode("confirmDelete");
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "species" ? { breed: "" } : {}),
    }));
  };

  const requiredInputClass = (value) =>
    String(value ?? "").trim() ? "" : "input-invalid";

  const selectedOwner =
    owners.find((owner) => String(owner.id) === String(form.ownerId)) ||
    selectedPet?.owner ||
    null;
  const speciesOptions =
    form.species && !SPECIES_OPTIONS.includes(form.species)
      ? [form.species, ...SPECIES_OPTIONS]
      : SPECIES_OPTIONS;
  const baseBreedOptions = BREED_OPTIONS_BY_SPECIES[form.species] || [];
  const breedOptions =
    form.breed && !baseBreedOptions.includes(form.breed)
      ? [form.breed, ...baseBreedOptions]
      : baseBreedOptions;

  const isPetFormValid =
    form.name.trim() &&
    form.species &&
    form.breed.trim() &&
    String(form.age).trim() &&
    form.gender &&
    form.status &&
    form.ownerId;

  const submitPet = async (e) => {
    e.preventDefault();
    if (!isPetFormValid) {
      setError("Please complete all required fields before saving.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        age: form.age === "" ? null : Number(form.age),
      };

      if (modalMode === "create") {
        await createPet(payload);
      } else if (modalMode === "edit" && selectedPet) {
        await updatePet(selectedPet.id, payload);
      }

      closeModal();
      await loadPets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pet");
    } finally {
      setSaving(false);
    }
  };

  const archiveToggle = async (pet) => {
    try {
      if (pet.isArchived) await restorePet(pet.id);
      else await deletePet(pet.id);
      await loadPets();
    } catch {
      setError("Failed to update pet status");
    }
  };

  const confirmDeletePet = async () => {
    if (!selectedPet) return;

    setSaving(true);
    setError("");
    try {
      await deletePet(selectedPet.id);
      closeModal();
      await loadPets();
    } catch {
      setError("Failed to delete pet");
    } finally {
      setSaving(false);
    }
  };

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
          <h2>Pets Profile</h2>
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

        <section className="content-body">
          <div className="pets-mgmt-header">
            <div className="pet-search-bar">
              <input
                type="text"
                placeholder="Search by pet name, breed, or owner..."
                value={search}
                onChange={handleSearchChange}
              />
              <select
                className="pet-status-filter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                aria-label="Filter by pet status"
              >
                <option value="all">All Status</option>
                <option value="Healthy">Healthy</option>
                <option value="UnderTreatment">Under Treatment</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
            <button className="add-pet-btn" onClick={openCreate}>
              + Register Pet
            </button>
          </div>

          {/* Desktop table & Mobile cards */}
          <>
            {/* Desktop Table */}
            <div className="pets-table-card table-desktop">
              <table className="pets-table">
                <thead>
                  <tr>
                    <th>Pet Name</th>
                    <th>Owner</th>
                    <th>Breed</th>
                    <th>Gender / Age</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#888", padding: "24px" }}>
                        No pets found.
                      </td>
                    </tr>
                  ) : (
                    paginatedPets.map((pet) => (
                    <tr key={pet.id}>
                      <td>
                        <div className="pet-name-cell">
                          <div className="pet-avatar-placeholder">
                            {pet.name?.charAt(0) || "?"}
                          </div>
                          <span>{pet.name}</span>
                        </div>
                      </td>
                      <td>
                        {pet.owner
                          ? `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() ||
                            pet.owner.username
                          : "—"}
                      </td>
                      <td>{pet.breed || "—"}</td>
                      <td>
                        {pet.gender || "—"}
                        {pet.age !== null && pet.age !== undefined
                          ? ` / ${pet.age} yr(s)`
                          : ""}
                      </td>
                      <td>
                        <span
                          className={`pet-status-tag ${pet.status?.toLowerCase().replace(/ /g, "-")}`}
                        >
                          {pet.status}
                        </span>
                      </td>
                      <td>
                        <div className="pet-action-btns">
                          <button
                            className="btn-view-records icon-btn"
                            onClick={() =>
                              navigate(`/staff-medical-records?petId=${pet.id}`)
                            }
                            title="View records"
                            aria-label="View records"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M7 4h8l4 4v12H7z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M15 4v4h4M10 12h6M10 16h6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="btn-edit-pet icon-btn"
                            onClick={() => openEdit(pet)}
                            title="Edit pet"
                            aria-label="Edit pet"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M4 20h4l10-10-4-4L4 16v4z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 6l4 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="btn-remove-pet icon-btn"
                            onClick={() =>
                              pet.isArchived
                                ? archiveToggle(pet)
                                : openDeleteConfirm(pet)
                            }
                            title={
                              pet.isArchived ? "Restore pet" : "Archive pet"
                            }
                            aria-label={
                              pet.isArchived ? "Restore pet" : "Archive pet"
                            }
                          >
                            {pet.isArchived ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M8 7H5l3-3m-3 3 3 3"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 7h8a5 5 0 1 1 0 10h-2"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="table-mobile table-cards-list">
              {filteredPets.length === 0 ? (
                <div className="pets-card">
                  <div className="pets-card-body">
                    <div className="pets-card-row">
                      <span>No pets found.</span>
                    </div>
                  </div>
                </div>
              ) : (
                paginatedPets.map((pet) => (
                <div className="pets-card" key={pet.id}>
                  <div className="pets-card-header">
                    <div className="pets-card-avatar">
                      {pet.name?.charAt(0) || "?"}
                    </div>
                    <div className="pets-card-name">{pet.name}</div>
                  </div>
                  <div className="pets-card-body">
                    <div className="pets-card-row">
                      <span className="pets-card-label">Owner</span>
                      <span>
                        {pet.owner
                          ? `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() ||
                            pet.owner.username
                          : "—"}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Breed</span>
                      <span>{pet.breed || "—"}</span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Gender / Age</span>
                      <span>
                        {pet.gender || "—"}
                        {pet.age !== null && pet.age !== undefined
                          ? ` / ${pet.age} yr(s)`
                          : ""}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Status</span>
                      <span
                        className={`pet-status-tag ${pet.status?.toLowerCase().replace(/ /g, "-")}`}
                      >
                        {pet.status}
                      </span>
                    </div>
                    <div className="pets-card-row">
                      <span className="pets-card-label">Actions</span>
                      <div className="pet-action-btns">
                        <button
                          className="btn-view-records icon-btn"
                          onClick={() =>
                            navigate(`/staff-medical-records?petId=${pet.id}`)
                          }
                          title="View records"
                          aria-label="View records"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M7 4h8l4 4v12H7z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15 4v4h4M10 12h6M10 16h6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-edit-pet icon-btn"
                          onClick={() => openEdit(pet)}
                          title="Edit pet"
                          aria-label="Edit pet"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 20h4l10-10-4-4L4 16v4z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 6l4 4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-remove-pet icon-btn"
                          onClick={() =>
                            pet.isArchived
                              ? archiveToggle(pet)
                              : openDeleteConfirm(pet)
                          }
                          title={pet.isArchived ? "Restore pet" : "Archive pet"}
                          aria-label={
                            pet.isArchived ? "Restore pet" : "Archive pet"
                          }
                        >
                          {pet.isArchived ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M8 7H5l3-3m-3 3 3 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 7h8a5 5 0 1 1 0 10h-2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
            {filteredPets.length > PETS_PER_PAGE && (
              <div className="pagination-row">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages} ({filteredPets.length} pet
                  {filteredPets.length !== 1 ? "s" : ""})
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        </section>
      </main>

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-box${
              modalMode === "confirmDelete" ? " pet-delete-modal-box" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {modalMode === "confirmDelete" && selectedPet ? (
              <div className="delete-confirm-modal">
                <div className="delete-confirm-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 9v4m0 4h.01M10.3 4.8 2.7 18a1.6 1.6 0 0 0 1.4 2.4h15.8a1.6 1.6 0 0 0 1.4-2.4L13.7 4.8a1.9 1.9 0 0 0-3.4 0Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="delete-confirm-copy">
                  <h3>Delete Pet?</h3>
                  <p>
                    This will remove <strong>{selectedPet.name}</strong> from
                    the active pet list.
                  </p>
                </div>
                <div className="delete-pet-summary">
                  <div>
                    <span>Owner</span>
                    <strong>{ownerDisplayName(selectedPet.owner) || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Breed</span>
                    <strong>{selectedPet.breed || "N/A"}</strong>
                  </div>
                </div>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions delete-confirm-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="delete-confirm-btn"
                    onClick={confirmDeletePet}
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete Pet"}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={submitPet} className="user-modal-form">
              <h3>{modalMode === "create" ? "Register Pet" : "Edit Pet"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Name <span className="required-mark">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className={requiredInputClass(form.name)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Species <span className="required-mark">*</span>
                  </label>
                  <select
                    name="species"
                    value={form.species}
                    onChange={onChange}
                    className={requiredInputClass(form.species)}
                    required
                  >
                    <option value="">Select species</option>
                    {speciesOptions.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Breed <span className="required-mark">*</span>
                  </label>
                  <select
                    name="breed"
                    value={form.breed}
                    onChange={onChange}
                    className={requiredInputClass(form.breed)}
                    disabled={!form.species}
                    required
                  >
                    <option value="">
                      {form.species ? "Select breed" : "Select species first"}
                    </option>
                    {breedOptions.map((breed) => (
                      <option key={breed} value={breed}>
                        {breed}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Age <span className="required-mark">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={onChange}
                    className={requiredInputClass(form.age)}
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Gender <span className="required-mark">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={onChange}
                    className={requiredInputClass(form.gender)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Status <span className="required-mark">*</span>
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className={requiredInputClass(form.status)}
                    required
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="UnderTreatment">Under Treatment</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>
                  Owner <span className="required-mark">*</span>
                </label>
                {modalMode === "edit" ? (
                  <input
                    value={ownerDisplayName(selectedOwner)}
                    className="readonly-input"
                    readOnly
                    required
                  />
                ) : (
                  <select
                    name="ownerId"
                    value={form.ownerId}
                    onChange={onChange}
                    className={requiredInputClass(form.ownerId)}
                    required
                  >
                    <option value="">Select owner</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {ownerDisplayName(owner)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                />
              </div>
              {error && <p className="modal-error">{error}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving || !isPetFormValid}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPetsProfile;
