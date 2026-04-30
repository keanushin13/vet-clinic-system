import { useState } from "react";
// Path: password -> security -> pages -> src/api/api
import API from "../../../api/api";
// Path: password -> security -> pages -> src/css/Modal.css
import "../../../css/Modal.css";
// Path: password -> security -> pages -> src/assets/paw1.png
import paw1 from "../../../assets/paw.png";

const ForgotPassword = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(""); // 'success' or 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("");

    try {
      const res = await API.post("/users/forgot-password", { email });
      setMessage(res.data.message || "A reset link has been sent to your email.");
      setStatus("success");
    } catch (err) {
      setMessage(err.response?.data?.message || "Email address not found.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-content" style={{ textAlign: "center" }}>
      <div className="modal-header">
        {/* Replaced 🔑 with the PawCruz Logo */}
        <div className="header-icon" style={{ marginBottom: "15px" }}>
          <img 
            src={paw1} 
            alt="PawCruz Logo" 
            style={{ width: "65px", height: "auto", display: "block", margin: "0 auto" }} 
          />
        </div>
        
        <h3 style={{ color: "#1f4e79", fontWeight: "600", fontSize: "22px" }}>Reset Password</h3>
        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", marginTop: "5px" }}>
          Enter your email address and we'll send you a link to get back into your account.
        </p>
      </div>

      {message && (
        <div className={`otp-msg ${status === "success" ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="email"
            placeholder="example@email.com"
            className="modal-input"
            style={{ textAlign: "center" }} // Centers text while typing
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || status === "success"}
          />
        </div>

        <div className="modal-footer" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          {status === "success" ? (
            <button 
              type="button" 
              className="modal-primary-btn" 
              onClick={onClose} 
              style={{ width: "100%" }}
            >
              Back to Login
            </button>
          ) : (
            <>
              <button 
                type="button" 
                className="modal-secondary-btn" 
                onClick={onClose} 
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="modal-primary-btn" 
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Sending..." : "Send Link"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;