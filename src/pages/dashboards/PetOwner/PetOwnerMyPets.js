import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerMyPets.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createPet,
  deletePet,
  getAppointments,
  getMedicalRecords,
  getPets,
  updatePet,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const getPetStatus = (pet, appointments) => {
  const now = new Date();
  const petAppts = appointments.filter((a) => a.petId === pet.id);
  if (pet.status === "UnderTreatment") return "Under Treatment";
  if (
    petAppts.find(
      (a) => a.status === "Confirmed" && new Date(a.scheduledAt) >= now,
    )
  )
    return "Upcoming Appointment";
  if (petAppts.find((a) => a.status === "Pending"))
    return "Waiting for Confirmation";
  if (petAppts.some((a) => a.status === "Completed")) return "Completed Visit";
  return "No Appointment";
};

const STATUS_BADGE_CLASS = {
  "No Appointment": "badge-gray",
  "Waiting for Confirmation": "badge-orange",
  "Upcoming Appointment": "badge-blue",
  "Under Treatment": "badge-red-orange",
  "Completed Visit": "badge-green",
};

const getVaccinationStatus = (petRecords) => {
  if (!petRecords.length) return "Missing";
  const sorted = [...petRecords].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const latest = sorted[0];
  const text = [
    latest.diagnosis,
    latest.treatment,
    latest.prescription,
    latest.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!text.includes("vaccin")) return "Missing";
  if (latest.followUpDate && new Date(latest.followUpDate) < new Date())
    return "Due";
  return "Up to date";
};

const getLastVisit = (petId, appointments) => {
  const completed = appointments
    .filter((a) => a.petId === petId && a.status === "Completed")
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  return completed[0]?.scheduledAt || null;
};

const getNextCheckup = (petId, appointments) => {
  const now = new Date();
  const upcoming = appointments
    .filter(
      (a) =>
        a.petId === petId &&
        a.status === "Confirmed" &&
        new Date(a.scheduledAt) > now,
    )
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return upcoming[0]?.scheduledAt || null;
};

const hasReminder = (pet, appointments, records) => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const soonAppt = appointments.find(
    (a) =>
      a.petId === pet.id &&
      a.status === "Confirmed" &&
      new Date(a.scheduledAt) >= now &&
      new Date(a.scheduledAt) <= in7Days,
  );
  if (soonAppt) return true;
  const petRecs = records.filter((r) => r.petId === pet.id);
  const vacc = getVaccinationStatus(petRecs);
  return vacc === "Due" || vacc === "Missing";
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const OTHER_OPTION = "Other";

const BASE_SPECIES_OPTIONS = [
  "Dog",
  "Cat",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Chinchilla",
  "Ferret",
  "Hedgehog",
  "Sugar Glider",
  "Bird",
  "Parrot",
  "Cockatiel",
  "Budgerigar",
  "Canary",
  "Finch",
  "Chicken",
  "Duck",
  "Turtle",
  "Tortoise",
  "Lizard",
  "Gecko",
  "Iguana",
  "Bearded Dragon",
  "Snake",
  "Fish",
  "Frog",
  "Salamander",
  "Horse",
  "Goat",
  "Pig",
  "Exotic Mammal",
  "Reptile",
  "Amphibian",
];

