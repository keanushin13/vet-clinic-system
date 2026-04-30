import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";

import LoginOtp from "./security/LoginOtp";
import Modal from "./security/Modal";
import ForgotPassword from "./security/password/ForgotPassword";

import "../css/Login.css";
import "../css/Modal.css";

// ASSETS
import loginVideo from "../assets/Login.mp4";
import eyeHide from "../assets/eye-hide.png";
import eyeShow from "../assets/eye-show.png";
import location from "../assets/location.png";
import paw from "../assets/paw.png";
import paw1 from "../assets/paw1.png";
import phone from "../assets/phone.png";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [alertModal, setAlertModal] = useState({
    show: false,
    message: "",
    extraAction: null,
  });

  const [showForgot, setShowForgot] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/users/login", formData);

      if (res.data.requiresOtp) {
        setLoginEmail(res.data.email);
        setShowOtpModal(true);
        return;
      }

      const { token, user } = res.data;
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
      handleOtpSuccess(user);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      let message = data?.message || "Login failed";

      if (status === 403 && message === "invalid csrf token") {
        message = "Security check failed. Please refresh the page.";
      }

      if (status === 429) {
        // Locked account → show send button
        setAlertModal({
          show: true,
          message: data?.message || "Account locked",
          extraAction: (
            <button className="modal-primary-btn" onClick={handleSendUnlock}>
              Send Unlock Email
            </button>
          ),
        });
      } else {
        // All other errors
        setAlertModal({ show: true, message, extraAction: null });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendUnlock = async () => {
    try {
      if (!formData.username) {
        setAlertModal({
          show: true,
          message: "Please enter your username first to send the unlock email.",
          extraAction: null,
        });
        return;
      }

      const res = await API.post("/users/send-unlock-email", {
        username: formData.username,
      });

      setAlertModal({
        show: true,
        message: res.data.message,
        extraAction: null, // hide button aftersend
      });
    } catch (err) {
      setAlertModal({
        show: true,
        message: err.response?.data?.message || "Could not send email.",
        extraAction: null,
      });
    }
  };

  const handleOtpSuccess = (user) => {
    const role = user.role;
    if (role === "admin") navigate("/admin");
    else if (role === "veterinarian") navigate("/vet");
    else if (role === "staff") navigate("/staff");
    else navigate("/pet-owner");
  };

  return (
    <>
      <div className="login-container">
        <div className="login-left">
          <div className="login-content">
            <div className="brand">
              <img src={paw} alt="Paw" />
              <span>PawCruz</span>
            </div>

            <h1>Welcome back!</h1>
            <p className="subtitle">Please enter your account details below.</p>

            <form onSubmit={handleSubmit}>
              <label>Username</label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
              />

              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="eye-icon"
                  onClick={togglePasswordVisibility}
                >
                  <img
                    src={showPassword ? eyeHide : eyeShow}
                    alt="Toggle Password"
                  />
                </button>

                <button
                  type="button"
                  className="forgot"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot Password?
                </button>
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="register-text">
              Don’t have an account yet?{" "}
              <Link to="/register" className="register-link">
                Register now
              </Link>
            </p>
          </div>
        </div>

        <div className="login-right">
          <video className="login-video" autoPlay loop muted playsInline>
            <source src={loginVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="bottom-left">
          <div className="info-item">
            <img src={location} alt="Location" />
            <span>
              2189 Stall G, Felimarc Pet Center, A. Luna St., Pasay City
            </span>
          </div>
          <div className="info-item">
            <img src={phone} alt="Phone" />
            <span>0938537649 | 0917165379</span>
          </div>
        </div>

        <div className="bottom-right">
          <img src={paw1} alt="Paw" />
          <span>PawCruz</span>
        </div>
      </div>

      <Modal
        show={alertModal.show}
        onClose={() =>
          setAlertModal({ show: false, message: "", extraAction: null })
        }
        extraAction={alertModal.extraAction} // pass the button if exists
      >
        <p>{alertModal.message}</p>
      </Modal>

      <Modal show={showForgot} onClose={() => setShowForgot(false)}>
        <ForgotPassword onClose={() => setShowForgot(false)} />
      </Modal>

      {showOtpModal && (
        <LoginOtp
          email={loginEmail}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
        />
      )}
    </>
  );
};

export default Login;
