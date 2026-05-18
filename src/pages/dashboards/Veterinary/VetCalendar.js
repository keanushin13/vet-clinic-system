import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffAppointment.css";
import "../../../css/responsive-tables.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getPets,
  updateAppointment,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const VetCalendar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [calView, setCalView] = useState("month"); // "month" | "week" | "day"
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    petId: "",
    scheduledAt: "",
    reason: "",
    notes: "",
    status: "Pending",
  });
  const [expandedStatus, setExpandedStatus] = useState({
    Pending: true,
    Confirmed: true,
    Ongoing: true,
    Completed: false,
    Cancelled: false,
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
      const [aptRes, petRes] = await Promise.all([
        getAppointments(),
        getPets(),
      ]);
      setAppointments(aptRes.data || []);
      setPets(petRes.data || []);
    } catch {
      setError("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      petId: pets[0]?.id || "",
      scheduledAt: "",
      reason: "",
      notes: "",
      status: "Pending",
    });
    setShowModal(true);
    setError("");
  };

  const openEdit = (apt) => {
    setEditing(apt);
    setForm({
      petId: apt.petId,
      scheduledAt: new Date(apt.scheduledAt).toISOString().slice(0, 16),
      reason: apt.reason || "",
      notes: apt.notes || "",
      status: apt.status || "Pending",
    });
    setShowModal(true);
    setError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSaving(false);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitAppointment = async (e) => {
    e.preventDefault();
    if (!form.petId || !form.scheduledAt) {
      setError("Pet and schedule are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateAppointment(editing.id, {
          scheduledAt: form.scheduledAt,
          reason: form.reason,
          notes: form.notes,
          status: form.status,
        });
      } else {
        await createAppointment({
          petId: form.petId,
          scheduledAt: form.scheduledAt,
          reason: form.reason,
          notes: form.notes,
        });
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  const removeAppointment = async (apt) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await deleteAppointment(apt.id);
      await loadData();
    } catch {
      setError("Failed to delete appointment");
    }
  };

  const quickStatus = async (apt, newStatus) => {
    try {
      await updateAppointment(apt.id, { status: newStatus });
      await loadData();
    } catch {
      setError("Failed to update status");
    }
  };

  // ── Derived data ──

  const speciesOptions = useMemo(
    () => [...new Set(pets.map((p) => p.species).filter(Boolean))],
    [pets],
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const aptDate = new Date(a.scheduledAt);

      // Month restriction applies only to calendar views
      if (viewMode !== "list") {
        const matchesMonth =
          aptDate.getFullYear() === calendarDate.getFullYear() &&
          aptDate.getMonth() === calendarDate.getMonth();
        if (!matchesMonth) return false;
      }

      // Text search
      const query = search.toLowerCase();
      if (
        query &&
        !(
          (a.pet?.name || "").toLowerCase().includes(query) ||
          (a.reason || "").toLowerCase().includes(query) ||
          (a.status || "").toLowerCase().includes(query)
        )
      )
        return false;

      // Date range (list view only)
      if (viewMode === "list") {
        if (dateFrom && aptDate < new Date(dateFrom)) return false;
        if (dateTo && aptDate > new Date(dateTo + "T23:59:59")) return false;
      }

      // Species filter (list view only)
      if (viewMode === "list" && speciesFilter && (a.pet?.species || "") !== speciesFilter)
        return false;

      // Service/reason filter (list view only)
      if (
        viewMode === "list" &&
        serviceFilter &&
        !(a.reason || "").toLowerCase().includes(serviceFilter.toLowerCase())
      )
        return false;

      return true;
    });
  }, [
    appointments,
    viewMode,
    calendarDate,
    search,
    dateFrom,
    dateTo,
    speciesFilter,
    serviceFilter,
  ]);

  // Group for list view
  const groupedAppointments = useMemo(
    () =>
      filteredAppointments.reduce((acc, apt) => {
        const status = apt.status || "Pending";
        if (!acc[status]) acc[status] = [];
        acc[status].push(apt);
        return acc;
      }, {}),
    [filteredAppointments],
  );

  const statusOrder = ["Pending", "Confirmed", "Ongoing", "Completed", "Cancelled"];
  const sortedStatuses = statusOrder.filter(
    (s) => groupedAppointments[s]?.length > 0,
  );

  const toggleStatus = (status) => {
    setExpandedStatus((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { icon: "🟡", color: "#ff9800" },
      Confirmed: { icon: "🟢", color: "#4caf50" },
      Ongoing: { icon: "🔵", color: "#2196f3" },
      Completed: { icon: "✓", color: "#607d8b" },
      Cancelled: { icon: "✕", color: "#f44336" },
    };
    return configs[status] || configs.Pending;
  };

  // ── Month calendar data ──
  const monthStart = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = monthStart.getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthLabel = calendarDate.toLocaleString([], {
    month: "long",
    year: "numeric",
  });

  // ── Week view data ──
  const weekStart = useMemo(() => {
    const d = new Date(calendarDate);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [calendarDate]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // ── Day view data ──
  const dayApts = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            new Date(a.scheduledAt).toDateString() ===
            calendarDate.toDateString(),
        )
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [appointments, calendarDate],
  );

  // ── Edit/Delete SVG icons (shared) ──
  const editIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10-10-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 6l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
  const deleteIcon = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="dashboard-container">
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
          <h2>Vet Schedule</h2>
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

        <section className="content-body">
          {/* View toggle + search + add */}
          <div className="calendar-controls">
            <div className="view-toggle">
              <button
                className={
                  viewMode === "calendar" && calView === "month" ? "active" : ""
                }
                onClick={() => {
                  setViewMode("calendar");
                  setCalView("month");
                }}
              >
                Month
              </button>
              <button
                className={
                  viewMode === "calendar" && calView === "week" ? "active" : ""
                }
                onClick={() => {
                  setViewMode("calendar");
                  setCalView("week");
                }}
              >
                Week
              </button>
              <button
                className={
                  viewMode === "calendar" && calView === "day" ? "active" : ""
                }
                onClick={() => {
                  setViewMode("calendar");
                  setCalView("day");
                }}
              >
                Day
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
            <div className="appointment-actions">
              <input
                type="text"
                className="apt-search"
                placeholder="Search pet, reason, or status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="add-apt-btn" onClick={openCreate}>
                + Add Appointment
              </button>
            </div>
          </div>

          {/* List-view filter bar */}
          {viewMode === "list" && (
            <div className="apt-filter-bar">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
              >
                <option value="">All Species</option>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Filter by service/reason"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
              <button
                className="apt-reset-btn"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSpeciesFilter("");
                  setServiceFilter("");
                  setSearch("");
                }}
              >
                Reset
              </button>
            </div>
          )}

          {/* ── MONTH VIEW ── */}
          {viewMode === "calendar" && calView === "month" && (
            <div className="calendar-container">
              <div className="calendar-month-header">
                <h3>{monthLabel}</h3>
                <div className="month-nav">
                  <button
                    onClick={() =>
                      setCalendarDate(
                        (prev) =>
                          new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                      )
                    }
                  >
                    &lt; Prev
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate(
                        (prev) =>
                          new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                      )
                    }
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
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="calendar-day empty" />
                ))}
                {days.map((day) => {
                  const dayAptsCal = filteredAppointments.filter(
                    (a) => new Date(a.scheduledAt).getDate() === day,
                  );
                  return (
                    <div key={day} className="calendar-day">
                      <span className="day-num">{day}</span>
                      <div className="day-events">
                        {dayAptsCal.map((a) => (
                          <div
                            key={a.id}
                            className={`event-item ${(a.status || "").toLowerCase()}`}
                            title={`${a.pet?.name || "Pet"} - ${a.status}`}
                            onClick={() => openEdit(a)}
                            style={{ cursor: "pointer" }}
                          >
                            {new Date(a.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {a.pet?.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {viewMode === "calendar" && calView === "week" && (
            <div className="calendar-container">
              <div className="calendar-month-header">
                <h3>
                  Week of{" "}
                  {weekStart.toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <div className="month-nav">
                  <button
                    onClick={() =>
                      setCalendarDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() - 7);
                        return d;
                      })
                    }
                  >
                    &lt; Prev
                  </button>
                  <button onClick={() => setCalendarDate(new Date())}>
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() + 7);
                        return d;
                      })
                    }
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
              <div className="week-grid">
                {weekDays.map((day) => {
                  const weekDayApts = appointments
                    .filter(
                      (a) =>
                        new Date(a.scheduledAt).toDateString() ===
                        day.toDateString(),
                    )
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledAt) - new Date(b.scheduledAt),
                    );
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={day.toISOString()}
                      className={`week-day-col ${isToday ? "today" : ""}`}
                    >
                      <div className="week-day-header">
                        <span className="week-day-name">
                          {day.toLocaleDateString([], { weekday: "short" })}
                        </span>
                        <span className="week-day-num">{day.getDate()}</span>
                      </div>
                      <div className="week-day-apts">
                        {weekDayApts.map((a) => (
                          <div
                            key={a.id}
                            className={`event-item ${(a.status || "").toLowerCase()}`}
                            title={`${a.pet?.name} - ${a.reason || ""}`}
                            onClick={() => openEdit(a)}
                            style={{ cursor: "pointer" }}
                          >
                            {new Date(a.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {a.pet?.name}
                          </div>
                        ))}
                        {weekDayApts.length === 0 && (
                          <span className="week-empty">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {viewMode === "calendar" && calView === "day" && (
            <div className="calendar-container">
              <div className="calendar-month-header">
                <h3>
                  {calendarDate.toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <div className="month-nav">
                  <button
                    onClick={() =>
                      setCalendarDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() - 1);
                        return d;
                      })
                    }
                  >
                    &lt; Prev
                  </button>
                  <button onClick={() => setCalendarDate(new Date())}>
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() + 1);
                        return d;
                      })
                    }
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
              <div className="day-view">
                {dayApts.length === 0 ? (
                  <p className="list-feedback">No appointments on this day.</p>
                ) : (
                  dayApts.map((a) => (
                    <div
                      key={a.id}
                      className={`day-apt-block ${(a.status || "").toLowerCase()}`}
                      onClick={() => openEdit(a)}
                    >
                      <span className="day-apt-time">
                        {new Date(a.scheduledAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="day-apt-info">
                        <strong>{a.pet?.name || "—"}</strong>
                        <span>{a.reason || "—"}</span>
                        <span
                          className={`apt-status ${(a.status || "").toLowerCase()}`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {viewMode === "list" && (
            <div className="list-view-container">
              {sortedStatuses.length === 0 ? (
                <p className="list-feedback">No appointments found.</p>
              ) : (
                sortedStatuses.map((status) => {
                  const config = getStatusConfig(status);
                  const statusApts = groupedAppointments[status];
                  const isExpanded = expandedStatus[status];

                  return (
                    <div key={status} className="status-group">
                      <button
                        className="status-group-header"
                        onClick={() => toggleStatus(status)}
                        aria-expanded={isExpanded}
                      >
                        <span className="status-header-left">
                          <span className="status-icon">{config.icon}</span>
                          <span className="status-title">{status}</span>
                          <span className="status-count">
                            {statusApts.length}
                          </span>
                        </span>
                        <span className="status-toggle-icon">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </button>

                      {/* Desktop table */}
                      {isExpanded && (
                        <div className="table-desktop">
                          <table className="appointment-table">
                            <tbody>
                              {statusApts.map((apt) => (
                                <tr key={apt.id}>
                                  <td>{apt.pet?.name || "-"}</td>
                                  <td>
                                    {`${apt.owner?.firstName || ""} ${apt.owner?.lastName || ""}`.trim() ||
                                      apt.owner?.username ||
                                      "-"}
                                  </td>
                                  <td>
                                    {new Date(apt.scheduledAt).toLocaleString()}
                                  </td>
                                  <td>{apt.reason || "-"}</td>
                                  <td>
                                    <span
                                      className={`apt-status ${(apt.status || "").toLowerCase()}`}
                                    >
                                      {apt.status}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="action-btns">
                                      {apt.status === "Pending" && (
                                        <>
                                          <button
                                            className="btn-accept"
                                            onClick={() =>
                                              quickStatus(apt, "Confirmed")
                                            }
                                            title="Accept appointment"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            className="btn-reject"
                                            onClick={() =>
                                              quickStatus(apt, "Cancelled")
                                            }
                                            title="Reject appointment"
                                          >
                                            ✕
                                          </button>
                                        </>
                                      )}
                                      <button
                                        className="btn-edit icon-btn"
                                        onClick={() => openEdit(apt)}
                                        title="Edit appointment"
                                      >
                                        {editIcon}
                                      </button>
                                      <button
                                        className="btn-remove icon-btn"
                                        onClick={() => removeAppointment(apt)}
                                        title="Delete appointment"
                                      >
                                        {deleteIcon}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Mobile cards */}
                      {isExpanded && (
                        <div className="table-mobile table-cards-list">
                          {statusApts.map((apt) => (
                            <div className="record-card" key={apt.id}>
                              <div className="record-card-header">
                                <div className="record-card-title">
                                  <div className="record-card-id">
                                    {apt.pet?.name || "-"}
                                  </div>
                                  <div className="record-card-patient">
                                    {`${apt.owner?.firstName || ""} ${apt.owner?.lastName || ""}`.trim() ||
                                      apt.owner?.username ||
                                      "-"}
                                  </div>
                                </div>
                                <span
                                  className={`apt-status ${(apt.status || "").toLowerCase()}`}
                                >
                                  {apt.status}
                                </span>
                              </div>
                              <div className="record-card-body">
                                <div className="record-card-row">
                                  <span className="record-card-label">
                                    Date & Time
                                  </span>
                                  <span>
                                    {new Date(apt.scheduledAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="record-card-row">
                                  <span className="record-card-label">
                                    Reason
                                  </span>
                                  <span>{apt.reason || "-"}</span>
                                </div>
                                <div className="record-card-row">
                                  <span className="record-card-label">
                                    Actions
                                  </span>
                                  <div className="action-btns">
                                    {apt.status === "Pending" && (
                                      <>
                                        <button
                                          className="btn-accept"
                                          onClick={() =>
                                            quickStatus(apt, "Confirmed")
                                          }
                                          title="Accept"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          className="btn-reject"
                                          onClick={() =>
                                            quickStatus(apt, "Cancelled")
                                          }
                                          title="Reject"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="btn-edit icon-btn"
                                      onClick={() => openEdit(apt)}
                                      title="Edit appointment"
                                    >
                                      {editIcon}
                                    </button>
                                    <button
                                      className="btn-remove icon-btn"
                                      onClick={() => removeAppointment(apt)}
                                      title="Delete appointment"
                                    >
                                      {deleteIcon}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {loading && <p className="list-feedback">Loading appointments...</p>}
          {error && <p className="modal-error">{error}</p>}
        </section>
      </main>

      {/* Appointment modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={submitAppointment}>
              <h3>{editing ? "Edit Appointment" : "Add Appointment"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Pet</label>
                  <select
                    name="petId"
                    value={form.petId}
                    onChange={onChange}
                    required
                    disabled={Boolean(editing)}
                  >
                    <option value="">Select pet</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    disabled={!editing}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Scheduled At</label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={form.scheduledAt}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <select name="reason" value={form.reason} onChange={onChange}>
                  <option value="">Select a reason</option>
                  <option value="Checkup">Checkup</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Vaccination">Vaccination</option>
                  <option value="Dental cleaning">Dental cleaning</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Medication refill">Medication refill</option>
                  <option value="Others">
                    Others, please specify on Notes
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={form.notes} onChange={onChange} />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetCalendar;
