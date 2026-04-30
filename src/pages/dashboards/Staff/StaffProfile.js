import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffProfile.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMe, updateMe, updatePassword } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffProfile = () => {
  const navigate = useNavigate();
  const localUser = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const [profile, setProfile] = useState(localUser || {});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
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
    if (!localUser || localUser.role !== "staff") {
      navigate("/login");
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

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
    setMessage("");
    setError("");
    setEditForm({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      profileImage: profile?.profileImage || "",
    });
    setAvatarPreview(profile?.profileImage || "");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setAvatarPreview("");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const onPasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
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
      const result = String(reader.result || "");
      setAvatarPreview(result);
      setEditForm((prev) => ({ ...prev, profileImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...editForm,
        firstName: editForm.firstName || null,
        lastName: editForm.lastName || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        profileImage: editForm.profileImage || null,
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

      setMessage("Profile updated successfully");
      closeEditModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setError("");
    setMessage("");

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
      setMessage("Password changed successfully");
      closePasswordModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const avatarSource = profile?.profileImage || userIcon;

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
          <h2>My Profile</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={avatarSource}
              avatarAlt="Profile"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {loading && <p className="profile-feedback">Loading profile...</p>}
          {!loading && message && <p className="profile-success">{message}</p>}
          {!loading && error && <p className="profile-error">{error}</p>}

          <div className="profile-container">
            {/* PROFILE HEADER */}
            <div className="profile-header-card">
              <div className="profile-banner"></div>
              <div className="profile-info-main">
                <div className="profile-avatar-wrapper">
                  <img src={avatarSource} alt="Avatar" />
                </div>
                <div className="profile-title">
                  <h3>
                    {profile?.firstName
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile?.username || "Staff Member"}
                  </h3>
                  <p>Clinic Administrator / Staff</p>
                </div>
                <button className="edit-profile-btn" onClick={openEditModal}>
                  Edit Profile
                </button>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="profile-details-grid">
              <div className="details-card">
                <h4>Personal Information</h4>
                <div className="info-row">
                  <label>Full Name</label>
                  <span>
                    {profile?.firstName
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile?.username || "N/A"}
                  </span>
                </div>
                <div className="info-row">
                  <label>Email Address</label>
                  <span>{profile?.email || ""}</span>
                </div>
                <div className="info-row">
                  <label>Phone Number</label>
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
                  <label>Role</label>
                  <span className="role-tag">Staff Access</span>
                </div>
                <div className="info-row">
                  <label>Password</label>
                  <span>••••••••••••</span>
                </div>
                <button
                  className="change-pass-btn"
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setShowPasswordModal(true);
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>

            <button
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                navigate("/login");
              }}
            >
              Logout Account
            </button>
          </div>
        </section>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitProfile}>
              <h3>Edit Profile</h3>
              <div className="avatar-upload-wrap">
                <img
                  src={avatarPreview || userIcon}
                  alt="Preview"
                  className="avatar-preview"
                />
                <label className="upload-btn">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectAvatar}
                    hidden
                  />
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={editForm.firstName}
                    onChange={onEditChange}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    value={editForm.lastName}
                    onChange={onEditChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    name="username"
                    value={editForm.username}
                    onChange={onEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={onEditChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: "8px", fontWeight: "500" }}>
                      +63
                    </span>
                    <input
                      type="number"
                      name="phone"
                      value={editForm.phone?.replace(/^63/, "") || ""}
                      placeholder="Enter number"
                      maxLength="10"
                      pattern="[0-9]*"
                      style={{ flex: 1 }}
                      onChange={(e) => {
                        const numOnly = e.target.value.replace(/[^0-9]/g, "");
                        const phone = numOnly.replace(/^63/, "").slice(0, 10);
                        const fullPhone = phone ? `63${phone}` : "";
                        onEditChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: "phone",
                            value: fullPhone,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    name="address"
                    value={editForm.address}
                    onChange={onEditChange}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeEditModal}
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
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitPassword}>
              <h3>Change Password</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={onPasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={onPasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={onPasswordChange}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closePasswordModal}
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

export default StaffProfile;
