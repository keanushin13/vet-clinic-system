import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getAvailableVets,
  getVetSchedule,
  updateVetSchedule,
  createVetScheduleException,
  deleteVetScheduleException,
  getClinicSettings,
  updateClinicSettings,
} from "../../../api/api";
import "../../../css/AdminVetSchedules.css";
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EMPTY_SCHED = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: "08:00",
  endTime: "17:00",
  slotDurationMinutes: 30,
  isActive: i !== 0,
}));

export default function AdminVetSchedules() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [vets, setVets] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null);
  const [vetSchedule, setVetSchedule] = useState({
    weekly: [],
    exceptions: [],
  });
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHED);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedMsg, setSchedMsg] = useState("");

  const [excForm, setExcForm] = useState({
    startsAt: "",
    endsAt: "",
    reason: "",
  });
  const [excSaving, setExcSaving] = useState(false);
  const [excError, setExcError] = useState("");

  // Clinic hours
  const [clinicForm, setClinicForm] = useState([]);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicMsg, setClinicMsg] = useState("");

  const loadVets = useCallback(() => {
    getAvailableVets()
      .then((r) => setVets(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const loadClinic = useCallback(() => {
    getClinicSettings()
      .then((r) => {
        const s = Array.isArray(r.data) ? r.data : [];
        setClinicSettings(s);
        setClinicForm(s.map((d) => ({ ...d })));
      })
      .catch(() => {});
  }, []);

  const loadVetSchedule = useCallback(async (vetId) => {
    try {
      const r = await getVetSchedule(vetId);
      const data = r.data || {};
      const weekly = Array.isArray(data.weekly) ? data.weekly : [];
      const merged = EMPTY_SCHED.map((def) => {
        const found = weekly.find((w) => w.dayOfWeek === def.dayOfWeek);
        return found ? { ...def, ...found } : def;
      });
      setScheduleForm(merged);
      setVetSchedule({
        weekly: merged,
        exceptions: Array.isArray(data.exceptions) ? data.exceptions : [],
      });
    } catch {
      setScheduleForm(EMPTY_SCHED);
      setVetSchedule({ weekly: [], exceptions: [] });
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    loadVets();
    loadClinic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectVet = (vet) => {
    setSelectedVet(vet);
    setSchedMsg("");
    loadVetSchedule(vet.id);
  };

  const handleSchedChange = (dayOfWeek, field, value) => {
    setScheduleForm((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, [field]: field === "isActive" ? value : value }
          : d,
      ),
    );
  };

  const saveVetSchedule = async () => {
    if (!selectedVet) return;
    setSchedSaving(true);
    setSchedMsg("");
    try {
      await updateVetSchedule(
        selectedVet.id,
        scheduleForm.filter((d) => d.isActive),
      );
      setSchedMsg("Schedule saved.");
      loadVetSchedule(selectedVet.id);
    } catch (err) {
      setSchedMsg(err.response?.data?.message || "Save failed");
    } finally {
      setSchedSaving(false);
    }
  };

  const handleExcChange = (e) =>
    setExcForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const addException = async (e) => {
    e.preventDefault();
    setExcError("");
    setExcSaving(true);
    try {
      await createVetScheduleException(selectedVet.id, excForm);
      setExcForm({ startsAt: "", endsAt: "", reason: "" });
      loadVetSchedule(selectedVet.id);
    } catch (err) {
      setExcError(err.response?.data?.message || "Failed");
    } finally {
      setExcSaving(false);
    }
  };

  const removeException = async (id) => {
    if (!window.confirm("Delete this exception?")) return;
    try {
      await deleteVetScheduleException(id);
      loadVetSchedule(selectedVet.id);
    } catch {
      /* ignore */
    }
  };

  const handleClinicChange = (dayOfWeek, field, value) => {
    setClinicForm((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d,
      ),
    );
  };

  const saveClinic = async () => {
    setClinicSaving(true);
    setClinicMsg("");
    try {
      await updateClinicSettings(clinicForm);
      setClinicMsg("Clinic hours saved.");
      loadClinic();
    } catch (err) {
      setClinicMsg(err.response?.data?.message || "Save failed");
    } finally {
      setClinicSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />
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
          <h2>Vet Schedules & Clinic Hours</h2>
          <div className="top-bar-right">
            <button
              className="notif-btn"
              onClick={() => navigate("/admin-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body vs-body">
          {/* ── Clinic Operating Hours ── */}
          <div className="vs-section-card">
            <h3 className="vs-section-title">Clinic Operating Hours</h3>
            <div className="vs-clinic-grid">
              <div className="vs-clinic-header">
                <span>Day</span>
                <span>Open</span>
                <span>Open Time</span>
                <span>Close Time</span>
                <span>Break Start</span>
                <span>Break End</span>
              </div>
              {clinicForm.map((d) => (
                <div className="vs-clinic-row" key={d.dayOfWeek}>
                  <span className="vs-day-label">{DAY_NAMES[d.dayOfWeek]}</span>
                  <input
                    type="checkbox"
                    checked={d.isOpen}
                    onChange={(e) =>
                      handleClinicChange(
                        d.dayOfWeek,
                        "isOpen",
                        e.target.checked,
                      )
                    }
                  />
                  <input
                    type="time"
                    value={d.openTime || ""}
                    onChange={(e) =>
                      handleClinicChange(
                        d.dayOfWeek,
                        "openTime",
                        e.target.value,
                      )
                    }
                    disabled={!d.isOpen}
                  />
                  <input
                    type="time"
                    value={d.closeTime || ""}
                    onChange={(e) =>
                      handleClinicChange(
                        d.dayOfWeek,
                        "closeTime",
                        e.target.value,
                      )
                    }
                    disabled={!d.isOpen}
                  />
                  <input
                    type="time"
                    value={d.breakStart || ""}
                    onChange={(e) =>
                      handleClinicChange(
                        d.dayOfWeek,
                        "breakStart",
                        e.target.value,
                      )
                    }
                    disabled={!d.isOpen}
                  />
                  <input
                    type="time"
                    value={d.breakEnd || ""}
                    onChange={(e) =>
                      handleClinicChange(
                        d.dayOfWeek,
                        "breakEnd",
                        e.target.value,
                      )
                    }
                    disabled={!d.isOpen}
                  />
                </div>
              ))}
            </div>
            <div className="vs-save-row">
              <button
                className="save-btn"
                onClick={saveClinic}
                disabled={clinicSaving}
              >
                {clinicSaving ? "Saving…" : "Save Clinic Hours"}
              </button>
              {clinicMsg && <span className="vs-msg">{clinicMsg}</span>}
            </div>
          </div>

          {/* ── Vet Schedules ── */}
          <div className="vs-two-col">
            {/* Vet list */}
            <div className="vs-vet-list-card">
              <h3 className="vs-section-title">Veterinarians</h3>
              {vets.length === 0 ? (
                <p className="empty-row">No veterinarians found.</p>
              ) : (
                vets.map((v) => (
                  <div
                    key={v.id}
                    className={`vs-vet-item${selectedVet?.id === v.id ? " selected" : ""}`}
                    onClick={() => selectVet(v)}
                  >
                    <div className="vs-vet-avatar">
                      {(v.firstName || v.username || "?").charAt(0)}
                    </div>
                    <div>
                      <div className="vs-vet-name">
                        Dr.{" "}
                        {v.firstName
                          ? `${v.firstName} ${v.lastName || ""}`.trim()
                          : v.username}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Schedule editor */}
            <div className="vs-schedule-card">
              {!selectedVet ? (
                <p className="vs-select-hint">
                  Select a veterinarian to manage their schedule.
                </p>
              ) : (
                <>
                  <h3 className="vs-section-title">
                    Dr.{" "}
                    {selectedVet.firstName
                      ? `${selectedVet.firstName} ${selectedVet.lastName || ""}`.trim()
                      : selectedVet.username}{" "}
                    — Weekly Schedule
                  </h3>
                  <div className="vs-weekly-grid">
                    <div className="vs-weekly-header">
                      <span>Day</span>
                      <span>Active</span>
                      <span>Start</span>
                      <span>End</span>
                      <span>Slot (min)</span>
                    </div>
                    {scheduleForm.map((d) => (
                      <div className="vs-weekly-row" key={d.dayOfWeek}>
                        <span className="vs-day-label">
                          {DAY_NAMES[d.dayOfWeek]}
                        </span>
                        <input
                          type="checkbox"
                          checked={!!d.isActive}
                          onChange={(e) =>
                            handleSchedChange(
                              d.dayOfWeek,
                              "isActive",
                              e.target.checked,
                            )
                          }
                        />
                        <input
                          type="time"
                          value={d.startTime || ""}
                          onChange={(e) =>
                            handleSchedChange(
                              d.dayOfWeek,
                              "startTime",
                              e.target.value,
                            )
                          }
                          disabled={!d.isActive}
                        />
                        <input
                          type="time"
                          value={d.endTime || ""}
                          onChange={(e) =>
                            handleSchedChange(
                              d.dayOfWeek,
                              "endTime",
                              e.target.value,
                            )
                          }
                          disabled={!d.isActive}
                        />
                        <input
                          type="number"
                          min="15"
                          max="120"
                          step="15"
                          value={d.slotDurationMinutes || 30}
                          onChange={(e) =>
                            handleSchedChange(
                              d.dayOfWeek,
                              "slotDurationMinutes",
                              Number(e.target.value),
                            )
                          }
                          disabled={!d.isActive}
                          style={{ width: 70 }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="vs-save-row">
                    <button
                      className="save-btn"
                      onClick={saveVetSchedule}
                      disabled={schedSaving}
                    >
                      {schedSaving ? "Saving…" : "Save Schedule"}
                    </button>
                    {schedMsg && <span className="vs-msg">{schedMsg}</span>}
                  </div>

                  {/* Exceptions */}
                  <h4 className="vs-sub-title">Schedule Exceptions</h4>
                  <form className="vs-exc-form" onSubmit={addException}>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      value={excForm.startsAt}
                      onChange={handleExcChange}
                      required
                    />
                    <input
                      type="datetime-local"
                      name="endsAt"
                      value={excForm.endsAt}
                      onChange={handleExcChange}
                      required
                    />
                    <input
                      name="reason"
                      placeholder="Reason (optional)"
                      value={excForm.reason}
                      onChange={handleExcChange}
                    />
                    <button
                      type="submit"
                      className="save-btn"
                      disabled={excSaving}
                    >
                      {excSaving ? "Adding…" : "Add"}
                    </button>
                    {excError && <span className="form-error">{excError}</span>}
                  </form>
                  {vetSchedule.exceptions.length === 0 ? (
                    <p className="empty-row">No exceptions.</p>
                  ) : (
                    <table className="vs-exc-table">
                      <thead>
                        <tr>
                          <th>From</th>
                          <th>To</th>
                          <th>Reason</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vetSchedule.exceptions.map((ex) => (
                          <tr key={ex.id}>
                            <td>{new Date(ex.startsAt).toLocaleString()}</td>
                            <td>{new Date(ex.endsAt).toLocaleString()}</td>
                            <td>{ex.reason || "—"}</td>
                            <td>
                              <button
                                className="delete-btn icon-btn"
                                onClick={() => removeException(ex.id)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
