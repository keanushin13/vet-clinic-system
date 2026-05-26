import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerProfile.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMe, updateMe, updatePassword, uploadAvatar } from "../../../api/api";
import { STORAGE_KEY } from "../../../components/PetOwnerTutorial";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const PetOwnerProfile = () => {
  const navigate = useNavigate();
  const localUser = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [profile, setProfile] = useState(localUser || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    profileImage: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!localUser || localUser.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await getMe();
      setProfile(r.data || {});
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setError("");
    setSuccess("");
    setUsernameError("");
    setAvatarFile(null);
    setAvatarPreview(profile?.profileImage || "");
    setEditForm({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      profileImage: profile?.profileImage || "",
    });
    setShowEditModal(true);
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      let profileImageUrl = editForm.profileImage || null;

      if (avatarFile) {
        const uploadRes = await uploadAvatar(avatarFile);
        profileImageUrl = uploadRes.data.url;
      }

      const payload = {
        ...editForm,
        firstName: editForm.firstName || null,
        lastName: editForm.lastName || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        profileImage: profileImageUrl,
      };
      const r = await updateMe(payload);
      setProfile(r.data || payload);

      const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existingUser,
          firstName: r.data?.firstName,
          lastName: r.data?.lastName,
          username: r.data?.username,
          email: r.data?.email,
          phone: r.data?.phone,
          address: r.data?.address,
          profileImage: r.data?.profileImage,
        }),
      );

      setShowEditModal(false);
      setSuccess("Profile updated successfully");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update profile";
      if (msg.toLowerCase().includes("username")) {
        setUsernameError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match");
      setSavingPassword(false);
      return;
    }

    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Password changed successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const onSelectAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or less");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const avatarSource = profile?.profileImage || userIcon;

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
          <h2>My Profile</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/pet-owner-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={avatarSource}
              avatarAlt="User"
              profilePath="/pet-owner-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {loading && <p className="profile-feedback">Loading profile...</p>}
          {error && <p className="profile-error">{error}</p>}
          {success && <p className="profile-success">{success}</p>}

          <div
            className="profile-container"
            style={{ width: "100%", maxWidth: "980px", margin: "0 auto" }}
          >
            <div
              className="profile-header-card"
              style={{
                background: "white",
                borderRadius: "15px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                overflow: "hidden",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  height: "110px",
                  background:
                    "linear-gradient(90deg, #63b6c5 0%, #438fb5 100%)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  padding: "0 24px 24px",
                  marginTop: "-36px",
                  alignItems: "flex-end",
                }}
              >
                <img
                  src={avatarSource}
                  alt="Avatar"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    border: "4px solid white",
                    objectFit: "cover",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: "#255065" }}>
                    {profile?.firstName
                      ? `${profile.firstName} ${profile.lastName || ""}`.trim()
                      : profile?.username || "Pet Owner"}
                  </h3>
                  <p style={{ color: "#777" }}>Pet Owner Account</p>
                </div>
                <button className="edit-profile-btn" onClick={openEditModal}>
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="details-card">
                <h4>Personal Information</h4>
                <div className="info-row">
                  <label>Full Name</label>
                  <span>
                    {profile?.firstName
                      ? `${profile.firstName} ${profile.lastName || ""}`.trim()
                      : profile?.username || "N/A"}
                  </span>
                </div>
                <div className="info-row">
                  <label>Email</label>
                  <span>{profile?.email || "N/A"}</span>
                </div>
                <div className="info-row">
                  <label>Phone</label>
                  <span>{profile?.phone || "N/A"}</span>
                </div>
                <div className="info-row">
                  <label>Address</label>
                  <span>{profile?.address || "N/A"}</span>
                </div>
              </div>
              <div className="details-card">
                <h4>Account Security</h4>
                <div className="info-row">
                  <label>Username</label>
                  <span>{profile?.username || "N/A"}</span>
                </div>
                <div className="info-row">
                  <label>Password</label>
                  <span>••••••••••••</span>
                </div>
                <button
                  className="change-pass-btn"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change Password
                </button>
                <button
                  className="change-pass-btn"
                  style={{
                    marginTop: "8px",
                    background: "#438fb5",
                    color: "#fff",
                  }}
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    navigate("/pet-owner");
                  }}
                >
                  Restart Tutorial
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setAvatarFile(null); setAvatarPreview(""); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitProfile}>
              <h3>Edit Profile</h3>
              <div className="avatar-upload-wrap">
                <img
                  src={avatarPreview || avatarSource}
                  alt="Preview"
                  className="avatar-preview"
                />
                <label className="upload-btn">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onSelectAvatar}
                  />
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    First Name{" "}
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      ({editForm.firstName?.length || 0}/20)
                    </span>
                  </label>
                  <input
                    required
                    maxLength="20"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        firstName: e.target.value.slice(0, 20),
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    Last Name{" "}
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      ({editForm.lastName?.length || 0}/20)
                    </span>
                  </label>
                  <input
                    required
                    maxLength="20"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        lastName: e.target.value.slice(0, 20),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    required
                    value={editForm.username}
                    onChange={(e) => {
                      setUsernameError("");
                      setEditForm((p) => ({ ...p, username: e.target.value }));
                    }}
                  />
                  {usernameError && (
                    <span style={{ color: "#c62828", fontSize: "12px", marginTop: "2px" }}>
                      {usernameError}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    Email{" "}
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      (Read-only)
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    disabled
                    style={{
                      backgroundColor: "#f5f5f5",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Phone{" "}
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      (Read-only)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    disabled
                    style={{
                      backgroundColor: "#f5f5f5",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Address{" "}
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      ({editForm.address?.length || 0}/50)
                    </span>
                  </label>
                  <textarea
                    required
                    maxLength="50"
                    rows="2"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        address: e.target.value.slice(0, 50),
                      }))
                    }
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => { setShowEditModal(false); setAvatarFile(null); setAvatarPreview(""); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPasswordModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitPassword}>
              <h3>Change Password</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({
                      ...p,
                      currentPassword: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({
                      ...p,
                      newPassword: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerProfile;
