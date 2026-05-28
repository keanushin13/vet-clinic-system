import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getAppointments,
  getClinicSettings,
  getNotifications,
  sendPetOwnerChatbotMessage,
} from "../../../api/api";
import {
  getQuickAssistAccountFallback,
  getQuickAssistOfflineFallback,
  isPetOwnerAccountQuery,
  matchQuickAssistPattern,
} from "../../../lib/quickAssistPatterns";
import {
  loadQuickAssistMessages,
  QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
  saveQuickAssistMessages,
} from "../../../lib/quickAssistStorage";
import "../../../css/PetOwnerChatBot.css";

import pawLogo from "../../../assets/paw.png";
import supportIcon from "../../../assets/support.png";

const ASSISTANT_REPLY_DELAY_MS = 600;
const MAX_API_HISTORY_TURNS = 24;
const QUICK_PROMPTS = [
  "My next appointment",
  "My dog is sick",
  "How do I book?",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_CLINIC_INFO = {
  clinicName: "PawCruz Veterinary Clinic",
  address: "Please contact the clinic for the current address.",
  contactNumber: "the clinic",
  email: "Please contact the clinic for the current email.",
  operatingHours:
    "Monday to Sunday: 9:00 AM to 7:00 PM. Holiday hours should be confirmed with the clinic.",
  services: [
    "Wellness exams",
    "Vaccinations",
    "Spay and neuter",
    "Dental cleaning",
    "Grooming",
    "Laboratory tests",
    "Deworming",
    "Flea and tick treatment",
    "Emergency consultations",
  ],
  vaccines: ["DHPP", "Bordetella", "Rabies"],
  paymentMethods: ["In-person payment at the front desk"],
  appointmentInfo:
    "Book through the PawCruz app or by calling the clinic. Walk-ins are accepted subject to availability.",
  groomingInfo:
    "Grooming includes bath, blow dry, ear cleaning, nail trimming, and haircuts. Please book at least 2 days in advance.",
  emergencyPolicy:
    "Emergency consultations are accepted during clinic hours. Please call ahead when possible. For after-hours emergencies, go to the nearest 24-hour veterinary clinic.",
  announcements: [],
};

const FALLBACK_PROMPT = `
You are a friendly AI assistant for PawCruz Veterinary Clinic.
Clinic information is currently unavailable.
For all questions about hours, services, and pricing say:
I am unable to load clinic information right now. Please contact the clinic directly or visit us in person for accurate and up to date details.
`.trim();

const formatTime = (value) => {
  if (!value) return "";
  const [hourText, minuteText = "00"] = String(value).split(":");
  let hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  const minute = Number(minuteText);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(Number.isFinite(minute) ? minute : 0).padStart(2, "0")} ${suffix}`;
};

const formatOperatingHours = (settings = []) => {
  if (!Array.isArray(settings) || settings.length === 0) {
    return DEFAULT_CLINIC_INFO.operatingHours;
  }

  return settings
    .map((day) => {
      const label = DAY_NAMES[Number(day.dayOfWeek)] || "Day";
      if (!day.isOpen) return `${label}: Closed`;
      const hours = `${formatTime(day.openTime)} to ${formatTime(day.closeTime)}`;
      const breakText =
        day.breakStart && day.breakEnd
          ? `, break ${formatTime(day.breakStart)} to ${formatTime(day.breakEnd)}`
          : "";
      return `${label}: ${hours}${breakText}`;
    })
    .join("\n");
};

const normalizeClinicInfo = ({ settings = [], notifications = [] } = {}) => {
  const announcements = Array.isArray(notifications)
    ? notifications
        .filter((notification) => {
          const text = `${notification?.type || ""} ${notification?.title || ""}`.toLowerCase();
          return text.includes("announcement") || text.includes("promo");
        })
        .slice(0, 3)
        .map((notification) =>
          [notification.title, notification.body].filter(Boolean).join(": "),
        )
        .filter(Boolean)
    : [];

  return {
    ...DEFAULT_CLINIC_INFO,
    operatingHours: formatOperatingHours(settings),
    announcements,
  };
};

const fetchClinicInfo = async () => {
  try {
    const [settingsRes, notificationsRes] = await Promise.allSettled([
      getClinicSettings(),
      getNotifications(),
    ]);

    const settings =
      settingsRes.status === "fulfilled" && Array.isArray(settingsRes.value?.data)
        ? settingsRes.value.data
        : [];
    const notifications =
      notificationsRes.status === "fulfilled" &&
      Array.isArray(notificationsRes.value?.data)
        ? notificationsRes.value.data
        : [];

    return normalizeClinicInfo({ settings, notifications });
  } catch (error) {
    console.log("Failed to fetch clinic info:", error);
    return null;
  }
};

const buildSystemPrompt = (info) => {
  if (!info) return FALLBACK_PROMPT;

  return `
You are a friendly AI assistant for ${info.clinicName}.
You are talking directly to pet owners, not clinic staff.
Be warm, simple, and easy to understand. Never use technical clinic system terms.

CLINIC INFORMATION:
Name: ${info.clinicName}
Address: ${info.address}
Contact: ${info.contactNumber}
Email: ${info.email}

OPERATING HOURS:
${info.operatingHours}

SERVICES OFFERED:
${info.services.join(", ")}

VACCINES AVAILABLE:
${info.vaccines.join(", ")}

PAYMENT METHODS:
${info.paymentMethods.join(", ")}

APPOINTMENT BOOKING:
${info.appointmentInfo}

GROOMING:
${info.groomingInfo}

EMERGENCY POLICY:
${info.emergencyPolicy}

ACTIVE PROMOS OR ANNOUNCEMENTS:
${info.announcements.length ? info.announcements.join("\n") : "No active promos or announcements loaded."}

CORE RULES:
- You are talking to pet owners, so be warm and reassuring.
- Only use the clinic information provided above.
- Never guess or make up clinic details.
- Never diagnose or give medical advice.
- If a pet owner says their pet is sick, tell them: Please bring your pet to the clinic as soon as possible so our veterinarian can check them. If it is urgent, please come in right away or call us at ${info.contactNumber}.
- Always answer short questions directly without asking for more details first.
- For pricing always say: For exact pricing please ask our front desk staff or call us at ${info.contactNumber}.
- Never confirm actions you cannot perform.
- If you do not know something say: I am not sure about that. Please contact us at ${info.contactNumber} or visit the clinic directly.

TONE:
- Friendly and caring, like talking to a helpful receptionist.
- Use simple words that any pet owner can understand.
- Be reassuring especially when a pet owner is worried.
- Keep responses short and easy to read.
`.trim();
};

const waitAssistantReply = () =>
  new Promise((resolve) => setTimeout(resolve, ASSISTANT_REPLY_DELAY_MS));

const createMessage = ({ role, text, id }) => ({
  id: id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
});

const defaultGreetingMessage = () =>
  createMessage({
    role: "assistant",
    text:
      "Hi! I am Quick Assist for PawCruz Veterinary Clinic. I can check your appointments, answer clinic FAQs, and share safe pet-care guidance. For symptoms, I can help with first steps, but a PawCruz vet should examine your pet.",
  });

const buildConversationHistoryForApi = (messages, latestUserText) => {
  const thread = messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.id !== QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
    )
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.text,
    }));

  thread.push({ role: "user", content: latestUserText });
  return thread.slice(-MAX_API_HISTORY_TURNS);
};

const isAssistantUnavailable = (status, message) =>
  status === 404 ||
  status === 502 ||
  status === 503 ||
  status === 504 ||
  String(message || "").includes("Network Error");

const normalizeStatus = (status) =>
  String(status || "Pending").trim().toLowerCase();

const isAppointmentAccountQuestion = (text) => {
  const normalized = String(text || "").toLowerCase();
  if (!/\b(appointment|appointments|booking|bookings)\b/.test(normalized)) {
    return false;
  }

  return (
    /\b(my|our)\b/.test(normalized) ||
    /\b(do i have|have i|when is|when are|when's|show|list|tell me|what are|what is|see|view)\b/.test(
      normalized,
    ) ||
    /\b(upcoming|next|pending|confirmed|cancelled|canceled|completed)\b/.test(
      normalized,
    )
  );
};

const getAppointmentStatusFilter = (text) => {
  const normalized = String(text || "").toLowerCase();
  if (/\bpending\b/.test(normalized)) return "pending";
  if (/\bconfirmed\b/.test(normalized)) return "confirmed";
  if (/\b(cancelled|canceled)\b/.test(normalized)) return "cancelled";
  if (/\bcompleted\b/.test(normalized)) return "completed";
  return "";
};

const isNextAppointmentQuestion = (text) =>
  /\b(next|upcoming|nearest|soonest|soon|when is|when's|when are)\b/i.test(
    text || "",
  );

const formatAppointmentDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date not set";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAppointmentVetName = (appointment) => {
  const vet = appointment?.vet;
  if (!vet) return "Vet not assigned";
  return (
    `${vet.firstName || ""} ${vet.lastName || ""}`.trim() ||
    vet.username ||
    "Vet not assigned"
  );
};

const formatAppointmentLine = (appointment, index) => {
  const petName = appointment?.pet?.name || "Pet";
  const dateText = formatAppointmentDate(appointment?.scheduledAt);
  const status = appointment?.status || "Pending";
  const reason = appointment?.reason ? ` for ${appointment.reason}` : "";

  return `${index + 1}. ${petName} - ${dateText} with ${getAppointmentVetName(
    appointment,
  )} (${status})${reason}.`;
};

const buildAppointmentSummaryReply = (appointments, questionText) => {
  const normalizedQuestion = String(questionText || "").toLowerCase();
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const now = new Date();
  const upcomingAppointments = sortedAppointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduledAt);
    const status = normalizeStatus(appointment.status);
    return (
      !Number.isNaN(scheduledAt.getTime()) &&
      scheduledAt >= now &&
      status !== "cancelled" &&
      status !== "completed"
    );
  });
  const statusFilter = getAppointmentStatusFilter(normalizedQuestion);

  if (sortedAppointments.length === 0) {
    return "I could not find any appointments in your account yet. You can book one from the Appointment page in your PawCruz account.";
  }

  if (statusFilter) {
    const matches = sortedAppointments.filter(
      (appointment) => normalizeStatus(appointment.status) === statusFilter,
    );

    if (matches.length === 0) {
      return `I could not find any ${statusFilter} appointments in your account. You can review or book visits from the Appointment page.`;
    }

    return `Here are your ${statusFilter} appointments (showing up to 3):\n${matches
      .slice(0, 3)
      .map(formatAppointmentLine)
      .join("\n")}${
      matches.length > 3
        ? "\nOpen the Appointment page to see the full list."
        : ""
    }`;
  }

  if (isNextAppointmentQuestion(normalizedQuestion)) {
    if (upcomingAppointments.length === 0) {
      return "I could not find an upcoming appointment in your account. You can book a visit from the Appointment page in your PawCruz account.";
    }

    return `Your next appointment is:\n${formatAppointmentLine(
      upcomingAppointments[0],
      0,
    )}`;
  }

  const statusCounts = sortedAppointments.reduce((counts, appointment) => {
    const status = appointment?.status || "Pending";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const statusSummary = Object.entries(statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ");
  const upcomingSummary =
    upcomingAppointments.length > 0
      ? `\nUpcoming appointments:\n${upcomingAppointments
          .slice(0, 3)
          .map(formatAppointmentLine)
          .join("\n")}`
      : "\nI found appointment history, but no upcoming appointment.";

  return `I found ${sortedAppointments.length} appointment${
    sortedAppointments.length === 1 ? "" : "s"
  } in your account. Status summary: ${statusSummary}.${upcomingSummary}${
    upcomingAppointments.length > 3
      ? "\nOpen the Appointment page to see all upcoming visits."
      : ""
  }`;
};

const appointmentFallbackReply =
  "I could not load your appointment details right now. Please open the Appointment page in your PawCruz account to review or book visits.";

export default function PetOwnerChatBot({
  enabled = false,
  user = {},
  variant = "floating",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPetOwnerPath = location.pathname.startsWith("/pet-owner");
  const isFloating = variant === "floating";
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [clinicInfo, setClinicInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const shouldRender =
    enabled &&
    user?.role === "pet_owner" &&
    isPetOwnerPath &&
    !(isFloating && location.pathname === "/pet-owner-messages");
  const isVisible = isOpen || !isFloating;

  const initialMessages = useMemo(() => {
    if (!userId) return [];
    return loadQuickAssistMessages(userId) || [defaultGreetingMessage()];
  }, [userId]);

  useEffect(() => {
    if (!shouldRender) {
      setIsOpen(false);
      return;
    }
    setMessages(initialMessages);
  }, [initialMessages, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      setClinicInfo(null);
      setIsReady(false);
      return undefined;
    }

    let cancelled = false;

    const loadClinicInfo = async () => {
      const info = await fetchClinicInfo();
      if (cancelled) return;
      setClinicInfo(info);
      setIsReady(true);
    };

    loadClinicInfo();

    const interval = window.setInterval(async () => {
      const info = await fetchClinicInfo();
      if (!cancelled && info) setClinicInfo(info);
    }, 1000 * 60 * 30);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || !userId || messages.length === 0) return;
    saveQuickAssistMessages(userId, messages);
  }, [messages, shouldRender, userId]);

  useEffect(() => {
    if (!isVisible) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [isVisible, messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const replaceTypingWithAssistant = useCallback((assistantText) => {
    setMessages((current) => [
      ...current.filter(
        (message) => message.id !== QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
      ),
      createMessage({ role: "assistant", text: assistantText }),
    ]);
  }, []);

  const handleSend = async (presetText = "") => {
    const trimmed = String(presetText || input).trim();
    if (!trimmed || isSending || !isReady) return;

    setError("");
    setIsSending(true);

    const userMessage = createMessage({ role: "user", text: trimmed });
    const typingMessage = createMessage({
      id: QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
      role: "assistant",
      text: "Quick Assist is preparing a reply...",
    });

    setMessages((current) => [...current, userMessage, typingMessage]);
    setInput("");

    await waitAssistantReply();

    const appointmentQuery = isAppointmentAccountQuestion(trimmed);
    let appointmentLookupFailed = false;
    const accountQuery = isPetOwnerAccountQuery(trimmed) || appointmentQuery;
    const priorityPatternHit = matchQuickAssistPattern(trimmed);

    if (
      priorityPatternHit &&
      ["pet_health_urgent", "pet_symptom_guidance", "pet_health_redirect"].includes(
        priorityPatternHit.id,
      )
    ) {
      replaceTypingWithAssistant(priorityPatternHit.reply);
      setIsSending(false);
      return;
    }

    if (appointmentQuery) {
      try {
        const appointmentRes = await getAppointments();
        const payload = appointmentRes?.data;
        const appointmentData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.appointments)
            ? payload.appointments
            : [];

        replaceTypingWithAssistant(
          buildAppointmentSummaryReply(appointmentData, trimmed),
        );
        setIsSending(false);
        return;
      } catch {
        appointmentLookupFailed = true;
      }
    }

    try {
      const conversationHistory = buildConversationHistoryForApi(
        messages,
        trimmed,
      );
      const systemPrompt = clinicInfo
        ? buildSystemPrompt(clinicInfo)
        : FALLBACK_PROMPT;

      console.log("SENDING TO API:", JSON.stringify({
        headers: { backendAuth: localStorage.getItem("token") ? "present" : "MISSING" },
        system: systemPrompt ? "present" : "MISSING",
        messages: conversationHistory,
      }, null, 2));

      const data = await sendPetOwnerChatbotMessage({
        message: trimmed,
        conversationHistory,
        context: {
          persona: "quick_assist",
          route: location.pathname,
          clinicInfo,
          systemPrompt,
        },
      });

      const replyText =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : appointmentLookupFailed
            ? appointmentFallbackReply
          : accountQuery
            ? getQuickAssistAccountFallback()
            : getQuickAssistOfflineFallback();

      replaceTypingWithAssistant(replyText);
    } catch (err) {
      console.log("FULL ERROR:", err?.message);
      console.log("ERROR DETAIL:", JSON.stringify(err, null, 2));
      const status = err?.status;
      const unavailable = isAssistantUnavailable(status, err?.message);
      const patternHit = accountQuery ? null : matchQuickAssistPattern(trimmed);

      if (status === 401) {
        setError("Your session expired. Please sign in again.");
        replaceTypingWithAssistant(
          "I couldn't verify your login. Please refresh the page or sign in again, then try your question again.",
        );
      } else if (status === 403) {
        setError("Quick Assist is only available for pet owner accounts.");
        replaceTypingWithAssistant(
          "This assistant can only answer pet owner account questions for the signed-in pet owner.",
        );
      } else {
        if (!unavailable && err?.message) setError(err.message);
        replaceTypingWithAssistant(
          appointmentLookupFailed
            ? appointmentFallbackReply
            : patternHit?.reply
            ? patternHit.reply
            : accountQuery
            ? getQuickAssistAccountFallback()
            : getQuickAssistOfflineFallback(),
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleLauncherClick = () => {
    setError("");
    setIsOpen((current) => !current);
  };

  if (!shouldRender) return null;

  const showQuickPrompts = !messages.some((message) => message.role === "user");

  const chatPanel = (
    <section
      className={`po-chatbot-panel${isFloating ? "" : " po-chatbot-panel--embedded"}`}
      aria-label="Quick Assist chat"
    >
          <header className="po-chatbot-panel-header">
            <button
              type="button"
              className="po-chatbot-brand"
              onClick={() => navigate("/pet-owner")}
              aria-label="Open pet owner dashboard"
            >
              <span className="po-chatbot-brand-icon">
                <img src={pawLogo} alt="" aria-hidden="true" />
              </span>
              <span>
                <strong>Quick Assist</strong>
                <small>PawCruz support</small>
              </span>
            </button>
            {isFloating ? (
              <button
                type="button"
                className="po-chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Quick Assist"
              >
                x
              </button>
            ) : null}
          </header>

          <div className="po-chatbot-disclaimer">
            Ask about your appointments or pet symptoms. Pet-care replies are
            general guidance only; for emergencies, contact a veterinarian right
            away.
          </div>

          <div ref={listRef} className="po-chatbot-messages" role="log">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`po-chatbot-bubble ${message.role === "user" ? "user" : "assistant"}${
                  message.id === QUICK_ASSIST_TYPING_PLACEHOLDER_ID
                    ? " typing"
                    : ""
                }`}
              >
                <div className="po-chatbot-text">{message.text}</div>
              </div>
            ))}
            {!isReady ? (
              <div className="po-chatbot-bubble assistant typing">
                <div className="po-chatbot-text">Loading your assistant...</div>
              </div>
            ) : null}
            {showQuickPrompts && (
              <div className="po-chatbot-suggestions" aria-label="Quick prompts">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="po-chatbot-suggestion"
                    onClick={() => handleSend(prompt)}
                    disabled={isSending || !isReady}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? <div className="po-chatbot-error">{error}</div> : null}

          <div className="po-chatbot-input-row">
            <input
              ref={inputRef}
              className="po-chatbot-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              placeholder="Ask about appointments or pet symptoms..."
              disabled={isSending || !isReady}
              aria-label="Chat message"
            />
            <button
              type="button"
              className="po-chatbot-send"
              onClick={() => handleSend()}
              disabled={isSending || !isReady || !input.trim()}
            >
              {isSending ? "..." : isReady ? "Send" : "..."}
            </button>
          </div>
    </section>
  );

  if (!isFloating) {
    return <div className="po-chatbot-embedded">{chatPanel}</div>;
  }

  return (
    <div className={`po-chatbot-widget${isOpen ? " open" : ""}`}>
      {isOpen ? chatPanel : null}
      <button
        type="button"
        className="po-chatbot-launcher"
        onClick={handleLauncherClick}
        aria-label={isOpen ? "Close Quick Assist" : "Open Quick Assist"}
        aria-expanded={isOpen}
      >
        <img src={supportIcon} alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
