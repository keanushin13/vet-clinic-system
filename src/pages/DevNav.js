import { useNavigate } from "react-router-dom";

const MOCK_USERS = {
  admin: { id: 1, name: "Dev Admin", role: "admin", email: "admin@dev.local" },
  veterinarian: {
    id: 2,
    name: "Dev Vet",
    role: "veterinarian",
    email: "vet@dev.local",
  },
  staff: { id: 3, name: "Dev Staff", role: "staff", email: "staff@dev.local" },
  pet_owner: {
    id: 4,
    name: "Dev Owner",
    role: "pet_owner",
    email: "owner@dev.local",
  },
};

const ROUTES = [
  { label: "Admin Dashboard", path: "/admin", role: "admin" },
  { label: "Admin Users", path: "/admin-users", role: "admin" },
  { label: "Admin Messages", path: "/admin-messages", role: "admin" },
  { label: "Admin Notifications", path: "/admin-notifications", role: "admin" },
  { label: "Admin Profile", path: "/admin-profile", role: "admin" },

  { label: "Vet Dashboard", path: "/vet", role: "veterinarian" },
  { label: "Vet Patients", path: "/vet-patients", role: "veterinarian" },
  { label: "Vet Calendar", path: "/vet-calendar", role: "veterinarian" },
  { label: "Vet Messages", path: "/vet-messages", role: "veterinarian" },
  {
    label: "Vet Medical Records",
    path: "/vet-medical-records",
    role: "veterinarian",
  },
  { label: "Vet Inventory", path: "/vet-inventory", role: "veterinarian" },
  {
    label: "Vet Notifications",
    path: "/vet-notifications",
    role: "veterinarian",
  },
  { label: "Vet Profile", path: "/vet-profile", role: "veterinarian" },

  { label: "Staff Dashboard", path: "/staff", role: "staff" },
  { label: "Staff Appointments", path: "/staff-appointments", role: "staff" },
  { label: "Staff Users", path: "/staff-users", role: "staff" },
  { label: "Staff Pets", path: "/staff-pets", role: "staff" },
  { label: "Staff Messages", path: "/staff-messages", role: "staff" },
  { label: "Staff Inventory", path: "/staff-inventory", role: "staff" },
  { label: "Staff Payments", path: "/staff-payments", role: "staff" },
  { label: "Staff Activity Log", path: "/staff-activity", role: "staff" },
  { label: "Staff Notifications", path: "/staff-notifications", role: "staff" },
  { label: "Staff Profile", path: "/staff-profile", role: "staff" },

  { label: "Pet Owner Dashboard", path: "/pet-owner", role: "pet_owner" },
  {
    label: "Pet Owner Appointments",
    path: "/pet-owner-appointments",
    role: "pet_owner",
  },
  { label: "Pet Owner Pets", path: "/pet-owner-pets", role: "pet_owner" },
  {
    label: "Pet Owner Messages",
    path: "/pet-owner-messages",
    role: "pet_owner",
  },
  { label: "Pet Owner Records", path: "/pet-owner-records", role: "pet_owner" },
  {
    label: "Pet Owner Payments",
    path: "/pet-owner-payments",
    role: "pet_owner",
  },
  {
    label: "Pet Owner Notifications",
    path: "/pet-owner-notifications",
    role: "pet_owner",
  },
  { label: "Pet Owner Profile", path: "/pet-owner-profile", role: "pet_owner" },
];

const ROLE_COLORS = {
  admin: "#c0392b",
  veterinarian: "#2980b9",
  staff: "#27ae60",
  pet_owner: "#8e44ad",
};

const ROLE_LABELS = {
  admin: "Admin",
  veterinarian: "Veterinarian",
  staff: "Staff",
  pet_owner: "Pet Owner",
};

const grouped = ROUTES.reduce((acc, r) => {
  if (!acc[r.role]) acc[r.role] = [];
  acc[r.role].push(r);
  return acc;
}, {});

export default function DevNav() {
  const navigate = useNavigate();

  const go = (path, role) => {
    localStorage.setItem("user", JSON.stringify(MOCK_USERS[role]));
    navigate(path);
  };

  const clearUser = () => {
    localStorage.removeItem("user");
    alert("Mock user cleared.");
  };

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        padding: "2rem",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Dev Navigation</h1>
        <button
          onClick={clearUser}
          style={{
            padding: "0.4rem 1rem",
            background: "#555",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Clear Mock User
        </button>
      </div>

      {Object.entries(grouped).map(([role, routes]) => (
        <div key={role} style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              color: ROLE_COLORS[role],
              borderBottom: `2px solid ${ROLE_COLORS[role]}`,
              paddingBottom: "0.3rem",
            }}
          >
            {ROLE_LABELS[role]}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {routes.map((r) => (
              <button
                key={r.path}
                onClick={() => go(r.path, role)}
                style={{
                  padding: "0.5rem 1rem",
                  background: ROLE_COLORS[role],
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
