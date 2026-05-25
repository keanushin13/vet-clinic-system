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
  getHolidays,
  createHoliday,
  deleteHoliday,
} from "../../../api/api";
import "../../../css/AdminVetSchedules.css";
import userIcon from "../../../assets/Profile.png";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const HOLIDAY_REASONS = [
  "Regular Holiday",
  "Special Non-working Holiday",
  "Emergency Closure",
  "Special Clinic Event",
  "Maintenance Closure",
];

const EXCEPTION_TYPES = [
  "Vacation",
  "Day-off",
  "Sick leave",
  "Emergency leave",
  "Event",
  "Conference",
  "Personal",
  "Others",
];

const EMPTY_SCHED = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: "08:00",
  endTime: "17:00",
  isActive: i !== 0,
}));

const EMPTY_HOLIDAY = { date: "", name: "", reason: "" };
const EMPTY_EXC = { name: "", exceptionType: "", startsAt: "", endsAt: "" };

export default function AdminVetSchedules() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  // ── Vets ──
  const [vets, setVets] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null);
  const [vetSchedule, setVetSchedule] = useState({ weekly: [], exceptions: [] });
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHED);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedMsg, setSchedMsg] = useState("");

  // ── Exceptions ──
  const [excForm, setExcForm] = useState(EMPTY_EXC);
  const [excSaving, setExcSaving] = useState(false);
  const [excError, setExcError] = useState("");

  // ── Clinic hours ──
  const [clinicForm, setClinicForm] = useState([]);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicMsg, setClinicMsg] = useState("");

  // ── Holidays ──
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState(EMPTY_HOLIDAY);
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayError, setHolidayError] = useState("");

  const loadVets = useCallback(() => {
    getAvailableVets()
      .then((r) => setVets(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const loadClinic = useCallback(() => {
    getClinicSettings()
      .then((r) => {
        const s = Array.isArray(r.data) ? r.data : [];
        setClinicForm(s.map((d) => ({ ...d })));
      })
      .catch(() => {});
  }, []);

  const loadHolidays = useCallback(() => {
    getHolidays({ year: new Date().getFullYear() })
      .then((r) => setHolidays(Array.isArray(r.data) ? r.data : []))
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
    if (!user || user.role !== "admin") { navigate("/login"); return; }
    loadVets();
    loadClinic();
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectVet = (vet) => {
    setSelectedVet(vet);
    setSchedMsg("");
    setExcForm(EMPTY_EXC);
    setExcError("");
    loadVetSchedule(vet.id);
  };

  const handleSchedChange = (dayOfWeek, field, value) => {
    setScheduleForm((prev) =>
      prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)
    );
  };

  const saveVetSchedule = async () => {
    if (!selectedVet) return;
    setSchedSaving(true);
    setSchedMsg("");
    try {
      await updateVetSchedule(selectedVet.id, scheduleForm.filter((d) => d.isActive));
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
      setExcForm(EMPTY_EXC);
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
    } catch { /* ignore */ }
  };

  const handleClinicChange = (dayOfWeek, field, value) => {
    setClinicForm((prev) =>
      prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)
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

  const handleHolidayChange = (e) =>
    setHolidayForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const addHoliday = async (e) => {
    e.preventDefault();
    setHolidayError("");
    setHolidaySaving(true);
    try {
      await createHoliday(holidayForm);
      setHolidayForm(EMPTY_HOLIDAY);
      loadHolidays();
    } catch (err) {
      setHolidayError(err.response?.data?.message || "Failed to add holiday");
    } finally {
      setHolidaySaving(false);
    }
  };

  const removeHoliday = async (id) => {
    if (!window.confirm("Remove this holiday/closure?")) return;
    try {
      await deleteHoliday(id);
      loadHolidays();
    } catch { /* ignore */ }
  };

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />
      <main className="main-area">
        <header className="top-bar">
          <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <h2>Clinic Schedule</h2>
          <div className="top-bar-right">
            <TopbarUserMenu avatarSrc={userIcon} avatarAlt="Admin" profilePath="/admin-profile" />
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
                    onChange={(e) => handleClinicChange(d.dayOfWeek, "isOpen", e.target.checked)}
                  />
                  <input type="time" value={d.openTime || ""} disabled={!d.isOpen}
                    onChange={(e) => handleClinicChange(d.dayOfWeek, "openTime", e.target.value)} />
                  <input type="time" value={d.closeTime || ""} disabled={!d.isOpen}
                    onChange={(e) => handleClinicChange(d.dayOfWeek, "closeTime", e.target.value)} />
                  <input type="time" value={d.breakStart || ""} disabled={!d.isOpen}
                    onChange={(e) => handleClinicChange(d.dayOfWeek, "breakStart", e.target.value)} />
                  <input type="time" value={d.breakEnd || ""} disabled={!d.isOpen}
                    onChange={(e) => handleClinicChange(d.dayOfWeek, "breakEnd", e.target.value)} />
                </div>
              ))}
            </div>
            <div className="vs-save-row">
              <button className="save-btn" onClick={saveClinic} disabled={clinicSaving}>
                {clinicSaving ? "Saving…" : "Save Clinic Hours"}
              </button>
              {clinicMsg && <span className="vs-msg">{clinicMsg}</span>}
            </div>
          </div>

          {/* ── Holiday & Clinic Closure Management ── */}
          <div className="vs-section-card">
            <h3 className="vs-section-title">Holiday & Clinic Closure Management</h3>
            <p className="vs-hint-text">
              Marking a date as a holiday disables appointment booking for that day. Existing appointments will be flagged for rescheduling.
            </p>

            <form className="vs-holiday-form" onSubmit={addHoliday}>
              <div className="vs-holiday-fields">
                <div className="vs-field-group">
                  <label className="vs-field-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={holidayForm.date}
                    onChange={handleHolidayChange}
                    required
                    className="vs-input"
                  />
                </div>
                <div className="vs-field-group">
                  <label className="vs-field-label">Holiday / Event Name</label>
                  <input
                    name="name"
                    placeholder="e.g. Christmas Day"
                    value={holidayForm.name}
                    onChange={handleHolidayChange}
                    required
                    className="vs-input"
                  />
                </div>
                <div className="vs-field-group">
                  <label className="vs-field-label">Reason</label>
                  <select
                    name="reason"
                    value={holidayForm.reason}
                    onChange={handleHolidayChange}
                    required
                    className="vs-input"
                  >
                    <option value="">Select Reason</option>
                    {HOLIDAY_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="save-btn vs-holiday-add-btn" disabled={holidaySaving}>
                  {holidaySaving ? "Adding…" : "+ Add"}
                </button>
              </div>
              {holidayError && <p className="form-error">{holidayError}</p>}
            </form>

            {holidays.length === 0 ? (
              <p className="empty-row">No holidays or closures set for this year.</p>
            ) : (
              <table className="vs-exc-table vs-holiday-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Reason</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.date).toLocaleDateString()}</td>
                      <td>{h.name}</td>
                      <td><span className="vs-holiday-badge">{h.reason}</span></td>
                      <td>
                        <button className="delete-btn icon-btn" onClick={() => removeHoliday(h.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                        Dr. {v.firstName ? `${v.firstName} ${v.lastName || ""}`.trim() : v.username}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Schedule editor */}
            <div className="vs-schedule-card">
              {!selectedVet ? (
                <p className="vs-select-hint">Select a veterinarian to manage their schedule.</p>
              ) : (
                <>
                  <h3 className="vs-section-title">
                    Dr. {selectedVet.firstName
                      ? `${selectedVet.firstName} ${selectedVet.lastName || ""}`.trim()
                      : selectedVet.username} — Weekly Schedule
                  </h3>

                  <div className="vs-weekly-grid">
                    <div className="vs-weekly-header">
                      <span>Day</span>
                      <span>Active</span>
                      <span>Start</span>
                      <span>End</span>
                    </div>
                    {scheduleForm.map((d) => (
                      <div className="vs-weekly-row" key={d.dayOfWeek}>
                        <span className="vs-day-label">{DAY_NAMES[d.dayOfWeek]}</span>
                        <input
                          type="checkbox"
                          checked={!!d.isActive}
                          onChange={(e) => handleSchedChange(d.dayOfWeek, "isActive", e.target.checked)}
                        />
                        <input
                          type="time"
                          value={d.startTime || ""}
                          disabled={!d.isActive}
                          onChange={(e) => handleSchedChange(d.dayOfWeek, "startTime", e.target.value)}
                        />
                        <input
                          type="time"
                          value={d.endTime || ""}
                          disabled={!d.isActive}
                          onChange={(e) => handleSchedChange(d.dayOfWeek, "endTime", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="vs-save-row">
                    <button className="save-btn" onClick={saveVetSchedule} disabled={schedSaving}>
                      {schedSaving ? "Saving…" : "Save Schedule"}
                    </button>
                    {schedMsg && <span className="vs-msg">{schedMsg}</span>}
                  </div>

                  {/* ── Schedule Exceptions ── */}
                  <h4 className="vs-sub-title">Schedule Exceptions</h4>
                  <form className="vs-exc-form-new" onSubmit={addException}>
                    <div className="vs-exc-row">
                      <div className="vs-field-group">
                        <label className="vs-field-label">Exception Name</label>
                        <input
                          name="name"
                          placeholder="e.g. Annual Leave"
                          value={excForm.name}
                          onChange={handleExcChange}
                          className="vs-input"
                        />
                      </div>
                      <div className="vs-field-group">
                        <label className="vs-field-label">Exception Type</label>
                        <select
                          name="exceptionType"
                          value={excForm.exceptionType}
                          onChange={handleExcChange}
                          className="vs-input"
                        >
                          <option value="">Select Type</option>
                          {EXCEPTION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="vs-exc-row">
                      <div className="vs-field-group">
                        <label className="vs-field-label">Starts At</label>
                        <input
                          type="datetime-local"
                          name="startsAt"
                          value={excForm.startsAt}
                          onChange={handleExcChange}
                          required
                          className="vs-input"
                        />
                      </div>
                      <div className="vs-field-group">
                        <label className="vs-field-label">Ends At</label>
                        <input
                          type="datetime-local"
                          name="endsAt"
                          value={excForm.endsAt}
                          onChange={handleExcChange}
                          required
                          className="vs-input"
                        />
                      </div>
                    </div>
                    {excError && <p className="form-error">{excError}</p>}
                    <button type="submit" className="save-btn" disabled={excSaving}>
                      {excSaving ? "Adding…" : "Add Exception"}
                    </button>
                  </form>

                  {vetSchedule.exceptions.length === 0 ? (
                    <p className="empty-row">No exceptions.</p>
                  ) : (
                    <table className="vs-exc-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>From</th>
                          <th>To</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vetSchedule.exceptions.map((ex) => (
                          <tr key={ex.id}>
                            <td>{ex.name || "—"}</td>
                            <td>{ex.exceptionType || "—"}</td>
                            <td>{new Date(ex.startsAt).toLocaleString()}</td>
                            <td>{new Date(ex.endsAt).toLocaleString()}</td>
                            <td>
                              <button className="delete-btn icon-btn" onClick={() => removeException(ex.id)}>✕</button>
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
