import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/api";
import "../../css/UnlockAccount.css";

// ASSETS
import VeterinaryBG from "../../assets/dog_cat.jpg";
import locationIcon from "../../assets/location.png";
import paw1 from "../../assets/paw1.png";
import phoneIcon from "../../assets/phone.png";

const UnlockAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  const [status, setStatus] = useState("loading"); 
  const [message, setMessage] = useState("Unlocking your account, please wait...");

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const unlock = async () => {
      try {
        // Calling backend API
        await API.get(`/users/unlock/${token}`);
        setStatus("success");
        setMessage("Account unlocked successfully! You can now log in.");
        
        setTimeout(() => navigate("/login", { replace: true }), 3000);

      } catch (err) {
        setStatus("error");
        setMessage("Unlock link is invalid or has already expired.");
      }
    };

    unlock();
  }, [token, navigate]);

  return (
    <div className="unlock-page-wrapper" style={{ backgroundImage: `url(${VeterinaryBG})` }}>
      <div className="overlay"></div>

      <div className="unlock-container">
        <div className="unlock-card">
          <div className={`status-icon ${status}`}>
            {status === "loading" && "⏳"}
            {status === "success" && "🔓"}
            {status === "error" && "⚠️"}
          </div>

          <h2>{status === "loading" ? "Processing" : status === "success" ? "Unlocked" : "Error"}</h2>
          <p>{message}</p>

          {status !== "loading" && (
            <button className="unlock-btn" onClick={() => navigate("/login")}>
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

export default UnlockAccount;