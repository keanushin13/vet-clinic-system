import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/api";
import "../css/TopbarUserMenu.css";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
};

export default function TopbarUserMenu({
  avatarSrc,
  avatarAlt = "User",
  profilePath,
  avatarClassName = "user-profile",
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [storedUser, setStoredUser] = useState(readStoredUser);
  const role = storedUser.role || null;
  const storedProfileImage =
    typeof storedUser.profileImage === "string" &&
    storedUser.profileImage.trim() &&
    storedUser.profileImage !== "null"
      ? storedUser.profileImage
      : "";

  const handleTutorial = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("startPetOwnerTutorial"));
  };

  const shouldNavigateDirectly =
    role === "staff" && profilePath === "/staff-profile";
  const resolvedAvatarSrc = storedProfileImage || avatarSrc;
  const isStaffDefaultProfileIcon =
    shouldNavigateDirectly &&
    !storedProfileImage &&
    String(avatarSrc || "").toLowerCase().includes("profile");

  useEffect(() => {
    const refreshStoredUser = (event) => {
      if (event?.detail && typeof event.detail === "object") {
        setStoredUser(event.detail);
        return;
      }
      setStoredUser(readStoredUser());
    };

    window.addEventListener("authChanged", refreshStoredUser);
    window.addEventListener("storage", refreshStoredUser);
    window.addEventListener("userProfileUpdated", refreshStoredUser);
    return () => {
      window.removeEventListener("authChanged", refreshStoredUser);
      window.removeEventListener("storage", refreshStoredUser);
      window.removeEventListener("userProfileUpdated", refreshStoredUser);
    };
  }, []);

  useEffect(() => {
    if (
      storedProfileImage ||
      role !== "staff" ||
      profilePath !== "/staff-profile"
    ) {
      return undefined;
    }

    let isActive = true;
    getMe()
      .then((response) => {
        const profileData = response.data || {};
        if (!isActive || !profileData.profileImage) return;

        const existingUser = readStoredUser();
        const updatedUser = {
          ...existingUser,
          firstName: profileData.firstName ?? existingUser.firstName,
          lastName: profileData.lastName ?? existingUser.lastName,
          username: profileData.username ?? existingUser.username,
          email: profileData.email ?? existingUser.email,
          phone: profileData.phone ?? existingUser.phone,
          address: profileData.address ?? existingUser.address,
          profileImage: profileData.profileImage,
        };

        setStoredUser(updatedUser);
        try {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch {
          /* ignore storage quota errors; current state still has the avatar */
        }
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", { detail: updatedUser }),
        );
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, [profilePath, role, storedProfileImage]);

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
    <div
      className={`topbar-user-menu-wrapper${
        shouldNavigateDirectly ? " staff-topbar-user-menu" : ""
      }`}
    >
      <div
        className={avatarClassName}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          if (shouldNavigateDirectly) {
            navigate(profilePath);
            return;
          }
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (shouldNavigateDirectly) {
              navigate(profilePath);
              return;
            }
            setOpen((prev) => !prev);
          }
        }}
      >
        <img
          src={resolvedAvatarSrc}
          alt={avatarAlt}
          className={isStaffDefaultProfileIcon ? "staff-topbar-profile-img" : ""}
        />
      </div>

      {!shouldNavigateDirectly && open && (
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
