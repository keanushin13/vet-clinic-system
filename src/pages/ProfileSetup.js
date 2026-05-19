import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, updateMe } from "../api/api";
import { STORAGE_KEY as PO_TUTORIAL_KEY } from "../components/PetOwnerTutorial";
import "../css/ProfileSetup.css";
import userIcon from "../assets/Profile.png";

const MAX_FIRST_NAME = 20;
const MAX_LAST_NAME = 20;
const MAX_ADDRESS = 50;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  address: "",
  profileImage: "",
};

export default function ProfileSetup() {
  const navigate = useNavigate();
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showChoice, setShowChoice] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!localUser?.id || localUser?.role !== "pet_owner") {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const { data } = await getMe();
        if (data.profileCompleted) {
          navigate("/pet-owner");
          return;
        }

        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          username: data.username || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          profileImage: data.profileImage || "",
        });
      } catch (e) {
        setError(e.response?.data?.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [localUser?.id, localUser?.role, navigate]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;

    if (name === "firstName") {
      setForm((prev) => ({
        ...prev,
        firstName: value.slice(0, MAX_FIRST_NAME),
      }));
      return;
    }

    if (name === "lastName") {
      setForm((prev) => ({ ...prev, lastName: value.slice(0, MAX_LAST_NAME) }));
      return;
    }

    if (name === "address") {
      setForm((prev) => ({ ...prev, address: value.slice(0, MAX_ADDRESS) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSelectAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        profileImage: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!form.username.trim()) return "Username is required";
    if (!form.address.trim()) return "Address is required";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        address: form.address.trim(),
        profileImage: form.profileImage || null,
      };

      const { data } = await updateMe(payload);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...localUser,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImage: data.profileImage,
          profileCompleted: data.profileCompleted,
        }),
      );
      window.dispatchEvent(new Event("authChanged"));

      setShowChoice(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile setup");
    } finally {
      setSaving(false);
    }
  };

  const startTutorial = () => {
    localStorage.removeItem(PO_TUTORIAL_KEY);
    setShowChoice(false);
    window.dispatchEvent(new Event("startPetOwnerTutorial"));
    navigate("/pet-owner");
  };

  const skipTutorial = () => {
    localStorage.setItem(PO_TUTORIAL_KEY, "true");
    setShowChoice(false);
    navigate("/pet-owner");
  };

  if (loading) {
    return (
      <div className="profile-setup-page">
        <div className="profile-setup-card">Loading profile setup...</div>
      </div>
    );
  }

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <h1>Complete Your Personal Profile</h1>
        <p className="profile-setup-note">
          Please complete your personal profile first before using the app.
        </p>

        {error && <p className="profile-setup-error">{error}</p>}

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <label className="field-label">Profile Picture (optional)</label>
          <div className="avatar-row">
            <img
              src={form.profileImage || userIcon}
              alt="Profile preview"
              className="avatar-preview"
            />
            <label className="upload-btn">
              Upload Photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={onSelectAvatar}
              />
            </label>
          </div>

          <label className="field-label">First Name *</label>
          <input
            name="firstName"
            value={form.firstName}
            onChange={onFieldChange}
            required
          />
          <p className="field-counter">
            {form.firstName.length}/{MAX_FIRST_NAME}
          </p>

          <label className="field-label">Last Name *</label>
          <input
            name="lastName"
            value={form.lastName}
            onChange={onFieldChange}
            required
          />
          <p className="field-counter">
            {form.lastName.length}/{MAX_LAST_NAME}
          </p>

          <label className="field-label">Username *</label>
          <input
            name="username"
            value={form.username}
            onChange={onFieldChange}
            required
          />

          <label className="field-label">Email</label>
          <input name="email" value={form.email} readOnly disabled />

          <label className="field-label">Phone Number</label>
          <input name="phone" value={form.phone} readOnly disabled />

          <label className="field-label">Address *</label>
          <textarea
            name="address"
            value={form.address}
            onChange={onFieldChange}
            rows={3}
            required
          />
          <p className="field-counter">
            {form.address.length}/{MAX_ADDRESS}
          </p>

          <button type="submit" disabled={saving} className="save-btn">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {showChoice && (
        <div className="tutorial-choice-overlay">
          <div className="tutorial-choice-card">
            <h3>Profile completed!</h3>
            <p>Would you like to start the quick tutorial?</p>
            <div className="tutorial-choice-actions">
              <button onClick={startTutorial} className="tutorial-primary-btn">
                Start Tutorial
              </button>
              <button onClick={skipTutorial} className="tutorial-secondary-btn">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
