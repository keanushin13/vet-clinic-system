import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminProfile.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getMe, updateMe, updatePassword } from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const AdminProfile = () => {
  const navigate = useNavigate();
  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();
  const [profile, setProfile] = useState(localUser);
  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [form, setForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    if (!localUser || localUser.role !== "admin") {
      navigate("/login");
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setFormError("");
    try {
      const r = await getMe();
      setProfile(r.data || {});
    } catch {
      setFormError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    setMessage("");
    setForm({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      profileImage: profile?.profileImage || "",
    });
    setAvatarPreview(profile?.profileImage || "");
    setFormError("");
    setShowEdit(true);
  };

  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePasswordFormChange = (e) =>
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSelectAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatarPreview(result);
      setForm((prev) => ({ ...prev, profileImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setMessage("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        phone: form.phone || null,
        address: form.address || null,
        profileImage: form.profileImage || null,
      };
      const res = await updateMe(payload);
      setProfile(res.data || payload);

      const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existingUser,
          firstName: res.data?.firstName,
          lastName: res.data?.lastName,
          username: res.data?.username,
          email: res.data?.email,
          phone: res.data?.phone,
          address: res.data?.address,
          profileImage: res.data?.profileImage,
          role: res.data?.role || existingUser.role,
        }),
      );

      setMessage("Profile updated successfully");
      setShowEdit(false);
    } catch (err) {
      setFormError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage("Password changed successfully");
      closePasswordModal();
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Password update failed");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const avatarSource = profile?.profileImage || userIcon;

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN AREA */}
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
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={avatarSource}
              avatarAlt="Admin Profile"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body profile-layout">
          {loading && <p className="profile-feedback">Loading profile...</p>}
          {!loading && message && <p className="profile-success">{message}</p>}
          {!loading && formError && (
            <p className="profile-error">{formError}</p>
          )}

          <div className="profile-card">
            <div className="profile-header-bg"></div>
            <div className="profile-content">
              <div className="profile-image-wrapper">
                <img
                  src={avatarSource}
                  alt="Admin"
                  className="profile-main-img"
                />
                <button
                  className="edit-img-btn"
                  type="button"
                  onClick={openEdit}
                  title="Edit profile image"
                >
                  Edit
                </button>
              </div>

              <h2 className="profile-name">
                {profile?.firstName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile?.username || "System Administrator"}
              </h2>
              <span className="profile-role-badge">Administrator</span>

              <div className="profile-details-grid">
                <div className="detail-item">
                  <label>Username</label>
                  <p>{profile?.username || "N/A"}</p>
                </div>
                <div className="detail-item">
                  <label>Email Address</label>
                  <p>{profile?.email || "admin@pawcruz.com"}</p>
                </div>
                <div className="detail-item">
                  <label>Account Status</label>
                  <p className="status-active">Active</p>
                </div>
                <div className="detail-item">
                  <label>Role</label>
                  <p>Super Admin</p>
                </div>
              </div>

              <div className="profile-actions">
                <button className="edit-profile-btn" onClick={openEdit}>
                  Edit Profile Information
                </button>
                <button
                  className="edit-profile-btn"
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setPasswordError("");
                    setShowPasswordModal(true);
                  }}
                >
                  Change Password
                </button>
                <button className="logout-danger-btn" onClick={handleLogout}>
                  Log Out of Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/* EDIT PROFILE MODAL */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <form onSubmit={handleSave} className="user-modal-form">
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
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="Email"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ marginRight: "8px", fontWeight: "500" }}>
                    +63
                  </span>
                  <input
                    type="number"
                    name="phone"
                    value={form.phone?.replace(/^63/, "") || ""}
                    placeholder="Enter number"
                    maxLength="10"
                    pattern="[0-9]*"
                    style={{ flex: 1 }}
                    onChange={(e) => {
                      const numOnly = e.target.value.replace(/[^0-9]/g, "");
                      const phone = numOnly.replace(/^63/, "").slice(0, 10);
                      const fullPhone = phone ? `63${phone}` : "";
                      handleFormChange({
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
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Address"
                />
              </div>
              {formError && <p className="modal-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <form onSubmit={submitPassword} className="user-modal-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFormChange}
                  required
                />
              </div>

              {passwordError && <p className="modal-error">{passwordError}</p>}

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

export default AdminProfile;
