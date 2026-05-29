import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetCalendar.css";
import "../../../css/responsive-tables.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getAppointments,
  updateAppointment,
} from "../../../api/api";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, value) => ({
  value,
  label: new Date(2000, value, 1).toLocaleString([], { month: "long" }),
}));

const APPT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_APPT_PAGE_SIZE = 25;

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const getLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isPastDateValue = (value) =>
  Boolean(value && value < getLocalDateKey(new Date()));

const normalizeStatus = (apt, fallback = "") =>
  String(apt?.status || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const getDisplayStatus = (apt) => {
  const status = normalizeStatus(apt);
  if (
    ["pending", "confirmed", "inprogress", "completed", "late", "cancelled"].includes(
      status,
    )
  ) {
    return status;
  }
  return "pending";
};

const getDisplayStatusLabel = (apt) => {
  const status = getDisplayStatus(apt);
  if (status === "pending") return "Pending";
  if (status === "confirmed") return "Confirmed";
  if (status === "inprogress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "late") return "Late";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
};

const isAppointmentPastDue = (apt) => {
  if (!apt?.scheduledAt) return false;
  const d = new Date(apt.scheduledAt);
  if (Number.isNaN(d.getTime())) return false;
  return isPastDateValue(getLocalDateKey(d));
};

const isPastDueQueueItem = (apt) =>
  !["completed", "cancelled"].includes(getDisplayStatus(apt)) &&
  isAppointmentPastDue(apt);

const getQueueStatusDisplay = (apt) => {
  if (getDisplayStatus(apt) === "completed") {
    return { label: "Completed", className: "completed" };
  }

  if (getDisplayStatus(apt) === "inprogress") {
    return { label: "In Progress", className: "inprogress" };
  }

  if (getDisplayStatus(apt) === "late" || isPastDueQueueItem(apt)) {
    return { label: "Late", className: "late" };
  }

  if (getDisplayStatus(apt) === "cancelled") {
    return { label: "Cancelled", className: "cancelled" };
  }

  if (getDisplayStatus(apt) === "pending") {
    return { label: "Pending", className: "pending" };
  }

  return { label: "Confirmed", className: "confirmed" };
};

const getOwnerName = (apt) =>
  `${apt?.owner?.firstName || ""} ${apt?.owner?.lastName || ""}`.trim() ||
  apt?.owner?.username ||
  "—";

// ─────────────────────────────────────────────────────
// VALIDATION CONFIRM MODAL
// ─────────────────────────────────────────────────────
const MODAL_META = {
  confirm: {
    icon: <ShieldCheck size={28} strokeWidth={2} />,
    iconClass: "vc-val-icon-confirm",
  },
  complete: {
    icon: <CheckCircle2 size={28} strokeWidth={2} />,
    iconClass: "vc-val-icon-complete",
  },
  delete: {
    icon: <AlertTriangle size={28} strokeWidth={2} />,
    iconClass: "vc-val-icon-delete",
  },
  reject: {
    icon: <AlertTriangle size={28} strokeWidth={2} />,
    iconClass: "vc-val-icon-delete",
  },
};

const ValidationModal = ({
  title,
  message,
  confirmLabel,
  confirmClass,
  modalType,
  onConfirm,
  onCancel,
}) => {
  const meta = MODAL_META[modalType] || MODAL_META.delete;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box vc-validation-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vc-val-title"
      >
        <div className={`vc-val-icon-wrap ${meta.iconClass}`}>
          {meta.icon}
        </div>
        <h3 className="vc-val-title" id="vc-val-title">
          {title}
        </h3>
        <p className="vc-val-msg">{message}</p>
        <div className="vc-val-actions">
          <button className="vc-val-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`vc-val-action-btn ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────
const VetCalendar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [apptDateFrom, setApptDateFrom] = useState("");
  const [apptDateTo, setApptDateTo] = useState("");
  const [apptStatusFilter, setApptStatusFilter] = useState("");
  const [apptPage, setApptPage] = useState(1);
  const [apptPageSize, setApptPageSize] = useState(DEFAULT_APPT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Queue modal (staff-style calendar day click)
  const [queueDateKey, setQueueDateKey] = useState("");

  // Detail view modal
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState(null);

  // Legacy status modals are no longer opened; kept for compatibility with older markup.
  const [pendingAppointment, setPendingAppointment] = useState(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [cancelledAppointment, setCancelledAppointment] = useState(null);

  // Validation confirmation modal
  const [validationModal, setValidationModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    confirmClass: "",
    modalType: "delete",
    onConfirm: null,
  });

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const aptRes = await getAppointments();
      setAppointments(aptRes.data || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ── Validation modal helpers ──
  const openValidation = (config) =>
    setValidationModal({ open: true, ...config });
  const closeValidation = () =>
    setValidationModal({
      open: false,
      title: "",
      message: "",
      confirmLabel: "",
      confirmClass: "",
      modalType: "delete",
      onConfirm: null,
    });

  // ── Detail modal helpers ──
  const openView = (apt) => {
    setViewing(apt);
    setShowModal(true);
    setError("");
  };
  const closeModal = () => {
    setShowModal(false);
    setViewing(null);
  };

  // ── Open detail modal from queue or list ──
  // ── Open queue modal (staff-style calendar day click) ──
  const openAppointmentQueue = (dateKey) => {
    setQueueDateKey(dateKey);
  };

  const closeQueue = () => setQueueDateKey("");

  // ── Status transitions with validation ──
  const performStatusUpdate = async (apt, newStatus) => {
    try {
      await updateAppointment(apt.id, { status: newStatus });
      await loadData();
    } catch {
      setError("Failed to update status");
    }
  };

  const handleCompleteAction = (apt, e) => {
    e && e.stopPropagation();
    const status = getDisplayStatus(apt);
    if (status === "completed" || isAppointmentPastDue(apt)) return;

    openValidation({
      title: "Mark as Completed",
      message: `Mark the appointment for ${
        apt.pet?.name || "this pet"
      } as completed? This cannot be undone.`,
      confirmLabel: "Yes, Mark Complete",
      confirmClass: "vc-val-complete",
      modalType: "complete",
      onConfirm: () => {
        closeValidation();
        performStatusUpdate(apt, "Completed");
      },
    });
  };

  // ── Calendar derived data ──
  const selectedMonth = calendarDate.getMonth();
  const selectedYear = calendarDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const aptYears = appointments
    .map((a) => new Date(a.scheduledAt).getFullYear())
    .filter(Number.isInteger);
  const firstYear = Math.min(currentYear - 100, selectedYear, ...aptYears);
  const lastYear = Math.max(currentYear + 25, selectedYear, ...aptYears);
  const yearOptions = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, i) => firstYear + i
  );

  const shiftMonth = (d) =>
    setCalendarDate(
      (p) => new Date(p.getFullYear(), p.getMonth() + d, 1)
    );
  const onCalendarMonthChange = (e) =>
    setCalendarDate(
      (p) => new Date(p.getFullYear(), Number(e.target.value), 1)
    );
  const onCalendarYearChange = (e) =>
    setCalendarDate((p) => new Date(Number(e.target.value), p.getMonth(), 1));

  // ── Filtered appointments ──
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const aptDate = new Date(a.scheduledAt);
      const ownerName =
        `${a.owner?.firstName || ""} ${a.owner?.lastName || ""}`.trim() ||
        a.owner?.username ||
        "";
      const query = search.trim().toLowerCase();

      if (
        query &&
        !(
          (a.pet?.name || "").toLowerCase().includes(query) ||
          ownerName.toLowerCase().includes(query) ||
          (a.owner?.email || "").toLowerCase().includes(query) ||
          getDisplayStatusLabel(a).toLowerCase().includes(query)
        )
      )
        return false;

      if (viewMode === "list") {
        if (
          apptStatusFilter === "Due" &&
          !isPastDateValue(getLocalDateKey(aptDate))
        )
          return false;
        if (
          apptStatusFilter &&
          apptStatusFilter !== "Due" &&
          getDisplayStatus(a) !== apptStatusFilter.toLowerCase()
        )
          return false;
        if (apptDateFrom && aptDate < new Date(apptDateFrom)) return false;
        if (apptDateTo && aptDate > new Date(apptDateTo + "T23:59:59"))
          return false;
      }

      if (viewMode === "calendar") {
        return (
          aptDate.getFullYear() === selectedYear &&
          aptDate.getMonth() === selectedMonth
        );
      }

      return true;
    });
  }, [
    appointments,
    viewMode,
    search,
    apptStatusFilter,
    apptDateFrom,
    apptDateTo,
    selectedYear,
    selectedMonth,
  ]);

  // ── Queue appointments for selected date ──
  const queueAppointments = useMemo(() => {
    if (!queueDateKey) return [];
    return appointments
      .filter(
        (a) =>
          getLocalDateKey(new Date(a.scheduledAt)) === queueDateKey
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [appointments, queueDateKey]);

  const queueDateLabel = queueDateKey
    ? new Date(`${queueDateKey}T00:00:00`).toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // ── Pagination ──
  const apptTotalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / apptPageSize)
  );
  const currentApptPage = Math.min(apptPage, apptTotalPages);
  const paginatedAppointments = filteredAppointments.slice(
    (currentApptPage - 1) * apptPageSize,
    currentApptPage * apptPageSize
  );
  const apptStartItem =
    filteredAppointments.length === 0
      ? 0
      : (currentApptPage - 1) * apptPageSize + 1;
  const apptEndItem = Math.min(
    currentApptPage * apptPageSize,
    filteredAppointments.length
  );

  useEffect(() => {
    if (apptPage > apptTotalPages) setApptPage(apptTotalPages);
  }, [apptPage, apptTotalPages]);

  // ── Modal date helpers ──
  const getScheduledDate = (s) =>
    s
      ? new Date(s).toLocaleDateString([], {
          weekday: "short",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";
  const getScheduledTime = (s) =>
    s
      ? new Date(s).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  // ── Past Due badge ──
  const getPastDueBadge = (apt) => {
    const status = normalizeStatus(apt);
    if (status === "completed" || status === "cancelled")
      return <span className="vc-pastdue-badge vc-pastdue-na">—</span>;
    if (isAppointmentPastDue(apt))
      return (
        <span className="vc-pastdue-badge vc-pastdue-yes">
          <AlertCircle size={11} strokeWidth={2.5} /> Past Due
        </span>
      );
    return (
      <span className="vc-pastdue-badge vc-pastdue-no">
        <Clock size={11} strokeWidth={2.5} /> On Time
      </span>
    );
  };

  // Single check action marks appointments completed.
  // ── 3-slot action buttons (table + queue) ──
  const renderActionButtons = (apt, { fromQueue = false } = {}) => {
    const displayStatus = getDisplayStatus(apt);
    const isPastDue = isAppointmentPastDue(apt);
    const canComplete =
      (displayStatus === "confirmed" || displayStatus === "inprogress") &&
      !isPastDue;
    const disabledTitle =
      displayStatus === "completed"
        ? "Already completed"
        : "Past due appointments cannot be marked completed";

    return (
      <div
        className="vc-action-btns"
        onClick={(e) => e.stopPropagation()}
      >
        {canComplete ? (
          <button
            type="button"
            className="vc-icon-btn vc-btn-complete"
            title="Mark as completed"
            onClick={(e) => {
              if (fromQueue) closeQueue();
              handleCompleteAction(apt, e);
            }}
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            className="vc-icon-btn vc-icon-btn-disabled"
            title={disabledTitle}
            disabled
            aria-disabled="true"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        )}

      </div>
    );
  };

  // ─────────────────────────────────────────────────────
  return (
    <div className="dashboard-container vet-calendar-shell">
      <VetSidebar isOpen={isOpen} onClose={close} />

      <main className="main-area">
        <header className="top-bar">
          <button
            className="hamburger-btn"
            onClick={toggle}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
          <h2>Veterinary Appointments</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/vet-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/vet-profile"
            />
          </div>
        </header>

        <section
          className={`content-body vet-calendar-body ${
            viewMode === "calendar" ? "appointment-calendar-body" : ""
          }`}
        >
          {/* ── View toggle + calendar search ── */}
          <div
            className={`calendar-controls ${
              viewMode === "list" ? "appointment-list-controls" : ""
            }`}
          >
            <div className="view-toggle">
              <button
                className={viewMode === "calendar" ? "active" : ""}
                onClick={() => setViewMode("calendar")}
              >
                Calendar View
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
            </div>

            {viewMode === "calendar" && (
              <div className="appointment-actions">
                <input
                  type="text"
                  className="apt-search"
                  placeholder="Search pet, owner, or status"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {loading && (
            <p className="list-placeholder">Loading appointments...</p>
          )}
          {!loading && error && <p className="modal-error">{error}</p>}

          {/* ══ CALENDAR VIEW ══ */}
          {!loading && viewMode === "calendar" && (
            <div className="calendar-container">
              <div className="calendar-month-header">
                <div className="month-nav">
                  <button
                    type="button"
                    className="calendar-nav-btn calendar-nav-prev"
                    onClick={() => shiftMonth(-1)}
                  >
                    &lt; Prev
                  </button>
                  <div className="calendar-picker">
                    <label>
                      <span>Month</span>
                      <select
                        value={selectedMonth}
                        onChange={onCalendarMonthChange}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Year</span>
                      <select
                        value={selectedYear}
                        onChange={onCalendarYearChange}
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="calendar-nav-btn calendar-nav-next"
                    onClick={() => shiftMonth(1)}
                  >
                    Next &gt;
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                {[
                  { full: "Sun", short: "S" },
                  { full: "Mon", short: "M" },
                  { full: "Tue", short: "T" },
                  { full: "Wed", short: "W" },
                  { full: "Thu", short: "T" },
                  { full: "Fri", short: "F" },
                  { full: "Sat", short: "S" },
                ].map((day) => (
                  <div key={day.full} className="weekday-label">
                    <span className="weekday-full">{day.full}</span>
                    <span className="weekday-short" aria-hidden="true">
                      {day.short}
                    </span>
                  </div>
                ))}

                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`e-${i}`} className="calendar-day empty" />
                ))}

                {days.map((d) => {
                  const dayDate = new Date(selectedYear, selectedMonth, d);
                  const isPastDay = dayDate < todayStart;
                  const dayKey = getLocalDateKey(dayDate);
                  const dayApts = filteredAppointments.filter(
                    (a) =>
                      new Date(a.scheduledAt).getFullYear() === selectedYear &&
                      new Date(a.scheduledAt).getMonth() === selectedMonth &&
                      new Date(a.scheduledAt).getDate() === d
                  );
                  const isQueueClickable = dayApts.length > 0;

                  return (
                    <div
                      key={d}
                      className={`calendar-day ${isPastDay ? "past-due" : ""} ${
                        isQueueClickable ? "appointment-queue-day" : ""
                      }`}
                      role={isQueueClickable ? "button" : undefined}
                      tabIndex={isQueueClickable ? 0 : undefined}
                      title={
                        isQueueClickable
                          ? `View ${dayApts.length} appointment${dayApts.length !== 1 ? "s" : ""}`
                          : undefined
                      }
                      onClick={() => {
                        if (isQueueClickable) openAppointmentQueue(dayKey);
                      }}
                      onKeyDown={(e) => {
                        if (
                          isQueueClickable &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          openAppointmentQueue(dayKey);
                        }
                      }}
                    >
                      <div className="vc-day-heading">
                        <span className="day-num">{d}</span>
                      </div>
                      {(isPastDay || dayApts.length > 0) && (
                        <div className="vc-day-status-row">
                          {isPastDay && (
                            <span className="vc-day-due-label">Due</span>
                          )}
                          {dayApts.length > 0 && (
                            <span className="appointment-count-badge">
                              {dayApts.length}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="day-events">
                        {/* Status summary badges instead of individual event pills */}
                        {dayApts.length > 0 && (
                          <div className="vc-day-summary">
                            {/* Show up to 2 status pills */}
                            {dayApts.slice(0, 2).map((apt) => (
                              <div
                                key={apt.id}
                                className={`event-item ${getDisplayStatus(apt)}`}
                                title={`${apt.pet?.name || "Pet"} - ${
                                  getDisplayStatusLabel(apt)
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAppointmentQueue(dayKey);
                                }}
                              >
                                {new Date(apt.scheduledAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}{" "}
                                {apt.pet?.name}
                              </div>
                            ))}
                            {dayApts.length > 2 && (
                              <div className="vc-more-badge">
                                +{dayApts.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ LIST VIEW ══ */}
          {!loading && viewMode === "list" && (
            <div className="list-view-container">
              <div className="appointment-list-description">
                <div>
                  <h3>Appointments</h3>
                  <p>Search, filter, and manage all appointments below.</p>
                </div>
                <span>{filteredAppointments.length} results</span>
              </div>

              <div className="appointment-list-toolbar">
                <div className="appointment-search-box">
                  <input
                    type="text"
                    className="apt-search"
                    placeholder="Search pet, owner, or status…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setApptPage(1);
                    }}
                  />

                  <label className="apt-entries-control">
                    <span>Show</span>
                    <select
                      className="apt-filter-select apt-entries-select"
                      value={apptPageSize}
                      onChange={(e) => {
                        setApptPageSize(Number(e.target.value));
                        setApptPage(1);
                      }}
                    >
                      {APPT_PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span>entries</span>
                  </label>

                  <select
                    className="apt-filter-select apt-status-filter-select"
                    value={apptStatusFilter}
                    onChange={(e) => {
                      setApptStatusFilter(e.target.value);
                      setApptPage(1);
                    }}
                    aria-label="Filter by appointment status"
                  >
                    <option value="">All Status</option>
                    <option value="Due">Past Due</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Late">Late</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <div
                    className="apt-date-range"
                    aria-label="Date range filter"
                  >
                    <label className="apt-date-field">
                      <span>From</span>
                      <input
                        type="date"
                        className="apt-date-input"
                        value={apptDateFrom}
                        onChange={(e) => {
                          setApptDateFrom(e.target.value);
                          setApptPage(1);
                        }}
                      />
                    </label>
                    <label className="apt-date-field">
                      <span>To</span>
                      <input
                        type="date"
                        className="apt-date-input"
                        value={apptDateTo}
                        onChange={(e) => {
                          setApptDateTo(e.target.value);
                          setApptPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {paginatedAppointments.length === 0 ? (
                <p className="list-placeholder">No appointments found.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="table-desktop">
                    <div className="vc-table-wrapper">
                      <table className="vc-table">
                        <thead>
                          <tr>
                            <th>Pet</th>
                            <th>Pet Owner</th>
                            <th>Date &amp; Time</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th className="vc-th-center">Past Due</th>
                            <th className="vc-th-actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAppointments.map((apt) => (
                            <tr
                              key={apt.id}
                              className="vc-table-row"
                              onClick={() => openView(apt)}
                            >
                              <td className="vc-td vc-td-pet">
                                {apt.pet?.name || "—"}
                              </td>
                              <td className="vc-td">{getOwnerName(apt)}</td>
                              <td className="vc-td vc-td-date">
                                <span className="vc-date-main">
                                  {new Date(apt.scheduledAt).toLocaleDateString(
                                    [],
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                                <span className="vc-date-time">
                                  {new Date(
                                    apt.scheduledAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </td>
                              <td className="vc-td vc-td-reason">
                                {apt.reason || "—"}
                              </td>
                              <td className="vc-td">
                                <span
                                  className={`apt-status ${getDisplayStatus(apt)}`}
                                >
                                  {getDisplayStatusLabel(apt)}
                                </span>
                              </td>
                              <td className="vc-td vc-td-center">
                                {getPastDueBadge(apt)}
                              </td>
                              <td
                                className="vc-td vc-td-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {renderActionButtons(apt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile cards */}
                  <div className="table-mobile table-cards-list">
                    {paginatedAppointments.map((apt) => (
                      <div
                        className="record-card"
                        key={apt.id}
                        onClick={() => openView(apt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openView(apt);
                          }
                        }}
                      >
                        <div className="record-card-header">
                          <div className="record-card-title">
                            <div className="record-card-id">
                              {apt.pet?.name || "—"}
                            </div>
                            <div className="record-card-patient">
                              {getOwnerName(apt)}
                            </div>
                          </div>
                          <span
                            className={`apt-status ${getDisplayStatus(apt)}`}
                          >
                            {getDisplayStatusLabel(apt)}
                          </span>
                        </div>
                        <div className="record-card-body">
                          <div className="record-card-row">
                            <span className="record-card-label">
                              Date &amp; Time
                            </span>
                            <span>
                              {new Date(apt.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="record-card-row">
                            <span className="record-card-label">Reason</span>
                            <span>{apt.reason || "—"}</span>
                          </div>
                          <div className="record-card-row">
                            <span className="record-card-label">Past Due</span>
                            {getPastDueBadge(apt)}
                          </div>
                          <div
                            className="record-card-row"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="record-card-label">Actions</span>
                            {renderActionButtons(apt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="appt-pagination">
                <button
                  className="appt-page-btn"
                  disabled={currentApptPage === 1}
                  onClick={() => setApptPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="appt-page-info">
                  Showing {apptStartItem}–{apptEndItem} of{" "}
                  {filteredAppointments.length}&nbsp;|&nbsp;Page{" "}
                  {currentApptPage} of {apptTotalPages}
                </span>
                <button
                  className="appt-page-btn"
                  disabled={currentApptPage === apptTotalPages}
                  onClick={() =>
                    setApptPage((p) => Math.min(apptTotalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ══ APPOINTMENT QUEUE MODAL (staff-style) ══ */}
      {queueDateKey && (
        <div
          className="modal-overlay vc-queue-overlay"
          onClick={closeQueue}
        >
          <div
            className="modal-box vc-queue-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Appointment queue for ${queueDateLabel}`}
          >
            <span className="vc-queue-badge">Appointment Queue</span>
            <h3 className="vc-queue-title">{queueDateLabel}</h3>
            <p className="vc-queue-copy">
              {queueAppointments.length === 1
                ? "1 appointment is scheduled for this date."
                : `${queueAppointments.length} appointments are scheduled for this date.`}
            </p>

            <div className="vc-queue-list">
              {queueAppointments.length === 0 ? (
                <p className="list-placeholder">
                  No appointments found for this date.
                </p>
              ) : (
                queueAppointments.map((apt, index) => {
                  const queueStatus = getQueueStatusDisplay(apt);
                  return (
                    <div
                      key={apt.id}
                      className={`vc-queue-row ${queueStatus.className}`}
                    >
                      <div className="vc-queue-number">#{index + 1}</div>
                      <div className="vc-queue-main">
                        <div className="vc-queue-top">
                          <strong>
                            {new Date(apt.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                          <span
                            className={`vc-queue-status ${queueStatus.className}`}
                          >
                            {queueStatus.label}
                          </span>
                        </div>
                        <div className="vc-queue-pet">
                          {apt.pet?.name || "—"}
                          {apt.pet?.species ? ` (${apt.pet.species})` : ""}
                        </div>
                        <div className="vc-queue-meta">
                          {getOwnerName(apt)}
                        </div>
                        {apt.reason && (
                          <div className="vc-queue-reason">{apt.reason}</div>
                        )}
                        {isPastDueQueueItem(apt) && (
                          <div className="vc-queue-pastdue-tag">
                            <AlertCircle size={11} strokeWidth={2.5} /> Past Due
                          </div>
                        )}
                      </div>
                      <div className="vc-queue-actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => {
                            closeQueue();
                            openView(apt);
                          }}
                        >
                          View
                        </button>
                        {queueStatus.className !== "no-compliance" &&
                          renderActionButtons(apt, { fromQueue: true })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions vc-queue-footer">
              <button
                type="button"
                className="step-back-btn"
                onClick={closeQueue}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PENDING APPOINTMENT MODAL ══ */}
      {pendingAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setPendingAppointment(null)}
        >
          <div
            className="modal-box pending-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="pending-appointment-badge">Confirmed</span>
            <h3>Confirmed Appointment</h3>
            <p className="pending-appointment-copy">
              This appointment is confirmed. You can mark it completed when the visit is done.
            </p>
            <div className="pending-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{pendingAppointment.pet?.name || "—"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>{getOwnerName(pendingAppointment)}</strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(pendingAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{pendingAppointment.reason || "—"}</strong>
              </div>
            </div>
            <div className="modal-actions pending-appointment-actions">
              <button
                className="step-back-btn"
                onClick={() => setPendingAppointment(null)}
              >
                Back
              </button>
              <button
                className="btn-complete"
                onClick={(e) => {
                  setPendingAppointment(null);
                  handleCompleteAction(pendingAppointment, e);
                }}
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRMED APPOINTMENT MODAL ══ */}
      {confirmedAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmedAppointment(null)}
        >
          <div
            className="modal-box confirmed-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="confirmed-appointment-badge">Confirmed</span>
            <h3>Appointment Confirmed</h3>
            <p className="confirmed-appointment-copy">
              This appointment is confirmed. Mark it complete when the visit is
              done.
            </p>
            <div className="confirmed-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{confirmedAppointment.pet?.name || "—"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>{getOwnerName(confirmedAppointment)}</strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(confirmedAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{confirmedAppointment.reason || "—"}</strong>
              </div>
            </div>
            <div className="modal-actions confirmed-appointment-actions">
              <button
                className="step-back-btn"
                onClick={() => setConfirmedAppointment(null)}
              >
                Back
              </button>
              <button
                className="btn-complete"
                onClick={(e) => {
                  setConfirmedAppointment(null);
                  handleCompleteAction(confirmedAppointment, e);
                }}
              >
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPLETED APPOINTMENT MODAL ══ */}
      {completedAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setCompletedAppointment(null)}
        >
          <div
            className="modal-box completed-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="completed-appointment-badge">Completed</span>
            <h3>Completed Appointment</h3>
            <p className="completed-appointment-copy">
              This appointment is already completed and cannot be edited.
            </p>
            <div className="completed-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{completedAppointment.pet?.name || "—"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>{getOwnerName(completedAppointment)}</strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(completedAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{completedAppointment.reason || "—"}</strong>
              </div>
            </div>
            <div className="modal-actions completed-appointment-actions">
              <button
                className="step-back-btn"
                onClick={() => setCompletedAppointment(null)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CANCELLED APPOINTMENT MODAL ══ */}
      {cancelledAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setCancelledAppointment(null)}
        >
          <div
            className="modal-box cancelled-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="cancelled-appointment-badge">Cancelled</span>
            <h3>Cancelled Appointment</h3>
            <p className="cancelled-appointment-copy">
              This appointment has been cancelled.
            </p>
            <div className="cancelled-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{cancelledAppointment.pet?.name || "—"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>{getOwnerName(cancelledAppointment)}</strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(cancelledAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{cancelledAppointment.reason || "—"}</strong>
              </div>
            </div>
            <div className="modal-actions cancelled-appointment-actions">
              <button
                className="step-back-btn"
                onClick={() => setCancelledAppointment(null)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETAIL VIEW MODAL ══ */}
      {showModal && viewing && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-banner">
              <div>
                <h3>Appointment Details</h3>
                <div
                  className={`modal-status-badge ${getDisplayStatus(viewing)}`}
                >
                  {getDisplayStatusLabel(viewing)}
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-info-row">
                <div className="modal-info-field">
                  <span className="modal-field-label">Pet Owner</span>
                  <span className="modal-field-value">
                    {getOwnerName(viewing)}
                  </span>
                </div>
                <div className="modal-info-field">
                  <span className="modal-field-label">Pet</span>
                  <span className="modal-field-value">
                    {viewing.pet?.name
                      ? `${viewing.pet.name}${
                          viewing.pet.species
                            ? ` (${viewing.pet.species})`
                            : ""
                        }`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="modal-divider" />
              <p className="modal-section-label">Scheduled At</p>
              <div className="modal-scheduled-row">
                <div className="modal-info-field">
                  <span className="modal-field-label">Date</span>
                  <span className="modal-field-value">
                    {getScheduledDate(viewing.scheduledAt)}
                  </span>
                </div>
                <div className="modal-info-field">
                  <span className="modal-field-label">Time</span>
                  <span className="modal-field-value">
                    {getScheduledTime(viewing.scheduledAt)}
                  </span>
                </div>
              </div>
              <div className="modal-divider" />
              <div className="modal-reason-row">
                <div className="modal-info-field">
                  <span className="modal-field-label">Reason</span>
                  <span className="modal-field-value">
                    {viewing.reason || "—"}
                  </span>
                </div>
              </div>
              <div className="modal-reason-row">
                <div className="modal-info-field">
                  <span className="modal-field-label">Status</span>
                  <span
                    className={`modal-field-value status-${getDisplayStatus(viewing)}`}
                  >
                    {getDisplayStatusLabel(viewing)}
                  </span>
                </div>
              </div>
              {viewing.notes && (
                <div className="modal-notes-row">
                  <div className="modal-info-field">
                    <span className="modal-field-label">Notes</span>
                    <div className="modal-notes-value">{viewing.notes}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="close-btn-footer" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VALIDATION CONFIRM MODAL ══ */}
      {validationModal.open && (
        <ValidationModal
          title={validationModal.title}
          message={validationModal.message}
          confirmLabel={validationModal.confirmLabel}
          confirmClass={validationModal.confirmClass}
          modalType={validationModal.modalType}
          onConfirm={validationModal.onConfirm}
          onCancel={closeValidation}
        />
      )}
    </div>
  );
};

export default VetCalendar;
