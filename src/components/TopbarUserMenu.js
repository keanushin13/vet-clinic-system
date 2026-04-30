import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/TopbarUserMenu.css";

export default function TopbarUserMenu({
  avatarSrc,
  avatarAlt = "User",
  profilePath,
  avatarClassName = "user-profile",
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").role || null;
    } catch {
      return null;
    }
  })();

  const handleTutorial = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("startPetOwnerTutorial"));
  };

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) {
      window.addEventListener("click", close);
    }
    return () => window.removeEventListener("click", close);
  }, [open]);

  const onLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="topbar-user-menu-wrapper">
      <div
        className={avatarClassName}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <img src={avatarSrc} alt={avatarAlt} />
      </div>

      {open && (
        <div className="topbar-user-menu" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="topbar-user-menu-item"
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
          >
            Edit Profile
          </button>
          {role === "pet_owner" && (
            <button
              type="button"
              className="topbar-user-menu-item"
              onClick={handleTutorial}
            >
              Tutorial
            </button>
          )}
          <button
            type="button"
            className="topbar-user-menu-item topbar-user-menu-item-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
