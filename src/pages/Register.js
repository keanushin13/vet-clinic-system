import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import "../css/Modal.css";
import "../css/Register.css";

import dog from "../assets/Veterinary.jpg";
import eyeHide from "../assets/eye-hide.png";
import eyeShow from "../assets/eye-show.png";
import paw from "../assets/paw.png";

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "pet_owner",
  });

  const [modal, setModal] = useState({ show: false, message: "" });

  const isStrongPassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
    return regex.test(password);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) return "All fields are required";
    if (!/^[a-zA-Z0-9]+$/.test(formData.username)) return "Username must contain letters and numbers only";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format";
    if (!isStrongPassword(formData.password)) return "Password must be at least 8 characters, include 1 uppercase letter, 1 number, and 1 special character";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setModal({ show: true, message: validationError });
      return;
    }
    try {
      setLoading(true);
      await API.post("/users/register", formData);
      setModal({ show: true, message: "Registration successful! Please verify your email." });
    } catch (err) {
      setModal({ show: true, message: err.response?.data?.message || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModal({ show: false, message: "" });
    if (modal.message.includes("successful")) {
      navigate("/login", { state: { email: formData.email } });
    }
  };

  return (
    <div className="register-container">
      {/* LEFT SIDE - WIDER & DARKER THEME */}
      <div className="register-left">
        <div className="register-card">
          <div className="brand">
            <img src={paw} alt="Paw Logo" />
            <span>PawCruz</span>
          </div>

          <div className="header-text">
            <h1>Create Account</h1>
            <p>Please fill out the details below to join.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Join as</label>
              <select 
                name="role" 
                className="register-input" 
                onChange={handleChange} 
                required
              >
                <option value="pet_owner">Pet Owner</option>
                <option value="veterinarian">Veterinarian</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="input-group">
              <label>Username</label>
              <input 
                type="text" 
                name="username" 
                className="register-input" 
                placeholder="Enter username" 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                className="register-input" 
                placeholder="email@example.com" 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="password-field">
                <input 
                  type={showPass ? "text" : "password"} 
                  name="password" 
                  className="register-input" 
                  placeholder="••••••••" 
                  onChange={handleChange} 
                  required 
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowPass(!showPass)}
                >
                  <img src={showPass ? eyeHide : eyeShow} alt="toggle" />
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-field">
                <input 
                  type={showConfirm ? "text" : "password"} 
                  name="confirmPassword" 
                  className="register-input" 
                  placeholder="••••••••" 
                  onChange={handleChange} 
                  required 
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  <img src={showConfirm ? eyeHide : eyeShow} alt="toggle" />
                </button>
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Sign Up"}
            </button>
          </form>

          <p className="footer-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - IMAGE */}
      <div className="register-right">
        <img src={dog} alt="Dog and Cat" />
      </div>

      {/* MODAL SECTION - UPDATED FOR THE WHITE BOX LOOK */}
      {modal?.show && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 3000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-container" style={{
            background: 'white',
            padding: '40px',
            borderRadius: '25px',
            width: '400px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <img src={paw} alt="Logo" style={{ width: '60px', marginBottom: '15px' }} />
            <h3 style={{ color: '#1f4e79', marginBottom: '10px' }}>Notification</h3>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              {modal.message}
            </p>
            <button 
              onClick={closeModal}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1f4e79',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;