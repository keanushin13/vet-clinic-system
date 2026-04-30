import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../css/PetOwnerTutorial.css";

const STORAGE_KEY = "petOwnerTutorialDone";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to PawCruz! \uD83D\uDC3E",
    description:
      "This quick tour will show you how to use your dashboard. You can skip at any time by pressing the X button.",
    targetId: null,
    position: "center",
    route: "/pet-owner",
  },
  {
    id: "dashboard-stats",
    title: "Your Dashboard",
    description:
      "Here you can see a quick summary \u2014 how many pets you have registered, upcoming appointments, and unread messages.",
    targetId: "tutorial-stats",
    position: "bottom",
    route: "/pet-owner",
  },
  {
    id: "sidebar-nav",
    title: "Navigation Menu",
    description:
      "Use the sidebar (or the bottom bar on mobile) to navigate between sections: Appointments, My Pets, Messages, Medical Records, and Payment History.",
    targetId: "tutorial-sidebar",
    position: "right",
    route: "/pet-owner",
  },
  {
    id: "my-pets",
    title: "My Pets",
    description:
      'Add and manage your pets here. Each pet has its own profile with breed, age, and health info. Tap "+ Add Pet" to register your first pet.',
    targetId: null,
    position: "center",
    route: "/pet-owner-pets",
  },
  {
    id: "appointments",
    title: "Book an Appointment",
    description:
      "Schedule a vet visit by selecting a veterinarian, picking a date, and choosing an available time slot. Your upcoming appointments also appear here.",
    targetId: null,
    position: "center",
    route: "/pet-owner-appointments",
  },
  {
    id: "medical-records",
    title: "Medical Records",
    description:
      "View your pet\u2019s full medical history \u2014 diagnoses, prescriptions, and vet notes \u2014 all organized by visit.",
    targetId: null,
    position: "center",
    route: "/pet-owner-records",
  },
  {
    id: "messages",
    title: "Messages",
    description:
      "Send and receive messages directly with the clinic staff or veterinarians. Great for quick questions or follow-ups.",
    targetId: null,
    position: "center",
    route: "/pet-owner-messages",
  },
  {
    id: "payment-history",
    title: "Payment History",
    description:
      "Review all your past and pending payments. You can see the service, amount, and status for each transaction.",
    targetId: null,
    position: "center",
    route: "/pet-owner-payments",
  },
  {
    id: "profile",
    title: "Your Profile",
    description:
      "Update your contact details, change your password, and manage your account settings here.",
    targetId: null,
    position: "center",
    route: "/pet-owner-profile",
  },
  {
    id: "done",
    title: "You\u2019re all set! \uD83C\uDF89",
    description:
      "You now know the basics of PawCruz. Explore at your own pace. You can restart this tour anytime from your Profile page.",
    targetId: null,
    position: "center",
    route: "/pet-owner",
  },
];

export default function PetOwnerTutorial({ onDone }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const tooltipRef = useRef(null);

  const current = STEPS[step];

  useEffect(() => {
    if (current.route) navigate(current.route);
  }, [step, current.route, navigate]);

  const updateSpotlight = useCallback(() => {
    if (!current.targetId) {
      setSpotlightRect(null);
      return;
    }
    const el = document.getElementById(current.targetId);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const p = 10;
    setSpotlightRect({
      top: r.top - p,
      left: r.left - p,
      width: r.width + p * 2,
      height: r.height + p * 2,
    });
  }, [current.targetId]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    return () => window.removeEventListener("resize", updateSpotlight);
  }, [updateSpotlight]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    onDone();
  }, [onDone]);

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const getTooltipStyle = () => {
    if (!spotlightRect || current.position === "center") return {};
    const m = 16;
    const CARD_H = 230; // estimated card height
    const CARD_W = 300;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const BOTTOM_NAV = 70; // space for mobile bottom nav

    if (current.position === "bottom") {
      const topBelow = spotlightRect.top + spotlightRect.height + m;
      // flip above if card would be cut off by bottom nav / viewport
      const top =
        topBelow + CARD_H > vh - BOTTOM_NAV
          ? Math.max(12, spotlightRect.top - CARD_H - m)
          : topBelow;
      const left = Math.min(Math.max(12, spotlightRect.left), vw - CARD_W - 12);
      return { top, left };
    }
    if (current.position === "right") {
      const leftRight = spotlightRect.left + spotlightRect.width + m;
      // flip left if no room on the right
      const left =
        leftRight + CARD_W > vw - 12
          ? Math.max(12, spotlightRect.left - CARD_W - m)
          : leftRight;
      return { top: Math.max(12, spotlightRect.top), left };
    }
    return {};
  };

  const isCentered = !spotlightRect || current.position === "center";

  return (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
    >
      {spotlightRect ? (
        <svg className="tutorial-spotlight-svg" aria-hidden="true">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#spotlight-mask)"
          />
          <rect
            x={spotlightRect.left}
            y={spotlightRect.top}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx="8"
            fill="none"
            stroke="#63b6c5"
            strokeWidth="2.5"
          />
        </svg>
      ) : (
        <div className="tutorial-backdrop" />
      )}

      <div
        ref={tooltipRef}
        className={`tutorial-card${isCentered ? " tutorial-card--center" : " tutorial-card--anchored"}`}
        style={isCentered ? {} : getTooltipStyle()}
      >
        <button
          className="tutorial-close"
          onClick={finish}
          aria-label="Skip tutorial"
        >
          &#x2715;
        </button>

        <div className="tutorial-step-indicator">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot${i === step ? " active" : i < step ? " done" : ""}`}
            />
          ))}
        </div>

        <h3 className="tutorial-title">{current.title}</h3>
        <p className="tutorial-desc">{current.description}</p>

        <div className="tutorial-actions">
          {step > 0 && (
            <button className="tutorial-btn tutorial-btn--back" onClick={back}>
              Back
            </button>
          )}
          <button className="tutorial-btn tutorial-btn--next" onClick={next}>
            {step === STEPS.length - 1 ? "Get Started" : "Next \u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
