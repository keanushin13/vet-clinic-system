import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/PetOwnerAppointment.css";
import "../../../css/responsive-tables.css";
import PetOwnerSidebar from "../../../components/PetOwnerSidebar";
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

import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, value) => ({
  value,
  label: new Date(2000, value, 1).toLocaleString([], { month: "long" }),
}));
const CALENDAR_PAST_YEARS = 100;
const CALENDAR_FUTURE_YEARS = 25;
const APPT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_APPT_PAGE_SIZE = 25;
const AVAILABLE_DATES_STORAGE_KEY = "staffAppointmentAvailableDates";
const NO_COMPLIANCE_CANCEL_LABEL = "Cancelled Due to No Compliance";
const NO_COMPLIANCE_CANCEL_NOTE = "Cancelled due to no compliance.";

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isPastDateValue = (value) =>
  Boolean(value && value < getLocalDateKey(new Date()));

const getAppointmentLocalDateKey = (appointment) => {
  const scheduledDate = new Date(appointment?.scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) return "";
  return getLocalDateKey(scheduledDate);
};

const getLocalTimeKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
};

const normalizeDateKeyList = (dateKeys) =>
  Array.from(
    new Set(
      (Array.isArray(dateKeys) ? dateKeys : []).filter(
        (dateKey) =>
          /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && !isPastDateValue(dateKey),
      ),
    ),
  ).sort();

const loadStoredAvailableDates = () => {
  if (typeof window === "undefined") return [];

  try {
    return normalizeDateKeyList(
      JSON.parse(
        window.localStorage.getItem(AVAILABLE_DATES_STORAGE_KEY) || "[]",
      ),
    );
  } catch {
    return [];
  }
};

const toSlotDateTime = (value, date) => {
  if (!value) return "";
  const rawValue = String(value);

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    const normalizedTime = rawValue.length === 5 ? `${rawValue}:00` : rawValue;
    return new Date(`${date}T${normalizedTime}`).toISOString();
  }

  return rawValue;
};

const normalizeSlotList = (payload, date) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.slots)
      ? payload.slots
      : Array.isArray(payload?.availableSlots)
        ? payload.availableSlots
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  return source
    .map((slot) => {
      if (typeof slot === "string") {
        const startsAt = toSlotDateTime(slot, date);
        return startsAt ? { startsAt, endsAt: startsAt } : null;
      }

      const startsAt = toSlotDateTime(
        slot?.startsAt ||
          slot?.startAt ||
          slot?.start ||
          slot?.startTime ||
          slot?.time ||
          slot?.value ||
          slot?.scheduledAt,
        date,
      );
      if (!startsAt) return null;

      return {
        ...slot,
        startsAt,
        endsAt:
          toSlotDateTime(
            slot?.endsAt || slot?.endAt || slot?.end || slot?.endTime,
            date,
          ) || startsAt,
      };
    })
    .filter(Boolean);
};

const VISIT_REASONS = {
  Consultation: [
    "General Consultation",
    "Follow-up Check-up",
    "Others",
  ],
  Vaccination: [
    "Vanguard 5 in 1",
    "Vanguard 6 in 1",
    "Vanguard L4",
    "Purevac",
    "Anti Rabies 10DS",
    "Single Rabies for Cat",
    "Kennel Kupp KC (Bronchicne)",
    "Hipra DP",
    "Hipra DHLP",
    "Proheart Inj.",
    "Felocill 4 in 1",
    "Bondetella",
  ],
  Deworming: [
    "Dog Deworming",
    "Cat Deworming",
  ],
  "Minor Surgery": [
    "Basic Wound Repair",
  ],
  "Medical Consult and Testing": [
    "CBC",
    "Blood Chemistry",
    "Dog Parvo / Distemper Test",
    "Canine Coronavirus Test",
    "Blood Parasite Test",
    "Feline Leukemia Test",
    "Feline Rhinotracheitis Test",
    "Giardia Test",
  ],
};
const BOOKING_STEPS = ["Pet", "Visit Reason", "Date & Time", "Notes"];
const FINAL_BOOKING_STEP_INDEX = BOOKING_STEPS.length - 1;

const getPetOptionLabel = (pet) =>
  pet ? `${pet.name || "Unnamed Pet"} (${pet.species || "Unknown species"})` : "";

const getVetOptionLabel = (vet) =>
  vet
    ? `${`${vet.firstName || ""} ${vet.lastName || ""}`.trim() || vet.username || "Veterinarian"}`
    : "";

function parseReason(reasonStr) {
  if (!reasonStr) return { visitReason: "", serviceType: "" };
  const sep = " — ";
  const idx = reasonStr.indexOf(sep);
  if (idx === -1) {
    const knownReasons = Object.keys(VISIT_REASONS);
    const matchedReason = knownReasons.find((r) => reasonStr.startsWith(r));
    return { visitReason: matchedReason || "", serviceType: matchedReason ? reasonStr.slice(matchedReason.length).replace(/^[\s\-–—:]+/, "") : reasonStr };
  }
  return { visitReason: reasonStr.slice(0, idx), serviceType: reasonStr.slice(idx + sep.length) };
}

const normalizeAppointmentStatus = (appointment, fallback = "Pending") =>
  String(appointment?.status || fallback).trim().toLowerCase().replace(/\s+/g, "");

const isAppointmentPastDue = (appointment) => {
  const appointmentDateKey = getAppointmentLocalDateKey(appointment);
  return Boolean(appointmentDateKey && isPastDateValue(appointmentDateKey));
};

const isNoComplianceCancelled = (appointment) =>
  normalizeAppointmentStatus(appointment) === "cancelled" &&
  String(appointment?.notes || "").includes(NO_COMPLIANCE_CANCEL_NOTE);

const isNoComplianceCandidate = (appointment) =>
  normalizeAppointmentStatus(appointment, "Pending") === "pending" &&
  isAppointmentPastDue(appointment);

const getAppointmentStatusDisplay = (appointment) => {
  if (
    isNoComplianceCancelled(appointment)
  ) {
    return {
      label: NO_COMPLIANCE_CANCEL_LABEL,
      className: "cancelled no-compliance",
    };
  }

  if (
    normalizeAppointmentStatus(appointment, "Pending") === "late" ||
    isNoComplianceCandidate(appointment)
  ) {
    return {
      label: "Late",
      className: "late",
    };
  }

  const status = normalizeAppointmentStatus(appointment, "Pending");
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    inprogress: "In Progress",
    completed: "Completed",
    late: "Late",
    cancelled: "Cancelled",
  };
  return {
    label: labels[status] || appointment?.status || "Pending",
    className: status,
  };
};

const PetOwnerAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handledBookingStateRef = useRef(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [vets, setVets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [bookingCalendarDate, setBookingCalendarDate] = useState(new Date());
  const [availableDateKeys, setAvailableDateKeys] = useState(
    loadStoredAvailableDates,
  );
  const [search, setSearch] = useState("");
  const [apptDateFrom, setApptDateFrom] = useState("");
  const [apptDateTo, setApptDateTo] = useState("");
  const [apptVetFilter, setApptVetFilter] = useState("");
  const [apptStatusFilter, setApptStatusFilter] = useState("");
  const [apptPage, setApptPage] = useState(1);
  const [apptPageSize, setApptPageSize] = useState(DEFAULT_APPT_PAGE_SIZE);
  const [booking, setBooking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [petSearch, setPetSearch] = useState("");
  const [isPetDropdownOpen, setIsPetDropdownOpen] = useState(false);
  const [vetSearch, setVetSearch] = useState("");
  const [isVetDropdownOpen, setIsVetDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [pendingBookingDateKey, setPendingBookingDateKey] = useState("");
  const [queueDateKey, setQueueDateKey] = useState("");
  const [form, setForm] = useState({
    petId: "",
    vetId: "",
    date: "",
    slot: "",
    visitReason: "",
    serviceType: "",
    notes: "",
  });

  useEffect(() => {
    if (!user || user.role !== "pet_owner") {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshAvailableDates = () =>
      setAvailableDateKeys(loadStoredAvailableDates());

    const onStorage = (event) => {
      if (event.key === AVAILABLE_DATES_STORAGE_KEY) {
        refreshAvailableDates();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshAvailableDates);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshAvailableDates);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [apptRes, petRes, vetRes] = await Promise.all([
        getAppointments(),
        getPets(),
        getAvailableVets(),
      ]);
      setAppointments(apptRes.data || []);
      setPets(petRes.data || []);
      const vetList = vetRes.data || [];
      setVets(vetList);
      setForm((prev) => ({
        ...prev,
        petId: prev.petId || petRes.data?.[0]?.id || "",
        vetId: prev.vetId || vetList?.[0]?.id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const ensureCurrentSlotOption = (slotList, currentSlotIso) => {
    if (!currentSlotIso) return slotList;
    const exists = slotList.some((slot) => slot.startsAt === currentSlotIso);
    if (exists) return slotList;

    return [
      {
        startsAt: currentSlotIso,
        endsAt: currentSlotIso,
        isCurrent: true,
      },
      ...slotList,
    ].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  };

  const openBookingModal = ({ date = "", petId = "" } = {}) => {
    const defaultVetId = form.vetId || vets[0]?.id || "";
    const nextCalendarDate = date ? new Date(`${date}T00:00:00`) : new Date();
    setEditing(null);
    setShowModal(true);
    setBookingStep(0);
    setPetSearch("");
    setIsPetDropdownOpen(false);
    setVetSearch("");
    setIsVetDropdownOpen(false);
    setPendingBookingDateKey("");
    setQueueDateKey("");
    setBookingCalendarDate(nextCalendarDate);
    setError("");
    setSlots([]);
    setSlotsLoading(false);
    setForm((prev) => ({
      ...prev,
      petId: petId || prev.petId || pets[0]?.id || "",
      vetId: defaultVetId,
      date,
      slot: "",
      visitReason: "",
      serviceType: "",
      notes: "",
    }));
  };

  useEffect(() => {
    if (!location.state?.openBooking || handledBookingStateRef.current) return;

    handledBookingStateRef.current = true;
    openBookingModal({ petId: location.state.petId || "" });
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.pathname, navigate]);

  const closeBookingModal = () => {
    setShowModal(false);
    setEditing(null);
    setBookingStep(0);
    setPetSearch("");
    setIsPetDropdownOpen(false);
    setVetSearch("");
    setIsVetDropdownOpen(false);
    setPendingBookingDateKey("");
    setQueueDateKey("");
    setError("");
    setSlotsLoading(false);
  };

  const openEditModal = async (appointment) => {
    const iso = new Date(appointment.scheduledAt).toISOString();
    const date = iso.slice(0, 10);
    setEditing(appointment);
    setShowModal(true);
    setBookingStep(0);
    setPetSearch("");
    setIsPetDropdownOpen(false);
    setVetSearch("");
    setIsVetDropdownOpen(false);
    setPendingBookingDateKey("");
    setQueueDateKey("");
    setBookingCalendarDate(new Date(`${date}T00:00:00`));
    setError("");
    const { visitReason, serviceType } = parseReason(appointment.reason || "");
    setForm({
      petId: appointment.petId,
      vetId: appointment.vetId || "",
      date,
      slot: iso,
      visitReason,
      serviceType,
      notes: appointment.notes || "",
    });
  };

  const openRebookModal = (appointment) => {
    const { visitReason, serviceType } = parseReason(appointment.reason || "");
    const defaultVetId = appointment.vetId || form.vetId || vets[0]?.id || "";

    setEditing(null);
    setShowModal(true);
    setBookingStep(visitReason && serviceType ? 2 : 1);
    setPetSearch("");
    setIsPetDropdownOpen(false);
    setVetSearch("");
    setIsVetDropdownOpen(false);
    setPendingBookingDateKey("");
    setQueueDateKey("");
    setBookingCalendarDate(new Date());
    setError("");
    setSlots([]);
    setSlotsLoading(false);
    setForm((prev) => ({
      ...prev,
      petId: appointment.petId || appointment.pet?.id || prev.petId || pets[0]?.id || "",
      vetId: defaultVetId,
      date: "",
      slot: "",
      visitReason,
      serviceType,
      notes: appointment.notes || "",
    }));
  };

  const fetchSlots = async (vetId, date, currentSlotIso = "") => {
    if (!vetId || !date) {
      setSlots([]);
      setSlotsLoading(false);
      return;
    }
    setSlots([]);
    setSlotsLoading(true);
    setError("");
    try {
      const res = await getVetAvailableSlots(vetId, date);
      setSlots(
        ensureCurrentSlotOption(
          normalizeSlotList(res.data, date),
          currentSlotIso,
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch available slots",
      );
      setSlots([]);
    } finally {
      setSlotsLoading(false);
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

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === "date" && isPastDateValue(value)) {
      setError("Due dates cannot be selected. Please choose an available date.");
      setForm((prev) => ({ ...prev, date: "", slot: "" }));
      setSlots([]);
      return;
    }
    if (
      name === "date" &&
      value &&
      !editing &&
      !canBookDate(value)
    ) {
      setError("Please choose a date marked available by the clinic.");
      setForm((prev) => ({ ...prev, date: "", slot: "" }));
      setSlots([]);
      return;
    }
    if (name === "slot" && value && !editing && isConfirmedTimeTaken(value)) {
      setError("This time already has a confirmed appointment. Please choose another time.");
      setForm((prev) => ({ ...prev, slot: "" }));
      return;
    }

    setError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "vetId" || name === "date" ? { slot: "" } : {}),
    }));
  };

  const validateBookingStep = (step = bookingStep) => {
    if (step === 0 && !form.petId) {
      setError("Please select a pet.");
      return false;
    }
    if (step === 1 && (!form.visitReason || !form.serviceType)) {
      setError("Please select a visit reason and service type.");
      return false;
    }
    if (step === 2) {
      if (!form.vetId) {
        setError("Please select a veterinarian.");
        return false;
      }
      if (!editing && !hasBookableAppointmentDates) {
        setError("No available appointment dates yet. Please check again later.");
        return false;
      }
      if (!form.date) {
        setError("Please select an available appointment date.");
        return false;
      }
      if (!form.slot) {
        setError("Please select an available time slot.");
        return false;
      }
      if (!editing && !canBookDate(form.date)) {
        setError("Please choose a date marked available by the clinic.");
        return false;
      }
      if (!editing && isConfirmedTimeTaken(form.slot, form.date)) {
        setError("This time already has a confirmed appointment. Please choose another time.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const goNextStep = () => {
    if (!validateBookingStep()) return;
    setBookingStep((current) =>
      Math.min(FINAL_BOOKING_STEP_INDEX, current + 1),
    );
  };

  const goBackStep = () => {
    setError("");
    setBookingStep((current) => Math.max(0, current - 1));
  };

  const onBookingFormSubmit = (e) => {
    e.preventDefault();
    if (bookingStep < FINAL_BOOKING_STEP_INDEX) {
      goNextStep();
      return;
    }
    submitBooking();
  };

  const submitBooking = async () => {
    if (!form.petId || !form.vetId || !form.slot) {
      setError("Please select pet, veterinarian, and time slot");
      return;
    }
    if (!editing && (!form.date || !canBookDate(form.date))) {
      setError("Please choose a date marked available by the clinic.");
      return;
    }
    if (!editing && isConfirmedTimeTaken(form.slot, form.date)) {
      setError("This time already has a confirmed appointment. Please choose another time.");
      return;
    }
    if (!form.visitReason || !form.serviceType) {
      setError("Please select a visit reason and service type");
      return;
    }

    const assembledReason = `${form.visitReason} — ${form.serviceType}`;

    setBooking(true);
    setError("");
    try {
      if (editing) {
        await updateAppointment(editing.id, {
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: assembledReason,
          notes: form.notes,
        });
      } else {
        await createAppointment({
          petId: form.petId,
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: assembledReason,
          notes: form.notes,
        });
      }
      setShowModal(false);
      setEditing(null);
      setBookingStep(0);
      setPetSearch("");
      setIsPetDropdownOpen(false);
      setPendingBookingDateKey("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create appointment");
    } finally {
      setBooking(false);
    }
  };

  const cancelAppointment = async (appointment) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await deleteAppointment(appointment.id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel appointment");
    }
  };

  const renderAppointmentActions = (appointment) => {
    const status = normalizeAppointmentStatus(appointment);

    if (
      isNoComplianceCandidate(appointment) ||
      isNoComplianceCancelled(appointment) ||
      status === "cancelled"
    ) {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => openRebookModal(appointment)}
        >
          Rebook
        </button>
      );
    }

    if (status === "pending") {
      return (
        <>
          <button
            type="button"
            className="btn-edit"
            onClick={() => openEditModal(appointment)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-remove"
            onClick={() => cancelAppointment(appointment)}
          >
            Cancel
          </button>
        </>
      );
    }

    return (
      <span className="apt-locked-note" title="Only pending appointments can be modified">
        View only
      </span>
    );
  };

  const handleApptPageSizeChange = (e) => {
    setApptPageSize(Number(e.target.value));
    setApptPage(1);
  };

  const filteredAppointments = appointments.filter((a) => {
    const vetName =
      `${a.vet?.firstName || ""} ${a.vet?.lastName || ""}`.trim() ||
      a.vet?.username ||
      "";
    const petName = a.pet?.name || "";
    const appointmentDate = new Date(a.scheduledAt);
    const statusDisplay = getAppointmentStatusDisplay(a);
    const query = search.trim().toLowerCase();
    const matchSearch =
      !query ||
      petName.toLowerCase().includes(query) ||
      vetName.toLowerCase().includes(query) ||
      (a.reason || "").toLowerCase().includes(query) ||
      (a.status || "").toLowerCase().includes(query) ||
      statusDisplay.label.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (apptStatusFilter === "Due" && !isAppointmentPastDue(a)) return false;
    if (apptStatusFilter && apptStatusFilter !== "Due") {
      if (apptStatusFilter === "Cancelled") {
        if (
          normalizeAppointmentStatus(a) !== "cancelled" &&
          !isNoComplianceCandidate(a)
        ) {
          return false;
        }
      } else if (statusDisplay.label !== apptStatusFilter) {
        return false;
      }
    }
    if (
      apptVetFilter &&
      String(a.vetId || a.vet?.id || "") !== String(apptVetFilter)
    ) {
      return false;
    }
    if (apptDateFrom && appointmentDate < new Date(apptDateFrom)) {
      return false;
    }
    if (apptDateTo && appointmentDate > new Date(`${apptDateTo}T23:59:59`)) {
      return false;
    }
    return true;
  });

  const apptTotalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / apptPageSize),
  );
  const currentApptPage = Math.min(apptPage, apptTotalPages);
  const paginatedAppointments = filteredAppointments.slice(
    (currentApptPage - 1) * apptPageSize,
    currentApptPage * apptPageSize,
  );
  const apptStartItem =
    filteredAppointments.length === 0
      ? 0
      : (currentApptPage - 1) * apptPageSize + 1;
  const apptEndItem = Math.min(
    currentApptPage * apptPageSize,
    filteredAppointments.length,
  );

  useEffect(() => {
    if (apptPage > apptTotalPages) {
      setApptPage(apptTotalPages);
    }
  }, [apptPage, apptTotalPages]);

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
  const selectedMonth = calendarDate.getMonth();
  const selectedYear = calendarDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const appointmentYears = appointments
    .map((appointment) => new Date(appointment.scheduledAt).getFullYear())
    .filter((year) => Number.isInteger(year));
  const availableDateYears = availableDateKeys
    .map((dateKey) => Number(dateKey.slice(0, 4)))
    .filter((year) => Number.isInteger(year));
  const firstYear = Math.min(
    currentYear - CALENDAR_PAST_YEARS,
    selectedYear,
    ...appointmentYears,
    ...availableDateYears,
  );
  const lastYear = Math.max(
    currentYear + CALENDAR_FUTURE_YEARS,
    selectedYear,
    ...appointmentYears,
    ...availableDateYears,
  );
  const yearOptions = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index,
  );
  const confirmedBookableDateKeys = Array.from(
    new Set(
      appointments
        .filter(
          (appointment) =>
            normalizeAppointmentStatus(appointment) === "confirmed",
        )
        .map(getAppointmentLocalDateKey)
        .filter((dateKey) => dateKey && !isPastDateValue(dateKey)),
    ),
  ).sort();
  const bookableDateKeys = normalizeDateKeyList([
    ...availableDateKeys,
    ...confirmedBookableDateKeys,
  ]);
  const hasBookableAppointmentDates = bookableDateKeys.length > 0;
  const canBookDate = (dateKey) => bookableDateKeys.includes(dateKey);
  const getConfirmedTimeKeysForDate = (dateKey) =>
    new Set(
      appointments
        .filter(
          (appointment) =>
            normalizeAppointmentStatus(appointment) === "confirmed" &&
            getAppointmentLocalDateKey(appointment) === dateKey &&
            String(appointment.id) !== String(editing?.id || ""),
        )
        .map((appointment) => getLocalTimeKey(appointment.scheduledAt))
        .filter(Boolean),
    );
  const isConfirmedTimeTaken = (startsAt, dateKey = form.date) =>
    Boolean(
      startsAt &&
        dateKey &&
        getConfirmedTimeKeysForDate(dateKey).has(getLocalTimeKey(startsAt)),
    );

  const shiftMonth = (delta) => {
    setCalendarDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const onCalendarMonthChange = (e) => {
    const month = Number(e.target.value);
    setCalendarDate((prev) => new Date(prev.getFullYear(), month, 1));
  };

  const onCalendarYearChange = (e) => {
    const year = Number(e.target.value);
    setCalendarDate((prev) => new Date(year, prev.getMonth(), 1));
  };

  const bookingSelectedMonth = bookingCalendarDate.getMonth();
  const bookingSelectedYear = bookingCalendarDate.getFullYear();
  const bookingMonthStart = new Date(
    bookingSelectedYear,
    bookingSelectedMonth,
    1,
  );
  const bookingDaysInMonth = new Date(
    bookingSelectedYear,
    bookingSelectedMonth + 1,
    0,
  ).getDate();
  const bookingFirstWeekday = bookingMonthStart.getDay();
  const bookingDays = Array.from(
    { length: bookingDaysInMonth },
    (_, index) => index + 1,
  );
  const selectedBookingDateLabel = form.date
    ? new Date(`${form.date}T00:00:00`).toLocaleDateString()
    : "";
  const editingDateKey = editing
    ? new Date(editing.scheduledAt).toISOString().slice(0, 10)
    : "";

  const shiftBookingMonth = (delta) => {
    setBookingCalendarDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const onBookingMonthChange = (e) => {
    const month = Number(e.target.value);
    setBookingCalendarDate((prev) => new Date(prev.getFullYear(), month, 1));
  };

  const onBookingYearChange = (e) => {
    const year = Number(e.target.value);
    setBookingCalendarDate((prev) => new Date(year, prev.getMonth(), 1));
  };

  const selectBookingDate = (dateKey) => {
    if (isPastDateValue(dateKey)) return;
    if (
      !canBookDate(dateKey) &&
      (!editing || editingDateKey !== dateKey)
    ) {
      return;
    }

    setError("");
    setBookingCalendarDate(new Date(`${dateKey}T00:00:00`));
    setForm((prev) => ({
      ...prev,
      date: dateKey,
      slot: "",
    }));
  };

  const requestCalendarDateBooking = (dateKey) => {
    if (!canBookDate(dateKey) || isPastDateValue(dateKey)) {
      return;
    }
    setPendingBookingDateKey(dateKey);
    setQueueDateKey("");
    setError("");
  };

  const confirmCalendarDateBooking = () => {
    if (!pendingBookingDateKey) return;
    openBookingModal({ date: pendingBookingDateKey });
  };

  const openAppointmentQueue = (dateKey) => {
    setQueueDateKey(dateKey);
    setPendingBookingDateKey("");
    setError("");
  };

  const bookAnotherAppointmentOnDate = (dateKey) => {
    if (!canBookDate(dateKey)) return;
    setQueueDateKey("");
    openBookingModal({ date: dateKey });
  };

  const onCalendarDayKeyDown = (e, dateKey, dayAppointments = []) => {
    if (e.key !== "Enter" && e.key !== " ") return;

    e.preventDefault();
    if (dayAppointments.length > 0) {
      openAppointmentQueue(dateKey);
      return;
    }
    requestCalendarDateBooking(dateKey);
  };

  const renderQueueAppointmentActions = (appointment) => {
    const status = normalizeAppointmentStatus(appointment);

    if (isNoComplianceCandidate(appointment) || isNoComplianceCancelled(appointment)) {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => {
            setQueueDateKey("");
            openRebookModal(appointment);
          }}
        >
          Rebook
        </button>
      );
    }

    if (status === "pending") {
      return (
        <>
          <button
            type="button"
            className="btn-edit"
            onClick={() => {
              setQueueDateKey("");
              openEditModal(appointment);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-remove"
            onClick={() => {
              setQueueDateKey("");
              cancelAppointment(appointment);
            }}
          >
            Cancel
          </button>
        </>
      );
    }

    if (status === "cancelled") {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => {
            setQueueDateKey("");
            openRebookModal(appointment);
          }}
        >
          Rebook
        </button>
      );
    }

    return <span className="apt-locked-note">View only</span>;
  };

  const pendingBookingDateLabel = pendingBookingDateKey
    ? new Date(`${pendingBookingDateKey}T00:00:00`).toLocaleDateString()
    : "";
  const selectedPet =
    pets.find((pet) => String(pet.id) === String(form.petId)) || null;
  const petSearchTerm = petSearch.trim().toLowerCase();
  const filteredPetOptions = pets.filter((pet) => {
    if (!petSearchTerm) return true;

    return [pet.name, pet.species, pet.breed]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(petSearchTerm));
  });
  const selectedVet =
    vets.find((vet) => String(vet.id) === String(form.vetId)) || null;
  const vetSearchTerm = vetSearch.trim().toLowerCase();
  const filteredVetOptions = vets.filter((vet) => {
    if (!vetSearchTerm) return true;

    return [
      getVetOptionLabel(vet),
      vet.username,
      vet.email,
      vet.phone,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(vetSearchTerm));
  });
  const confirmedTimeKeysForSelectedDate = getConfirmedTimeKeysForDate(
    form.date,
  );
  const availableSlots = slots.filter(
    (slot) =>
      slot.isCurrent ||
      !confirmedTimeKeysForSelectedDate.has(getLocalTimeKey(slot.startsAt)),
  );
  const selectedSlot = availableSlots.find((slot) => slot.startsAt === form.slot);
  const reasonSummary =
    form.visitReason && form.serviceType
      ? `${form.visitReason} - ${form.serviceType}`
      : "";

  useEffect(() => {
    if (!showModal || isPetDropdownOpen) return;
    setPetSearch(getPetOptionLabel(selectedPet));
  }, [isPetDropdownOpen, selectedPet, showModal]);

  useEffect(() => {
    if (!showModal || isVetDropdownOpen) return;
    setVetSearch(getVetOptionLabel(selectedVet));
  }, [isVetDropdownOpen, selectedVet, showModal]);

  const queueAppointments = queueDateKey
    ? filteredAppointments
        .filter(
          (appointment) =>
            getLocalDateKey(new Date(appointment.scheduledAt)) === queueDateKey,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        )
    : [];
  const queueDateLabel = queueDateKey
    ? new Date(`${queueDateKey}T00:00:00`).toLocaleDateString()
    : "";
  const canBookAnotherOnQueueDate = Boolean(
    queueDateKey && confirmedBookableDateKeys.includes(queueDateKey),
  );

  return (
    <div className="dashboard-container">
      <PetOwnerSidebar isOpen={isOpen} onClose={close} />

      {/* MAIN CONTENT */}
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
              onClick={() => navigate("/pet-owner-notifications")}
            >
              <img src={bellIcon} alt="Notifications" />
            </button>
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="User"
              profilePath="/pet-owner-profile"
            />
          </div>
        </header>

        <section
          className={`content-body ${
            viewMode === "calendar" ? "appointment-calendar-body" : ""
          }`}
        >
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
            <div className="appointment-actions">
              <button
                className="add-apt-btn"
                onClick={() => openBookingModal()}
              >
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
                      MONTH
                      <select
                        value={selectedMonth}
                        onChange={onCalendarMonthChange}
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      YEAR
                      <select
                        value={selectedYear}
                        onChange={onCalendarYearChange}
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
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
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="calendar-day empty" />
                ))}
                {days.map((d) => {
                  const dayDate = new Date(selectedYear, selectedMonth, d);
                  const dayKey = getLocalDateKey(dayDate);
                  const isPastDay = dayDate < todayStart;
                  const isAvailableDay =
                    !isPastDay && availableDateKeys.includes(dayKey);
                  const dayAppointments = filteredAppointments
                    .filter((a) => {
                      const scheduled = new Date(a.scheduledAt);
                      return (
                        scheduled.getFullYear() === selectedYear &&
                        scheduled.getMonth() === selectedMonth &&
                        scheduled.getDate() === d
                      );
                    })
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledAt).getTime() -
                        new Date(b.scheduledAt).getTime(),
                    );
                  const isQueueClickable = dayAppointments.length > 0;
                  const isCalendarClickable =
                    isQueueClickable || isAvailableDay;

                  return (
                    <div
                      key={d}
                      className={`calendar-day ${isPastDay ? "past-due" : ""} ${
                        isAvailableDay ? "available-selected" : ""
                      } ${isAvailableDay ? "bookable-date" : ""} ${
                        isQueueClickable ? "appointment-queue-day" : ""
                      }`}
                      title={
                        isPastDay
                          ? "Past due date"
                          : isQueueClickable
                            ? "View appointment queue"
                            : isAvailableDay
                              ? "Available for booking"
                              : undefined
                      }
                      role={isCalendarClickable ? "button" : undefined}
                      tabIndex={isCalendarClickable ? 0 : undefined}
                      onClick={() => {
                        if (isQueueClickable) {
                          openAppointmentQueue(dayKey);
                          return;
                        }
                        if (isAvailableDay) {
                          requestCalendarDateBooking(dayKey);
                        }
                      }}
                      onKeyDown={(e) =>
                        onCalendarDayKeyDown(e, dayKey, dayAppointments)
                      }
                    >
                      <span className="day-num">{d}</span>
                      {(isPastDay ||
                        isAvailableDay ||
                        dayAppointments.length > 0) && (
                        <div className="date-status-row">
                          {isPastDay ? (
                            <span className="date-state-badge due">Due</span>
                          ) : (
                            isAvailableDay && (
                              <span className="date-state-badge available">
                                Available
                              </span>
                            )
                          )}
                          {dayAppointments.length > 0 && (
                            <span
                              className="appointment-count-badge"
                              aria-label={`${dayAppointments.length} ${
                                dayAppointments.length === 1
                                  ? "appointment"
                                  : "appointments"
                              } in queue`}
                              title={`View ${dayAppointments.length} ${
                                dayAppointments.length === 1
                                  ? "appointment"
                                  : "appointments"
                              }`}
                            >
                              {dayAppointments.length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="list-view-container">
              <div className="appointment-list-description">
                <div>
                  <h3>Search & Filter Options</h3>
                  <p>
                    Search by pet, vet, reason, or status and choose how many
                    appointments to show per page.
                  </p>
                </div>
                <span>{filteredAppointments.length} results</span>
              </div>
              <div className="appointment-list-toolbar">
                <div className="appointment-search-box">
                  <input
                    type="text"
                    className="apt-search"
                    placeholder="Search pet, vet, reason, or status..."
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
                      onChange={handleApptPageSizeChange}
                      aria-label="Entries per page"
                    >
                      {APPT_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
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
                    <option value="">Show All</option>
                    <option value="Due">Due</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Late">Late</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value={NO_COMPLIANCE_CANCEL_LABEL}>
                      {NO_COMPLIANCE_CANCEL_LABEL}
                    </option>
                  </select>
                  <select
                    className="apt-filter-select"
                    value={apptVetFilter}
                    onChange={(e) => {
                      setApptVetFilter(e.target.value);
                      setApptPage(1);
                    }}
                    aria-label="Filter by vet"
                  >
                    <option value="">All Vets</option>
                    {vets.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        {`${vet.firstName || ""} ${vet.lastName || ""}`.trim() ||
                          vet.username}
                      </option>
                    ))}
                  </select>
                  <div className="apt-date-range" aria-label="Appointment date range">
                    <label className="apt-date-field">
                      <span>From</span>
                      <input
                        type="date"
                        className="apt-date-input"
                        value={apptDateFrom}
                        title="From date"
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
                        title="To date"
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
                <p className="list-placeholder">
                  No appointments found. Start by booking your first visit!
                </p>
              ) : (
                <>
                  <div className="table-desktop">
                    <table className="appointment-table">
                      <thead>
                        <tr>
                          <th>Pet</th>
                          <th>Veterinarian</th>
                          <th>Date and Time</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Option</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAppointments.map((apt) => {
                          const statusDisplay =
                            getAppointmentStatusDisplay(apt);
                          const vetName =
                            `${apt.vet?.firstName || ""} ${apt.vet?.lastName || ""}`.trim() ||
                            apt.vet?.username ||
                            "-";

                          return (
                            <tr key={apt.id}>
                              <td>{apt.pet?.name || "-"}</td>
                              <td>{vetName}</td>
                              <td>
                                {new Date(apt.scheduledAt).toLocaleString()}
                              </td>
                              <td>{apt.reason || "-"}</td>
                              <td>
                                <span
                                  className={`apt-status ${statusDisplay.className}`}
                                >
                                  {statusDisplay.label}
                                </span>
                              </td>
                              <td>
                                <div className="action-btns">
                                  {renderAppointmentActions(apt)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-mobile table-cards-list">
                    {paginatedAppointments.map((apt) => {
                      const statusDisplay = getAppointmentStatusDisplay(apt);
                      const vetName =
                        `${apt.vet?.firstName || ""} ${apt.vet?.lastName || ""}`.trim() ||
                        apt.vet?.username ||
                        "-";

                      return (
                        <div className="record-card" key={apt.id}>
                          <div className="record-card-header">
                            <div className="record-card-title">
                              <div className="record-card-id">
                                {apt.pet?.name || "-"}
                              </div>
                              <div className="record-card-patient">
                                {vetName}
                              </div>
                            </div>
                            <span
                              className={`apt-status ${statusDisplay.className}`}
                            >
                              {statusDisplay.label}
                            </span>
                          </div>
                          <div className="record-card-body">
                            <div className="record-card-row">
                              <span className="record-card-label">
                                Date and Time
                              </span>
                              <span>
                                {new Date(apt.scheduledAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="record-card-row">
                              <span className="record-card-label">Reason</span>
                              <span>{apt.reason || "-"}</span>
                            </div>
                            {apt.notes && (
                              <div className="record-card-row">
                                <span className="record-card-label">Notes</span>
                                <span>{apt.notes}</span>
                              </div>
                            )}
                            <div className="record-card-row">
                              <span className="record-card-label">Option</span>
                              <div className="action-btns">
                                {renderAppointmentActions(apt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                  Showing {apptStartItem}-{apptEndItem} of{" "}
                  {filteredAppointments.length} appointments | Page{" "}
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

      {queueDateKey && (
        <div
          className="modal-overlay appointment-queue-overlay"
          onClick={() => setQueueDateKey("")}
        >
          <div
            className="modal-box appointment-queue-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="appointment-queue-badge">Appointment Queue</span>
            <h3>{queueDateLabel}</h3>
            <p className="appointment-queue-copy">
              {queueAppointments.length === 1
                ? "1 appointment is scheduled for this date."
                : `${queueAppointments.length} appointments are scheduled for this date.`}
            </p>

            <div className="appointment-queue-list">
              {queueAppointments.length === 0 ? (
                <p className="appointment-field-hint">
                  No appointments found for this date.
                </p>
              ) : (
                queueAppointments.map((appointment, index) => {
                  const statusDisplay =
                    getAppointmentStatusDisplay(appointment);
                  const appointmentVet =
                    appointment.vet ||
                    vets.find(
                      (vet) => String(vet.id) === String(appointment.vetId),
                    );
                  const vetName = appointmentVet
                    ? `${appointmentVet.firstName || ""} ${appointmentVet.lastName || ""}`.trim() ||
                      appointmentVet.username
                    : "No vet assigned";

                  return (
                    <div
                      key={appointment.id}
                      className={`appointment-queue-row ${statusDisplay.className}`}
                    >
                      <div className="appointment-queue-number">
                        #{index + 1}
                      </div>
                      <div className="appointment-queue-main">
                        <div className="appointment-queue-top">
                          <strong>
                            {new Date(
                              appointment.scheduledAt,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                          <span
                            className={`apt-status ${statusDisplay.className}`}
                          >
                            {statusDisplay.label}
                          </span>
                        </div>
                        <div className="appointment-queue-title">
                          {appointment.pet?.name || "Pet"}
                        </div>
                        <div className="appointment-queue-meta">{vetName}</div>
                        {appointment.reason && (
                          <div className="appointment-queue-reason">
                            {appointment.reason}
                          </div>
                        )}
                      </div>
                      <div className="appointment-queue-actions">
                        {renderQueueAppointmentActions(appointment)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions appointment-queue-modal-actions">
              {canBookAnotherOnQueueDate && (
                <button
                  type="button"
                  className="save-btn book-another-appointment-btn"
                  onClick={() => bookAnotherAppointmentOnDate(queueDateKey)}
                >
                  Book Another Appointment
                </button>
              )}
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setQueueDateKey("")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingBookingDateKey && (
        <div
          className="modal-overlay date-booking-confirm-overlay"
          onClick={() => setPendingBookingDateKey("")}
        >
          <div
            className="modal-box date-booking-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="date-booking-confirm-badge">Available Date</span>
            <h3>Book Appointment?</h3>
            <p className="date-booking-confirm-copy">
              Confirm to book an appointment for this date.
            </p>
            <div className="date-booking-confirm-date">
              <span>Selected Date</span>
              <strong>{pendingBookingDateLabel}</strong>
            </div>
            <div className="modal-actions date-booking-confirm-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setPendingBookingDateKey("")}
              >
                Back
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={confirmCalendarDateBooking}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div
            className="modal-box pet-owner-booking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={onBookingFormSubmit}
              className="user-modal-form appointment-booking-form"
            >
              <h3>{editing ? "Update Appointment" : "Book Appointment"}</h3>

              <div className="appointment-stepper" aria-label="Booking steps">
                {BOOKING_STEPS.map((step, index) => (
                  <button
                    type="button"
                    key={step}
                    className={`appointment-step ${index === bookingStep ? "active" : ""} ${
                      index < bookingStep ? "done" : ""
                    }`}
                    onClick={() => {
                      if (index <= bookingStep) {
                        setBookingStep(index);
                        setError("");
                      }
                    }}
                    disabled={index > bookingStep}
                  >
                    <span className="appointment-step-number">{index + 1}</span>
                    <span>{step}</span>
                  </button>
                ))}
              </div>

              <div className="appointment-step-panel">
                {bookingStep === 0 && (
                  <>
              {/* Pet selection */}
              <div className="form-group">
                <label>
                  Pet <span className="required-star">*</span>
                </label>
                <div
                  className={`pet-search-select${isPetDropdownOpen ? " open" : ""}${
                    editing ? " disabled" : ""
                  }`}
                >
                  <input
                    type="text"
                    value={petSearch}
                    onChange={(event) => {
                      setPetSearch(event.target.value);
                      setIsPetDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (!editing) {
                        setPetSearch("");
                        setIsPetDropdownOpen(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsPetDropdownOpen(false);
                        setPetSearch(getPetOptionLabel(selectedPet));
                      }, 120);
                    }}
                    placeholder={
                      pets.length === 0 ? "No pets found" : "Search and choose a pet"
                    }
                    disabled={!!editing || pets.length === 0}
                    required
                    role="combobox"
                    aria-expanded={isPetDropdownOpen}
                    aria-controls="booking-pet-options"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className="pet-search-toggle"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (!editing && pets.length > 0) {
                        setPetSearch("");
                        setIsPetDropdownOpen((current) => !current);
                      }
                    }}
                    disabled={!!editing || pets.length === 0}
                    aria-label="Show pet options"
                  >
                    ▾
                  </button>

                  {isPetDropdownOpen && !editing && pets.length > 0 && (
                    <div
                      id="booking-pet-options"
                      className="pet-search-options"
                      role="listbox"
                    >
                      {filteredPetOptions.length === 0 ? (
                        <div className="pet-search-empty">No matching pets</div>
                      ) : (
                        filteredPetOptions.map((pet) => (
                          <button
                            key={pet.id}
                            type="button"
                            className={`pet-search-option${
                              String(pet.id) === String(form.petId)
                                ? " selected"
                                : ""
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                petId: pet.id,
                              }));
                              setPetSearch(getPetOptionLabel(pet));
                              setIsPetDropdownOpen(false);
                              setError("");
                            }}
                            role="option"
                            aria-selected={String(pet.id) === String(form.petId)}
                          >
                            <span>{pet.name || "Unnamed Pet"}</span>
                            <small>
                              {[pet.species, pet.breed].filter(Boolean).join(" - ") ||
                                "Pet profile"}
                            </small>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {pets.length === 0 ? (
                  <p className="no-pets-hint">
                    No pets found.{" "}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => navigate("/pet-owner-pets")}
                    >
                      Add a pet first
                    </button>
                  </p>
                ) : (
                  <p className="add-pet-hint">
                    Need to add a new pet?{" "}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => navigate("/pet-owner-pets")}
                    >
                      Go to My Pets
                    </button>
                  </p>
                )}
                {selectedPet && (
                  <div className="appointment-summary compact">
                    <div>
                      <span>Pet</span>
                      <strong>{selectedPet.name || "-"}</strong>
                    </div>
                    <div>
                      <span>Species</span>
                      <strong>{selectedPet.species || "-"}</strong>
                    </div>
                    <div>
                      <span>Breed</span>
                      <strong>{selectedPet.breed || "-"}</strong>
                    </div>
                  </div>
                )}
              </div>
                  </>
                )}

                {bookingStep === 2 && (
                  <>
              {/* Veterinarian */}
              <div className="form-group">
                <label>
                  Veterinarian <span className="required-star">*</span>
                </label>
                <div
                  className={`pet-search-select vet-search-select${
                    isVetDropdownOpen ? " open" : ""
                  }`}
                >
                  <input
                    type="text"
                    value={vetSearch}
                    onChange={(event) => {
                      setVetSearch(event.target.value);
                      setIsVetDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (vets.length > 0) {
                        setVetSearch("");
                        setIsVetDropdownOpen(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsVetDropdownOpen(false);
                        setVetSearch(getVetOptionLabel(selectedVet));
                      }, 120);
                    }}
                    placeholder={
                      vets.length === 0
                        ? "No veterinarians found"
                        : "Search and choose a veterinarian"
                    }
                    disabled={vets.length === 0}
                    required
                    role="combobox"
                    aria-expanded={isVetDropdownOpen}
                    aria-controls="booking-vet-options"
                    aria-autocomplete="list"
                  />
                  <button
                    type="button"
                    className="pet-search-toggle"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (vets.length > 0) {
                        setVetSearch("");
                        setIsVetDropdownOpen((current) => !current);
                      }
                    }}
                    disabled={vets.length === 0}
                    aria-label="Show veterinarian options"
                  >
                    ▾
                  </button>

                  {isVetDropdownOpen && vets.length > 0 && (
                    <div
                      id="booking-vet-options"
                      className="pet-search-options"
                      role="listbox"
                    >
                      {filteredVetOptions.length === 0 ? (
                        <div className="pet-search-empty">
                          No matching veterinarians
                        </div>
                      ) : (
                        filteredVetOptions.map((vet) => (
                          <button
                            key={vet.id}
                            type="button"
                            className={`pet-search-option${
                              String(vet.id) === String(form.vetId)
                                ? " selected"
                                : ""
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                vetId: vet.id,
                                slot: "",
                              }));
                              setVetSearch(getVetOptionLabel(vet));
                              setIsVetDropdownOpen(false);
                              setError("");
                            }}
                            role="option"
                            aria-selected={String(vet.id) === String(form.vetId)}
                          >
                            <span>{getVetOptionLabel(vet)}</span>
                            <small>{vet.email || vet.username || "Veterinarian"}</small>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="form-group">
                <label>
                  Date <span className="required-star">*</span>
                </label>
                {form.date && (
                  <div className="booking-selected-date">
                    <span>Selected Date</span>
                    <strong>{selectedBookingDateLabel}</strong>
                  </div>
                )}

                <div className="booking-date-picker">
                  <div className="booking-date-picker-header">
                    <button
                      type="button"
                      className="booking-date-nav"
                      onClick={() => shiftBookingMonth(-1)}
                      aria-label="Previous booking month"
                    >
                      &lt;
                    </button>
                    <div className="calendar-picker booking-calendar-picker">
                      <label>
                        MONTH
                        <select
                          value={bookingSelectedMonth}
                          onChange={onBookingMonthChange}
                        >
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        YEAR
                        <select
                          value={bookingSelectedYear}
                          onChange={onBookingYearChange}
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="booking-date-nav"
                      onClick={() => shiftBookingMonth(1)}
                      aria-label="Next booking month"
                    >
                      &gt;
                    </button>
                  </div>

                  {!hasBookableAppointmentDates && !editing ? (
                    <p className="appointment-field-hint no-available-dates-hint">
                      No available appointment dates yet. Please check again
                      later.
                    </p>
                  ) : (
                    <div className="booking-date-grid">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div key={day} className="booking-date-weekday">
                            {day}
                          </div>
                        ),
                      )}
                      {Array.from({ length: bookingFirstWeekday }).map(
                        (_, index) => (
                          <div
                            key={`booking-empty-${index}`}
                            className="booking-date-day empty"
                          />
                        ),
                      )}
                      {bookingDays.map((day) => {
                        const dayDate = new Date(
                          bookingSelectedYear,
                          bookingSelectedMonth,
                          day,
                        );
                        const dayKey = getLocalDateKey(dayDate);
                        const isPastDay = dayDate < todayStart;
                        const isBookableDay =
                          !isPastDay && canBookDate(dayKey);
                        const isSelectedDay = form.date === dayKey;
                        const isEditingCurrentDay = editingDateKey === dayKey;
                        const canSelectDay =
                          !isPastDay &&
                          (isBookableDay || isEditingCurrentDay);
                        const badgeLabel = isPastDay
                          ? "Due"
                          : isSelectedDay
                            ? "Selected"
                            : isBookableDay || isEditingCurrentDay
                              ? "Available"
                              : "";

                        return (
                          <button
                            type="button"
                            key={dayKey}
                            className={`booking-date-day ${
                              isPastDay ? "past-due" : ""
                            } ${isBookableDay ? "available" : ""} ${
                              isSelectedDay ? "selected" : ""
                            } ${
                              !canSelectDay && !isPastDay ? "unavailable" : ""
                            }`}
                            disabled={!canSelectDay}
                            onClick={() => selectBookingDate(dayKey)}
                          >
                            <span className="booking-date-number">{day}</span>
                            {badgeLabel && (
                              <span
                                className={`date-state-badge ${
                                  isPastDay
                                    ? "due"
                                    : isSelectedDay
                                      ? "selected"
                                      : "available"
                                }`}
                              >
                                {badgeLabel}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Time Slot */}
              <div className="form-group">
                <label>
                  Available Time Slot <span className="required-star">*</span>
                </label>
                <select
                  name="slot"
                  value={form.slot}
                  onChange={onFieldChange}
                  required
                  disabled={
                    !form.vetId ||
                    !form.date ||
                    slotsLoading ||
                    (!hasBookableAppointmentDates && !editing)
                  }
                >
                  <option value="">
                    {slotsLoading
                      ? "Loading slots..."
                      : !hasBookableAppointmentDates && !editing
                        ? "No available dates"
                        : !form.vetId || !form.date
                          ? "Select vet and date first"
                          : "Select time slot"}
                  </option>
                  {availableSlots.map((s) => (
                    <option key={s.startsAt} value={s.startsAt}>
                      {new Date(s.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {s.isCurrent ? " (current)" : ""}
                    </option>
                  ))}
                </select>
                {form.vetId && form.date && slotsLoading && (
                  <p className="appointment-field-hint">
                    Loading slots...
                  </p>
                )}
                {!hasBookableAppointmentDates && !editing && (
                  <p className="appointment-field-hint">
                    No available appointment dates yet. Please check again
                    later.
                  </p>
                )}
                {form.vetId &&
                  form.date &&
                  !slotsLoading &&
                  slots.length > availableSlots.length && (
                  <p className="appointment-field-hint">
                    Confirmed appointment times are unavailable.
                  </p>
                )}
                {form.vetId &&
                  form.date &&
                  !slotsLoading &&
                  availableSlots.length === 0 &&
                  (hasBookableAppointmentDates || editing) && (
                  <p className="appointment-field-hint">
                    No available slots for this date.
                  </p>
                )}
              </div>
                  </>
                )}

                {bookingStep === 1 && (
                  <>
              {/* Visit Reason */}
              <div className="form-group">
                <label>
                  Visit Reason <span className="required-star">*</span>
                </label>
                <select
                  name="visitReason"
                  value={form.visitReason}
                  required
                  onChange={(e) => {
                    const vr = e.target.value;
                    setForm((prev) => ({ ...prev, visitReason: vr, serviceType: "" }));
                  }}
                >
                  <option value="">Select visit reason…</option>
                  {Object.keys(VISIT_REASONS).map((vr) => (
                    <option key={vr} value={vr}>{vr}</option>
                  ))}
                </select>
              </div>

              {/* Service Type — only shown when visitReason is selected */}
              {form.visitReason && (
                <div className="form-group">
                  <label>
                    Service Type <span className="required-star">*</span>
                  </label>
                  <select
                    name="serviceType"
                    value={form.serviceType}
                    required
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, serviceType: e.target.value }))
                    }
                  >
                    <option value="">Select service…</option>
                    {(VISIT_REASONS[form.visitReason] || []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
                  {reasonSummary && (
                    <div className="appointment-summary">
                      <div>
                        <span>Visit Reason</span>
                        <strong>{form.visitReason}</strong>
                      </div>
                      <div>
                        <span>Service</span>
                        <strong>{form.serviceType}</strong>
                      </div>
                    </div>
                  )}
                  </>
                )}

                {bookingStep === 3 && (
                  <>
              {/* Notes */}
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={onFieldChange}
                  rows={3}
                  placeholder="Any additional information for the vet…"
                />
              </div>

                  <div className="appointment-summary">
                    <div>
                      <span>Pet</span>
                      <strong>{selectedPet?.name || "-"}</strong>
                    </div>
                    <div>
                      <span>Veterinarian</span>
                      <strong>
                        {selectedVet
                          ? `${selectedVet.firstName || ""} ${selectedVet.lastName || ""}`.trim() ||
                            selectedVet.username
                          : "-"}
                      </strong>
                    </div>
                    <div>
                      <span>Date</span>
                      <strong>
                        {form.date
                          ? new Date(`${form.date}T00:00:00`).toLocaleDateString()
                          : "-"}
                      </strong>
                    </div>
                    <div>
                      <span>Time</span>
                      <strong>
                        {selectedSlot
                          ? new Date(selectedSlot.startsAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : form.slot
                            ? new Date(form.slot).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                      </strong>
                    </div>
                    <div>
                      <span>Reason</span>
                      <strong>{reasonSummary || "-"}</strong>
                    </div>
                    <div>
                      <span>Notes</span>
                      <strong>{form.notes || "-"}</strong>
                    </div>
                  </div>
                  </>
                )}
              </div>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions appointment-step-actions">
                {bookingStep > 0 && (
                  <button
                    type="button"
                    className="step-back-btn"
                    onClick={goBackStep}
                    disabled={booking}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeBookingModal}
                  disabled={booking}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={booking}>
                  {bookingStep < FINAL_BOOKING_STEP_INDEX
                    ? "Next"
                    : booking
                      ? editing
                        ? "Updating..."
                        : "Booking..."
                      : editing
                        ? "Update Appointment"
                        : "Book Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetOwnerAppointment;
