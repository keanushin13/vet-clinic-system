import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../../api/api";
import "../../../css/ResetPassword.css";

// ASSETS
import VeterinaryBG from "../../../assets/dog_cat.jpg";
import locationIcon from "../../../assets/location.png";
import paw1 from "../../../assets/paw1.png";
import phoneIcon from "../../../assets/phone.png";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isStrongPassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError("Password must be 8+ characters, with 1 uppercase, 1 number, and 1 special char.");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post(`/users/reset-password/${token}`, { newPassword });
      setSuccess(true);
      setMessage(res.data.message || "Password updated successfully!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Reset link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page-wrapper" style={{ backgroundImage: `url(${VeterinaryBG})` }}>
      <div className="overlay"></div>

      <div className="reset-container">
        <div className="reset-card">
          <div className="status-icon">
            {success ? "✅" : "🛡️"}
          </div>

          <h2>{success ? "Success" : "Reset Password"}</h2>
          <p>{success ? message : "Please enter your new password below."}</p>

          {!success ? (
            <form onSubmit={handleSubmit} className="reset-form">
              <input
                type="password"
                className="reset-input"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                className="reset-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="reset-btn" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          ) : (
            <button className="reset-btn" onClick={() => navigate("/login")}>
              Go to Login
            </button>
          )}
        </div>
      </div>

      <div className="bottom-bar">
        <div className="bottom-left">
          <div className="info-item">
            <img src={locationIcon} alt="Location" />
            <span>2189 Stall G, Felimarc Pet Center, A. Luna St., Pasay City</span>
          </div>
          <div className="info-item">
            <img src={phoneIcon} alt="Phone" />
            <span>0938537649 | 0917165379</span>
          </div>
        </div>

        <div className="bottom-right">
          <img src={paw1} alt="Paw" />
          <span>PawCruz</span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;