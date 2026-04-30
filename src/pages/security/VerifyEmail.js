import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/api";
import "../../css/VerifyEmail.css";

// ASSETS - Ensure these paths match your folder structure
import VeterinaryBG from "../../assets/dog_cat.jpg";
import locationIcon from "../../assets/location.png";
import paw1 from "../../assets/paw1.png";
import phoneIcon from "../../assets/phone.png";
  
const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        await API.get(`/users/verify-email/${token}`);
        setStatus("success");
        setMessage("Your email has been successfully verified. You can now access your account.");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      } catch (err) {
        setStatus("error");
        setMessage("This verification link is invalid, expired, or has already been used.");
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div className="verify-page-wrapper" style={{ backgroundImage: `url(${VeterinaryBG})` }}>
      <div className="overlay"></div>
      
      <div className="verify-container">
        <div className="verify-card">
          <div className={`verify-icon ${status}`}>
            {status === "loading" && "⏳"}
            {status === "success" && "✅"}
            {status === "error" && "❌"}
          </div>

          <h2>
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Success!"}
            {status === "error" && "Failed"}
          </h2>

          <p>{status === "loading" ? "Confirming your address..." : message}</p>

          {status !== "loading" && (
            <button className="verify-btn" onClick={() => navigate("/login")}>
              Proceed to Login
            </button>
          )}
        </div>
      </div>

      {/* THE BOTTOM BAR - Exact match to your Login.js */}
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

export default VerifyEmail;