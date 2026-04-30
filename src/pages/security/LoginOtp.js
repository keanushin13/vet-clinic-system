import { useEffect, useRef, useState } from "react";
import API from "../../api/api";
import paw1 from "../../assets/paw1.png";

const OTP_LENGTH = 6;

const LoginOtp = ({ email, onSuccess, onClose }) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    const otpValue = otp.join("");

    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/users/verify-login-otp", {
        email,
        otp: otpValue,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      await API.post("/users/resend-login-otp", { email });
      setMessage("A new code has been sent.");
      setCooldown(60);
    } catch (err) {
      setError("Failed to resend code.");
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      {/* THE WHITE CONTAINER BOX */}
      <div
        className="modal-container"
        style={{
          width: "420px",
          padding: "40px",
          backgroundColor: "white", // This adds the white background
          borderRadius: "25px", // This creates the rounded "border" look
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: "20px",
            top: "15px",
            border: "none",
            background: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          &times;
        </button>

        <div className="modal-header">
          <img
            src={paw1}
            alt="PawCruz Logo"
            style={{
              width: "65px",
              marginBottom: "15px",
              display: "block",
              margin: "0 auto 15px",
            }}
          />
          <h3
            style={{
              color: "#1f4e79",
              fontWeight: "600",
              fontSize: "22px",
              margin: "0",
            }}
          >
            OTP Verification
          </h3>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>
            Enter the 6-digit code sent to
          </p>
          <strong
            style={{ color: "#1f4e79", fontSize: "14px", display: "block" }}
          >
            {email}
          </strong>
        </div>

        {error && (
          <div
            className="otp-msg error"
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "13px",
              marginTop: "15px",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            className="otp-msg success"
            style={{
              background: "#f0fdf4",
              color: "#16a34a",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "13px",
              marginTop: "15px",
              border: "1px solid #bcf0da",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div
            className="otp-inputs-wrapper"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              margin: "25px 0",
            }}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                style={{
                  width: "45px",
                  height: "55px",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: "700",
                  border: "1.5px solid #d1d5db",
                  borderRadius: "10px",
                  color: "#1f4e79",
                  background: "#f8fafc",
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className="modal-primary-btn"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#1f4e79",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {loading ? "Verifying..." : "Verify & Log In"}
          </button>
        </form>

        <div
          className="otp-footer"
          style={{ marginTop: "25px", color: "#64748b" }}
        >
          <p>Didn't get the code?</p>
          <button
            type="button"
            className="otp-resend-link"
            onClick={resendOtp}
            disabled={cooldown > 0}
            style={{
              background: "none",
              border: "none",
              color: "#1f4e79",
              fontWeight: "700",
              cursor: "pointer",
              textDecoration: "underline",
              marginTop: "5px",
            }}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend New Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginOtp;