const BREED_OPTIONS_BY_SPECIES = {
  Dog: [
    "Mixed Breed",
    "Aspin",
    "Labrador Retriever",
    "Golden Retriever",
    "German Shepherd",
    "Shih Tzu",
    "Poodle",
    "Chihuahua",
    "Pomeranian",
    "Siberian Husky",
    "Beagle",
    "Dachshund",
    "Bulldog",
    "Rottweiler",
    "Unknown",
  ],
  Cat: [
    "Mixed Breed",
    "Puspin",
    "Domestic Shorthair",
    "Domestic Longhair",
    "Persian",
    "Siamese",
    "Maine Coon",
    "British Shorthair",
    "Ragdoll",
    "Bengal",
    "Scottish Fold",
    "Sphynx",
    "Unknown",
  ],
  Rabbit: [
    "Mixed Breed",
    "Holland Lop",
    "Netherland Dwarf",
    "Lionhead",
    "Mini Rex",
    "Flemish Giant",
    "Angora",
    "Unknown",
  ],
  Hamster: [
    "Syrian",
    "Dwarf Campbell",
    "Winter White",
    "Roborovski",
    "Chinese",
    "Unknown",
  ],
  "Guinea Pig": [
    "American",
    "Abyssinian",
    "Peruvian",
    "Teddy",
    "Silkie",
    "Skinny Pig",
    "Unknown",
  ],
  Chinchilla: ["Standard Gray", "Ebony", "Beige", "White", "Violet", "Unknown"],
  Ferret: ["Sable", "Albino", "Cinnamon", "Champagne", "Panda", "Unknown"],
  Hedgehog: ["African Pygmy", "Algerian", "Pinto", "Albino", "Unknown"],
  "Sugar Glider": ["Classic Gray", "Leucistic", "Mosaic", "White Face", "Unknown"],
  Bird: [
    "Parrot",
    "Cockatiel",
    "Budgerigar",
    "Canary",
    "Finch",
    "Lovebird",
    "Conure",
    "Unknown",
  ],
  Parrot: ["African Grey", "Macaw", "Amazon", "Cockatoo", "Conure", "Unknown"],
  Cockatiel: ["Normal Grey", "Lutino", "Pearl", "Pied", "Cinnamon", "Unknown"],
  Budgerigar: ["Standard", "English", "Lutino", "Albino", "Pied", "Unknown"],
  Canary: ["Song Canary", "Color Canary", "Type Canary", "Unknown"],
  Finch: ["Zebra Finch", "Society Finch", "Gouldian Finch", "Unknown"],
  Chicken: ["Native", "Silkie", "Bantam", "Leghorn", "Rhode Island Red", "Unknown"],
  Duck: ["Mallard", "Pekin", "Muscovy", "Runner", "Khaki Campbell", "Unknown"],
  Turtle: ["Red-Eared Slider", "Painted Turtle", "Box Turtle", "Map Turtle", "Unknown"],
  Tortoise: ["Sulcata", "Greek", "Russian", "Leopard", "Red-Footed", "Unknown"],
  Lizard: ["Bearded Dragon", "Leopard Gecko", "Crested Gecko", "Iguana", "Skink", "Unknown"],
  Gecko: ["Leopard Gecko", "Crested Gecko", "Tokay Gecko", "Day Gecko", "Unknown"],
  Iguana: ["Green Iguana", "Red Iguana", "Blue Iguana", "Unknown"],
  "Bearded Dragon": ["Central", "Rankin's", "German Giant", "Leatherback", "Unknown"],
  Snake: ["Ball Python", "Corn Snake", "Kingsnake", "Milk Snake", "Boa", "Unknown"],
  Fish: ["Betta", "Goldfish", "Guppy", "Koi", "Molly", "Tetra", "Cichlid", "Unknown"],
  Frog: ["Pacman Frog", "Tree Frog", "Dart Frog", "African Dwarf Frog", "Unknown"],
  Salamander: ["Axolotl", "Tiger Salamander", "Fire Salamander", "Newt", "Unknown"],
  Horse: ["Thoroughbred", "Arabian", "Quarter Horse", "Pony", "Mixed Breed", "Unknown"],
  Goat: ["Boer", "Nubian", "Alpine", "Saanen", "Native", "Unknown"],
  Pig: ["Mini Pig", "Pot-Bellied", "Kunekune", "Native", "Unknown"],
  "Exotic Mammal": ["Mixed/Unknown", "Small Mammal", "Marsupial", "Primate", "Other Exotic"],
  Reptile: ["Lizard", "Snake", "Turtle", "Tortoise", "Monitor", "Unknown"],
  Amphibian: ["Frog", "Toad", "Salamander", "Newt", "Axolotl", "Unknown"],
};

const buildOptionList = (...groups) => {
  const options = new Map();

  groups.flat().forEach((value) => {
    const label = String(value || "").trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (key === OTHER_OPTION.toLowerCase()) return;
    if (!options.has(key)) options.set(key, label);
  });

  return [...options.values(), OTHER_OPTION];
};

