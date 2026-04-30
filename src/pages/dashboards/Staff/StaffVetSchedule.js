import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createVetScheduleException,
  deleteVetScheduleException,
  getAvailableVets,
  getVetSchedule,
  updateVetSchedule,
} from "../../../api/api";
import "../../../css/VetSchedule.css";
import "../../../css/responsive-tables.css";

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultWeek = dayLabels.map((_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
  slotDurationMinutes: 30,
  isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
}));

export default function StaffVetSchedule() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [vets, setVets] = useState([]);
  const [selectedVetId, setSelectedVetId] = useState("");
  const [selectedVetName, setSelectedVetName] = useState("");
  const [weekly, setWeekly] = useState(defaultWeek);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [exceptionForm, setExceptionForm] = useState({
    startsAt: "",
    endsAt: "",
    reason: "",
  });

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadVets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAvailableVets();
      setVets(res.data || []);
      if (res.data?.length) {
        const first = res.data[0];
        setSelectedVetId(first.id);
        await loadVetSchedule(first.id, first);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load veterinarians");
    } finally {
      setLoading(false);
    }
  };

  const loadVetSchedule = async (vetId, fallbackVet) => {
    setError("");
    setSuccess("");
    try {
      const res = await getVetSchedule(vetId);
      const incoming = res.data.weekly || [];
      const merged = defaultWeek.map((d) => {
        const existing = incoming.find((w) => w.dayOfWeek === d.dayOfWeek);
        return existing
          ? {
              dayOfWeek: existing.dayOfWeek,
              startTime: existing.startTime,
              endTime: existing.endTime,
              slotDurationMinutes: existing.slotDurationMinutes,
              isActive: existing.isActive,
            }
          : d;
      });
      setWeekly(merged);
      setExceptions(res.data.exceptions || []);
      const vet = res.data.vet || fallbackVet;
      setSelectedVetName(
        `${vet?.firstName || ""} ${vet?.lastName || ""}`.trim() ||
          vet?.username ||
          "Veterinarian",
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load selected vet schedule",
      );
    }
  };

  const updateDay = (dayOfWeek, field, value) => {
    setWeekly((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              [field]: field === "slotDurationMinutes" ? Number(value) : value,
            }
          : d,
      ),
    );
  };

  const saveWeekly = async () => {
    if (!selectedVetId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateVetSchedule(selectedVetId, weekly);
      await loadVetSchedule(selectedVetId);
      setSuccess("Weekly schedule saved");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const addException = async (e) => {
    e.preventDefault();
    if (!selectedVetId) return;
    setError("");
    setSuccess("");
    try {
      await createVetScheduleException(selectedVetId, {
        startsAt: exceptionForm.startsAt,
        endsAt: exceptionForm.endsAt,
        reason: exceptionForm.reason,
      });
      setExceptionForm({ startsAt: "", endsAt: "", reason: "" });
      await loadVetSchedule(selectedVetId);
      setSuccess("Exception added");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add exception");
    }
  };

  const removeException = async (id) => {
    if (!window.confirm("Delete this exception?")) return;
    setError("");
    try {
      await deleteVetScheduleException(id);
      await loadVetSchedule(selectedVetId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete exception");
    }
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
          <h2>Vet Schedules</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/staff-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/staff-profile"
            />
          </div>
        </header>

        <section className="content-body schedule-page">
          <div className="schedule-card">
            <div className="schedule-card-header">
              <h3>Manage Weekly Availability</h3>
              <button
                onClick={saveWeekly}
                disabled={saving || loading || !selectedVetId}
                className="schedule-save-btn"
              >
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>

            <label className="schedule-vet-select">
              Veterinarian
              <select
                value={selectedVetId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedVetId(nextId);
                  const nextVet = vets.find((v) => v.id === nextId);
                  if (nextId) loadVetSchedule(nextId, nextVet);
                }}
              >
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`${v.firstName || ""} ${v.lastName || ""}`.trim() ||
                      v.username}
                  </option>
                ))}
              </select>
            </label>

            {selectedVetName ? (
              <p className="schedule-note">Editing: {selectedVetName}</p>
            ) : null}
            {loading ? <p>Loading data...</p> : null}
            {error ? <p className="schedule-error">{error}</p> : null}
            {success ? <p className="schedule-success">{success}</p> : null}

            <>
              <div className="schedule-table-wrap table-desktop">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Active</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Slot (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.map((d) => (
                      <tr key={d.dayOfWeek}>
                        <td>{dayLabels[d.dayOfWeek]}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={Boolean(d.isActive)}
                            onChange={(e) =>
                              updateDay(
                                d.dayOfWeek,
                                "isActive",
                                e.target.checked,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={d.startTime}
                            disabled={!d.isActive}
                            onChange={(e) =>
                              updateDay(
                                d.dayOfWeek,
                                "startTime",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={d.endTime}
                            disabled={!d.isActive}
                            onChange={(e) =>
                              updateDay(d.dayOfWeek, "endTime", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={d.slotDurationMinutes}
                            disabled={!d.isActive}
                            onChange={(e) =>
                              updateDay(
                                d.dayOfWeek,
                                "slotDurationMinutes",
                                e.target.value,
                              )
                            }
                          >
                            {[15, 20, 30, 45, 60].map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-mobile table-cards-list">
                {weekly.map((d) => (
                  <div className="schedule-day-card" key={d.dayOfWeek}>
                    <div className="schedule-day-card-header">
                      <h4>{dayLabels[d.dayOfWeek]}</h4>
                      <label className="schedule-day-active">
                        <input
                          type="checkbox"
                          checked={Boolean(d.isActive)}
                          onChange={(e) =>
                            updateDay(d.dayOfWeek, "isActive", e.target.checked)
                          }
                        />
                        <span>{d.isActive ? "Active" : "Inactive"}</span>
                      </label>
                    </div>
                    <div className="schedule-day-card-body">
                      <label>
                        Start
                        <input
                          type="time"
                          value={d.startTime}
                          disabled={!d.isActive}
                          onChange={(e) =>
                            updateDay(d.dayOfWeek, "startTime", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        End
                        <input
                          type="time"
                          value={d.endTime}
                          disabled={!d.isActive}
                          onChange={(e) =>
                            updateDay(d.dayOfWeek, "endTime", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Slot (min)
                        <select
                          value={d.slotDurationMinutes}
                          disabled={!d.isActive}
                          onChange={(e) =>
                            updateDay(
                              d.dayOfWeek,
                              "slotDurationMinutes",
                              e.target.value,
                            )
                          }
                        >
                          {[15, 20, 30, 45, 60].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </>
          </div>

          <div className="schedule-card">
            <h3>Add Time-off / Exception</h3>
            <form className="schedule-form-grid" onSubmit={addException}>
              <label>
                Start
                <input
                  type="datetime-local"
                  required
                  value={exceptionForm.startsAt}
                  onChange={(e) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      startsAt: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End
                <input
                  type="datetime-local"
                  required
                  value={exceptionForm.endsAt}
                  onChange={(e) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      endsAt: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="schedule-form-span-2">
                Reason
                <select
                  value={exceptionForm.reason}
                  onChange={(e) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                >
                  <option value="">Select a reason</option>
                  <option value="Vacation">Vacation</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Event">Event</option>
                  <option value="Conference">Conference</option>
                  <option value="Personal">Personal</option>
                  <option value="Others">
                    Others, please specify on Notes
                  </option>
                </select>
              </label>
              <button
                type="submit"
                className="schedule-add-btn"
                disabled={!selectedVetId}
              >
                Add Exception
              </button>
            </form>

            <div className="schedule-exceptions">
              <h4>Upcoming Exceptions</h4>
              {!exceptions.length ? <p>No exceptions yet.</p> : null}
              {exceptions.map((ex) => (
                <div className="schedule-ex-row" key={ex.id}>
                  <div>
                    <strong>{new Date(ex.startsAt).toLocaleString()}</strong>
                    <span> to {new Date(ex.endsAt).toLocaleString()}</span>
                    <p>{ex.reason || "No reason"}</p>
                  </div>
                  <button
                    onClick={() => removeException(ex.id)}
                    className="schedule-delete-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
