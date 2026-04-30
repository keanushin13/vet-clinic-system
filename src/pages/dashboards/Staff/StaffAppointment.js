import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffAppointment.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getAvailableVets,
  getPets,
  getVetAvailableSlots,
  updateAppointment,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffAppointment = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [vets, setVets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    petId: "",
    vetId: "",
    date: "",
    slot: "",
    reason: "",
    notes: "",
    status: "Pending",
  });
  const [expandedStatus, setExpandedStatus] = useState({
    Pending: true,
    Confirmed: true,
    Completed: false,
    Cancelled: false,
  });

  const handleApiError = (err, fallbackMessage) => {
    const statusCode = err?.response?.status;
    if (statusCode === 401) {
      setError("Session expired. Please log in again.");
      navigate("/login");
      return;
    }
    setError(err?.response?.data?.message || fallbackMessage);
  };

  const ensureCurrentSlotOption = (slotList, currentSlotIso) => {
    if (!currentSlotIso) return slotList;
    const exists = slotList.some((slot) => slot.startsAt === currentSlotIso);
    if (exists) return slotList;

    const merged = [
      {
        startsAt: currentSlotIso,
        endsAt: currentSlotIso,
        isCurrent: true,
      },
      ...slotList,
    ];

    return merged.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  };

  useEffect(() => {
    if (!user || user.role !== "staff") {
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
      const [appointmentRes, petRes, vetRes] = await Promise.all([
        getAppointments(),
        getPets(),
        getAvailableVets(),
      ]);
      setAppointments(appointmentRes.data || []);
      setPets(petRes.data || []);
      setVets(vetRes.data || []);
    } catch (err) {
      handleApiError(err, "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (vetId, date, currentSlotIso = "") => {
    if (!vetId || !date) {
      setSlots([]);
      return;
    }
    setSlots([]);
    setError("");
    try {
      const res = await getVetAvailableSlots(vetId, date);
      setSlots(ensureCurrentSlotOption(res.data.slots || [], currentSlotIso));
    } catch (err) {
      setSlots([]);
      handleApiError(err, "Failed to fetch available slots");
    }
  };

  useEffect(() => {
    if (!showModal) return;
    let currentSlotIso = "";
    if (editing && form.vetId === editing.vetId) {
      const editingSlotIso = new Date(editing.scheduledAt).toISOString();
      if (form.date === editingSlotIso.slice(0, 10)) {
        currentSlotIso = editingSlotIso;
      }
    }
    fetchSlots(form.vetId, form.date, currentSlotIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vetId, form.date, showModal]);

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSaving(false);
    setSlots([]);
    setError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      petId: pets[0]?.id || "",
      vetId: vets[0]?.id || "",
      date: "",
      slot: "",
      reason: "",
      notes: "",
      status: "Pending",
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (appointment) => {
    const currentSlotIso = new Date(appointment.scheduledAt).toISOString();
    const currentDate = currentSlotIso.slice(0, 10);

    setEditing(appointment);
    setForm({
      petId: appointment.petId || appointment.pet?.id || "",
      vetId: appointment.vetId || "",
      date: currentDate,
      slot: currentSlotIso,
      reason: appointment.reason || "",
      notes: appointment.notes || "",
      status: appointment.status || "Pending",
    });
    setError("");
    setShowModal(true);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    const reset = name === "vetId" || name === "date" ? { slot: "" } : {};
    setForm((prev) => ({ ...prev, [name]: value, ...reset }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.petId || !form.vetId || !form.slot) {
      setError("Pet, veterinarian, date, and available slot are required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateAppointment(editing.id, {
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: form.reason,
          notes: form.notes,
          status: form.status,
        });
      } else {
        await createAppointment({
          petId: form.petId,
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: form.reason,
          notes: form.notes,
        });
      }
      closeModal();
      await loadData();
    } catch (err) {
      handleApiError(err, "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (appointment) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await deleteAppointment(appointment.id);
      await loadData();
    } catch (err) {
      handleApiError(err, "Failed to cancel appointment");
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const ownerName =
      `${a.owner?.firstName || ""} ${a.owner?.lastName || ""}`.trim() ||
      a.owner?.username ||
      "";
    const query = search.toLowerCase();
    return (
      a.pet?.name?.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      (a.status || "").toLowerCase().includes(query)
    );
  });

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

  const shiftMonth = (delta) => {
    setCalendarDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const onCalendarEventKeyDown = (e, appointment) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEdit(appointment);
    }
  };

  const monthLabel = calendarDate.toLocaleString([], {
    month: "long",
    year: "numeric",
  });

  const currentPetOption =
    editing && form.petId && !pets.some((pet) => pet.id === form.petId)
      ? {
          id: form.petId,
          name: editing.pet?.name || "Current pet",
          species: editing.pet?.species || "Unknown",
          isCurrent: true,
        }
      : null;

  const petOptions = currentPetOption ? [currentPetOption, ...pets] : pets;

  // Group appointments by status
  const groupedAppointments = filteredAppointments.reduce((acc, apt) => {
    const status = apt.status || "Pending";
    if (!acc[status]) acc[status] = [];
    acc[status].push(apt);
    return acc;
  }, {});

  // Define status order for consistent display
  const statusOrder = ["Pending", "Confirmed", "Completed", "Cancelled"];
  const sortedStatuses = statusOrder.filter(
    (s) => groupedAppointments[s]?.length > 0,
  );

  // Toggle status section collapse
  const toggleStatus = (status) => {
    setExpandedStatus((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  // Get status styling
  const getStatusConfig = (status) => {
    const configs = {
      Pending: { icon: "🟡", color: "#ff9800" },
      Confirmed: { icon: "🟢", color: "#4caf50" },
      Completed: { icon: "✓", color: "#2196f3" },
      Cancelled: { icon: "✕", color: "#f44336" },
    };
    return configs[status] || configs.Pending;
  };

  return (
    <div className="dashboard-container">
      <StaffSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Appointments</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notif" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Profile"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="calendar-controls">
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
            <div className="appointment-actions">
              <input
                type="text"
                className="apt-search"
                placeholder="Search pet, owner, or status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="add-apt-btn" onClick={openCreate}>
                + Book Appointment
              </button>
            </div>
          </div>

          {loading && (
            <p className="list-placeholder">Loading appointments...</p>
          )}
          {!loading && error && <p className="modal-error">{error}</p>}

          {!loading && viewMode === "calendar" ? (
            <div className="calendar-container">
              <div className="calendar-month-header">
                <h3>{monthLabel}</h3>
                <div className="month-nav">
                  <button onClick={() => shiftMonth(-1)}>&lt; Prev</button>
                  <button onClick={() => shiftMonth(1)}>Next &gt;</button>
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
                {days.map((d) => (
                  <div key={d} className="calendar-day">
                    <span className="day-num">{d}</span>
                    <div className="day-events">
                      {filteredAppointments
                        .filter((a) => {
                          const scheduled = new Date(a.scheduledAt);
                          return (
                            scheduled.getFullYear() ===
                              calendarDate.getFullYear() &&
                            scheduled.getMonth() === calendarDate.getMonth() &&
                            scheduled.getDate() === d
                          );
                        })
                        .map((apt) => (
                          <div
                            key={apt.id}
                            className={`event-item ${(apt.status || "").toLowerCase()}`}
                            title={`${apt.pet?.name || "Pet"} - ${apt.status}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => openEdit(apt)}
                            onKeyDown={(e) => onCalendarEventKeyDown(e, apt)}
                            aria-label={`Edit appointment for ${apt.pet?.name || "pet"} on ${new Date(apt.scheduledAt).toLocaleString()}`}
                          >
                            {new Date(apt.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {apt.pet?.name}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="list-view-container">
              {sortedStatuses.length === 0 ? (
                <p className="list-placeholder">No appointments found.</p>
              ) : (
                sortedStatuses.map((status) => {
                  const config = getStatusConfig(status);
                  const statusApts = groupedAppointments[status];
                  const isExpanded = expandedStatus[status];

                  return (
                    <div key={status} className="status-group">
                      {/* Status Group Header */}
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

                      {/* Desktop Table View */}
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
                                      <button
                                        className="btn-edit"
                                        onClick={() => openEdit(apt)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn-remove"
                                        onClick={() => handleDelete(apt)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Mobile Card View */}
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
                                    <button
                                      className="btn-edit"
                                      onClick={() => openEdit(apt)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-remove"
                                      onClick={() => handleDelete(apt)}
                                    >
                                      Cancel
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
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={onSubmit}>
              <h3>{editing ? "Edit Appointment" : "Book Appointment"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Pet</label>
                  <select
                    name="petId"
                    value={form.petId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select pet</option>
                    {petOptions.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species})
                        {pet.isCurrent ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Veterinarian</label>
                  <select
                    name="vetId"
                    value={form.vetId}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select veterinarian</option>
                    {vets.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        {`${vet.firstName || ""} ${vet.lastName || ""}`.trim() ||
                          vet.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
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
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Available Slot</label>
                  <select
                    name="slot"
                    value={form.slot}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select time slot</option>
                    {slots.map((slot) => (
                      <option key={slot.startsAt} value={slot.startsAt}>
                        {new Date(slot.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {slot.isCurrent ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
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
              {error && <p className="modal-error">{error}</p>}
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

export default StaffAppointment;