const getBreedBaseOptions = (species) => {
  const speciesKey = Object.keys(BREED_OPTIONS_BY_SPECIES).find(
    (key) => key.toLowerCase() === String(species || "").trim().toLowerCase(),
  );

  return speciesKey ? BREED_OPTIONS_BY_SPECIES[speciesKey] : ["Mixed Breed", "Unknown"];
};

const emptyForm = {
  name: "",
  species: "",
  customSpecies: "",
  breed: "",
  customBreed: "",
  gender: "",
  age: "",
  birthday: "",
  weight: "",
  image: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

const PetOwnerMyPets = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [favorites, setFavorites] = useState(() =>
    JSON.parse(localStorage.getItem("po_fav_pets") || "[]"),
  );

  const [selectedPet, setSelectedPet] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterSex, setFilterSex] = useState("");
  const [filterAge, setFilterAge] = useState("");

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [petsRes, apptRes, recRes] = await Promise.all([
        getPets(),
        getAppointments(),
        getMedicalRecords(),
      ]);
      setPets(petsRes.data || []);
      setAppointments(apptRes.data || []);
      setRecords(recRes.data || []);
    } catch {
      setError("Failed to load pets data.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Favorites ──────────────────────────────────────────────────────────────

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem("po_fav_pets", JSON.stringify(next));
      return next;
    });
  };

  // ─── Filters ────────────────────────────────────────────────────────────────

  const speciesOptions = buildOptionList(
    BASE_SPECIES_OPTIONS,
    pets.map((p) => p.species),
  );
  const selectedSpeciesForBreed =
    form.species === OTHER_OPTION ? form.customSpecies : form.species;
  const breedOptions = buildOptionList(
    getBreedBaseOptions(selectedSpeciesForBreed),
    pets
      .filter(
        (pet) =>
          selectedSpeciesForBreed &&
          pet.species?.toLowerCase() ===
            selectedSpeciesForBreed.toLowerCase(),
      )
      .map((pet) => pet.breed),
  );

  const filteredPets = pets.filter((pet) => {
    const petRecords = records.filter((r) => r.petId === pet.id);
    if (search && !pet.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterCategory === "has-records" && !petRecords.length) return false;
    if (filterCategory === "favorites" && !favorites.includes(pet.id))
      return false;
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
    return true;
  });

  // ─── Modal handlers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (pet) => {
    setEditing(pet);
    setForm({
      name: pet.name || "",
      species: pet.species || "",
      customSpecies: "",
      breed: pet.breed || "",
      customBreed: "",
      gender: pet.gender || "",
      age: pet.age != null ? String(pet.age) : "",
      birthday: pet.birthday ? pet.birthday.slice(0, 10) : "",
      weight: pet.weight != null ? String(pet.weight) : "",
      image: pet.image || "",
      notes: pet.notes || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const onSelectImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((p) => ({ ...p, image: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const submitPet = async (e) => {
    e.preventDefault();
    const speciesValue =
      form.species === OTHER_OPTION
        ? form.customSpecies.trim()
        : form.species.trim();
    const breedValue =
      form.breed === OTHER_OPTION ? form.customBreed.trim() : form.breed.trim();

    if (!form.name.trim() || !speciesValue) {
      setFormError("Name and Species are required.");
      return;
    }
    if (form.breed === OTHER_OPTION && !breedValue) {
      setFormError("Please specify the breed or clear the breed field.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        species: speciesValue,
        breed: breedValue || null,
        gender: form.gender || null,
        age: form.age !== "" ? Number(form.age) : null,
        birthday: form.birthday || null,
        weight: form.weight !== "" ? parseFloat(form.weight) : null,
        image: form.image || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await updatePet(editing.id, payload);
      } else {
        await createPet(payload);
      }
      setShowModal(false);
      setSelectedPet(null);
      await loadAll();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save pet.");
    } finally {
      setSaving(false);
    }
  };

  const archivePet = async (pet) => {
    if (!window.confirm(`Remove ${pet.name} from your pet list?`)) return;
    try {
      await deletePet(pet.id);
      if (selectedPet?.id === pet.id) setSelectedPet(null);
      await loadAll();
    } catch {
      setError("Failed to remove pet.");
    }
  };

  const bookAppointmentForPet = (pet) => {
    navigate("/pet-owner-appointments", {
      state: {
        openBooking: true,
        petId: pet.id,
      },
    });
  };

  // ─── Avatar sub-component ────────────────────────────────────────────────────

  const PetAvatar = ({ pet, size = 72 }) => {
    if (pet.image) {
      return (
        <img
          src={pet.image}
          alt={pet.name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #c9eaf7",
          }}
        />
      );
    }
    return (
      <div
        className="pet-avatar-initials"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {pet.name?.charAt(0).toUpperCase() || "?"}
      </div>
    );
  };

  // ─── Detail panel ────────────────────────────────────────────────────────────

  const DetailPanel = ({ pet }) => {
    const petRecords = records.filter((r) => r.petId === pet.id);
    const sortedRecs = [...petRecords].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    const latestRec = sortedRecs[0];
    const vaccStatus = getVaccinationStatus(petRecords);
    const lastVisit = getLastVisit(pet.id, appointments);
    const nextCheckup = getNextCheckup(pet.id, appointments);
    const activeCondition =
      latestRec?.status === "FollowUp" ? latestRec.diagnosis : null;
    const isFav = favorites.includes(pet.id);

    return (
      <div className="pet-detail-panel">
        {/* Gradient header */}
        <div className="pet-detail-header">
          <button
            className="detail-back-btn"
            onClick={() => setSelectedPet(null)}
          >
            ← Back to Pets
          </button>
          <PetAvatar pet={pet} size={90} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>{pet.name}</h3>
              <button
                className={`fav-btn${isFav ? " active" : ""}`}
                style={{ position: "static", fontSize: "1.3rem", color: isFav ? "#e76f51" : "rgba(255,255,255,0.5)" }}
                onClick={() => toggleFavorite(pet.id)}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                ♥
              </button>
            </div>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: "0.88rem" }}>
              {[pet.species, pet.breed].filter(Boolean).join(" · ")}
              {pet.gender ? ` · ${pet.gender}` : ""}
            </p>
            <p style={{ margin: "2px 0 0", opacity: 0.75, fontSize: "0.82rem" }}>
              {[
                pet.age != null
                  ? `${pet.age} yr${pet.age !== 1 ? "s" : ""}`
                  : null,
                pet.weight != null ? `${pet.weight} kg` : null,
                pet.birthday ? `Born ${fmtDate(pet.birthday)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="detail-edit-btn" onClick={() => openEdit(pet)}>
              Edit
            </button>
            <button
              className="detail-delete-btn"
              onClick={() => archivePet(pet)}
            >
              Remove
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="pet-detail-body">
          {/* Health Snapshot */}
          <div className="health-snapshot-card">
            <h5>🩺 Health Snapshot</h5>
            <div className="snapshot-row">
              <span>Vaccination Status</span>
              <span
                className={
                  vaccStatus === "Up to date"
                    ? "vacc-up-to-date"
                    : vaccStatus === "Due"
                    ? "vacc-due"
                    : "vacc-missing"
                }
              >
                {vaccStatus}
              </span>
            </div>
            <div className="snapshot-row">
              <span>Last Visit</span>
              <span>{fmtDate(lastVisit)}</span>
            </div>
            <div className="snapshot-row">
              <span>Next Scheduled Check-up</span>
              <span>{fmtDate(nextCheckup)}</span>
            </div>
            <div className="snapshot-row">
              <span>Active Conditions</span>
              <span style={{ color: activeCondition ? "#c62828" : "#888" }}>
                {activeCondition || "None noted"}
              </span>
            </div>
            {petRecords.length > 0 && (
              <div className="snapshot-row">
                <span>Medical Records</span>
                <span style={{ color: "#2e7d32", fontWeight: 600 }}>
                  {petRecords.length} record
                  {petRecords.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Appointment actions */}
          <div className="detail-actions">
            <button
              className="detail-view-appt-btn"
              onClick={() => navigate("/pet-owner-appointments")}
            >
              📅 View Appointments
            </button>
            <button
              className="detail-book-appt-btn"
              onClick={() => bookAppointmentForPet(pet)}
            >
              ＋ Book Appointment
            </button>
          </div>

          {/* Notes */}
          {pet.notes && (
            <div className="detail-notes">
              <h5>Notes</h5>
              <p>{pet.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────

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
          <h2>My Pets</h2>
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
          {error && <p className="pets-error">{error}</p>}

          {/* ── Filter Bar ──────────────────────────────────────────────── */}
          <div className="pets-filter-bar">
            <input
              className="pets-search-input"
              placeholder="Search by pet name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {["all", "has-records", "favorites"].map((cat) => (
              <button
                key={cat}
                className={`filter-tab${filterCategory === cat ? " active" : ""}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat === "all"
                  ? "All Pets"
                  : cat === "has-records"
                  ? "Has Records"
                  : "♥ Favorites"}
              </button>
            ))}

            <select
              className="filter-select"
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

            <select
              className="filter-select"
              value={filterSex}
              onChange={(e) => setFilterSex(e.target.value)}
            >
              <option value="">All Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              className="filter-select"
              value={filterAge}
              onChange={(e) => setFilterAge(e.target.value)}
            >
              <option value="">All Ages</option>
              <option value="young">Young (≤2 yrs)</option>
              <option value="adult">Adult (3–7 yrs)</option>
              <option value="senior">Senior (8+ yrs)</option>
            </select>

            <button className="add-pet-btn" onClick={openCreate}>
              + Add Pet
            </button>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          {loading ? (
            <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
              Loading pets…
            </p>
          ) : selectedPet ? (
            <DetailPanel pet={selectedPet} />
          ) : filteredPets.length === 0 ? (
            <div className="pets-empty">
              <p>
                No pets found.{" "}
                {pets.length === 0
                  ? "Add your first pet to get started!"
                  : "Try adjusting your filters."}
              </p>
              {pets.length === 0 && (
                <button className="add-pet-btn" onClick={openCreate}>
                  + Add Pet
                </button>
              )}
            </div>
          ) : (
            <div className="pets-grid">
              {filteredPets.map((pet) => {
                const petRecords = records.filter((r) => r.petId === pet.id);
                const status = getPetStatus(pet, appointments);
                const reminder = hasReminder(pet, appointments, petRecords);
                const isFav = favorites.includes(pet.id);

                return (
                  <div key={pet.id} className="pet-card">
                    <button
                      className={`fav-btn${isFav ? " active" : ""}`}
                      onClick={() => toggleFavorite(pet.id)}
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                    >
                      ♥
                    </button>

                    <PetAvatar pet={pet} />

                    {(reminder || petRecords.length > 0) && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {reminder && (
                          <span className="reminder-badge">🔔 Reminder</span>
                        )}
                        {petRecords.length > 0 && (
                          <span className="records-badge">
                            <span className="has-records-dot" />
                            Records
                          </span>
                        )}
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "#255065",
                        }}
                      >
                        {pet.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#777",
                          marginTop: 2,
                        }}
                      >
                        {[pet.species, pet.breed].filter(Boolean).join(" · ")}
                      </div>
                      {(pet.gender || pet.age != null) && (
                        <div
                          style={{
                            fontSize: "0.74rem",
                            color: "#999",
                            marginTop: 1,
                          }}
                        >
                          {[
                            pet.gender,
                            pet.age != null ? `${pet.age} yr${pet.age !== 1 ? "s" : ""}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>

                    <span
                      className={`pet-status-badge ${
                        STATUS_BADGE_CLASS[status] || "badge-gray"
                      }`}
                    >
                      {status}
                    </span>

                    <div className="pet-card-actions">
                      <button
                        className="btn-view-detail"
                        onClick={() => setSelectedPet(pet)}
                      >
                        View Details
                      </button>
                      <button
                        className="btn-book-appt"
                        onClick={() => bookAppointmentForPet(pet)}
                      >
                        Book Appt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-box pet-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitPet} className="user-modal-form">
              <h3>{editing ? `Edit ${editing.name}` : "Add New Pet"}</h3>

              {/* Image upload */}
              <div className="avatar-upload-wrap">
                <div className="avatar-preview-frame">
                  {form.image ? (
                    <img src={form.image} alt="Preview" className="avatar-preview" />
                  ) : (
                    <div
                      className="pet-avatar-initials avatar-preview"
                      style={{ fontSize: "1.6rem" }}
                    >
                      {form.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                  )}
                </div>
                <div className="pet-photo-actions">
                  <label className="upload-btn" htmlFor="pet-photo-input">
                    Choose Photo
                  </label>
                  <input
                    id="pet-photo-input"
                    className="pet-file-input"
                    type="file"
                    accept="image/*"
                    onChange={onSelectImage}
                  />
                  <span className="upload-file-state">
                    {form.image ? "Photo selected" : "JPG, PNG, or WEBP"}
                  </span>
                  {form.image && (
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => setForm((p) => ({ ...p, image: "" }))}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Name | Species */}
              <div className="form-row">
                <div className="form-group">
                  <label>Pet Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Buddy"
                  />
                </div>
                <div className="form-group">
                  <label>Species *</label>
                  <input
                    required
                    list="pet-species-options"
                    value={form.species}
                    onChange={(e) => {
                      const nextSpecies = e.target.value;
                      setForm((p) => ({
                        ...p,
                        species: nextSpecies,
                        customSpecies:
                          nextSpecies === OTHER_OPTION ? p.customSpecies : "",
                        breed: "",
                        customBreed: "",
                      }));
                    }}
                    placeholder="Select or type species"
                  />
                  <datalist id="pet-species-options">
                    {speciesOptions.map((species) => (
                      <option key={species} value={species} />
                    ))}
                  </datalist>
                  {form.species === OTHER_OPTION && (
                    <input
                      required
                      className="other-pet-input"
                      value={form.customSpecies}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          customSpecies: e.target.value,
                          breed: "",
                          customBreed: "",
                        }))
                      }
                      placeholder="Type pet species"
                    />
                  )}
                </div>
              </div>

              {/* Breed | Sex */}
              <div className="form-row">
                <div className="form-group">
                  <label>Breed</label>
                  <input
                    list="pet-breed-options"
                    value={form.breed}
                    onChange={(e) => {
                      const nextBreed = e.target.value;
                      setForm((p) => ({
                        ...p,
                        breed: nextBreed,
                        customBreed:
                          nextBreed === OTHER_OPTION ? p.customBreed : "",
                      }));
                    }}
                    disabled={!selectedSpeciesForBreed.trim()}
                    placeholder={
                      selectedSpeciesForBreed.trim()
                        ? "Select or type breed"
                        : "Choose species first"
                    }
                  />
                  <datalist id="pet-breed-options">
                    {breedOptions.map((breed) => (
                      <option key={breed} value={breed} />
                    ))}
                  </datalist>
                  {form.breed === OTHER_OPTION && (
                    <input
                      className="other-pet-input"
                      value={form.customBreed}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          customBreed: e.target.value,
                        }))
                      }
                      placeholder="Type breed"
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Sex</label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gender: e.target.value }))
                    }
                  >
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Age | Weight */}
              <div className="form-row">
                <div className="form-group">
                  <label>Age (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.age}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, age: e.target.value }))
                    }
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, weight: e.target.value }))
                    }
                    placeholder="e.g. 5.2"
                  />
                </div>
              </div>

              {/* Birthday */}
              <div className="form-row">
                <div className="form-group">
                  <label>Birthday</label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, birthday: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group" />
              </div>

              {/* Status — edit only, read-only */}
              {editing && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editing.status || "Healthy"}
                    disabled
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="UnderTreatment">Under Treatment</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                  <span style={{ fontSize: "11px", color: "#999" }}>
                    Status is managed by the clinic staff.
                  </span>
                </div>
              )}

              {/* Notes */}
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Any additional notes…"
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              {formError && <p className="modal-error">{formError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Pet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerMyPets;
