import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffAppointment.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createAppointment,
  createPet,
  createStaffClient,
  getAppointments,
  getAvailableVets,
  getInventory,
  getPets,
  getStaffClients,
  getVetAvailableSlots,
  requestPasswordReset,
  updateAppointment,
} from "../../../api/api";

// ASSETS
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
const REASON_SEPARATOR = " - ";
const BOOKING_STEPS = [
  "Owner",
  "Pet",
  "Visit Reason",
  "Date & Time",
  "Notes",
];
const FINAL_BOOKING_STEP_INDEX = BOOKING_STEPS.length - 1;
const FINAL_STEP_SUBMIT_DELAY_MS = 450;
const EMPTY_OWNER_FORM = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  address: "",
};
const EMPTY_PET_FORM = {
  name: "",
  species: "",
  breed: "",
  age: "",
  gender: "",
  status: "Healthy",
  notes: "",
};
const VISIT_REASONS = {
  Vaccination: {
    note: "Check vaccine inventory before confirming.",
    services: [
      "Vanguard 5 in 1",
      "Vanguard 6 in 1",
      "Anti Rabies",
      "Single Rabies for Cat",
      "Purevac",
      "Other Vaccination",
    ],
  },
  Deworming: {
    note: "For dogs and cats.",
    services: ["Dog Deworming", "Cat Deworming"],
  },
  "Minor Surgery": {
    note: "Basic wound repair and C-section.",
    services: ["Basic Wound Repair", "C-Section"],
  },
  "Medical Consult and Testing": {
    note: "CBC, blood chemistry, and test kits.",
    groups: [
      {
        label: "General Testing",
        services: ["CBC", "Blood Chemistry"],
      },
      {
        label: "Test Kits for Dogs",
        services: [
          "Dog Parvo / Distemper",
          "Corona Virus",
          "Blood Parasite Blood Test",
        ],
      },
      {
        label: "Test Kits for Cats",
        services: [
          "Feline Leukemia",
          "Feline Immunodeficiency",
          "Feline Rhinotracheitis",
          "Giardia",
        ],
      },
    ],
  },
};

const getVisitServiceGroups = (visitReason) => {
  const config = VISIT_REASONS[visitReason];
  if (!config) return [];
  if (config.groups) return config.groups;
  return [{ label: visitReason, services: config.services || [] }];
};

const ownerDisplayName = (owner) => {
  if (!owner) return "";
  return (
    `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() ||
    owner.username ||
    owner.email ||
    "Pet Owner"
  );
};

const petOwnerId = (pet) =>
  pet?.ownerId || pet?.owner?.id || pet?.petOwnerId || pet?.userId || "";

const petDisplayName = (pet) =>
  pet
    ? `${pet.name || "Pet"}${pet.species ? ` (${pet.species})` : ""}`
    : "Pet";

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits.slice(0, 11);
};

const isValidPhone = (value) => /^09\d{9}$/.test(normalizePhone(value));

const generateTemporaryPassword = () => {
  const randomPart =
    window.crypto?.getRandomValues
      ? Array.from(window.crypto.getRandomValues(new Uint32Array(2)))
          .map((num) => num.toString(36))
          .join("")
      : Math.random().toString(36).slice(2, 12);
  return `PawCruz@${randomPart}A1`;
};

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isPastDateValue = (value) =>
  Boolean(value && value < getLocalDateKey(new Date()));

const AVAILABLE_DATES_STORAGE_KEY = "staffAppointmentAvailableDates";
const NO_COMPLIANCE_CANCEL_NOTE = "Cancelled due to no compliance.";

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

const saveStoredAvailableDates = (dateKeys) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AVAILABLE_DATES_STORAGE_KEY,
      JSON.stringify(dateKeys),
    );
  } catch {
    // Browser storage can be unavailable in private or locked-down contexts.
  }
};

const normalizeAppointmentStatus = (appointment, fallback = "") =>
  String(appointment?.status || fallback).trim().toLowerCase();

const isAppointmentPastDue = (appointment) => {
  if (!appointment?.scheduledAt) return false;
  const scheduledDate = new Date(appointment.scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) return false;
  return isPastDateValue(getLocalDateKey(scheduledDate));
};

const isNoComplianceCandidate = (appointment) => {
  const status = normalizeAppointmentStatus(appointment, "Pending");
  return (
    isAppointmentPastDue(appointment) &&
    status !== "completed" &&
    status !== "cancelled"
  );
};

const isNoComplianceCancelled = (appointment) =>
  normalizeAppointmentStatus(appointment) === "cancelled" &&
  String(appointment?.notes || "").includes(NO_COMPLIANCE_CANCEL_NOTE);

const getAppointmentStatusDisplay = (appointment) => {
  if (
    isNoComplianceCandidate(appointment) ||
    isNoComplianceCancelled(appointment)
  ) {
    return {
      label: "Cancelled Due to No Compliance",
      className: "cancelled no-compliance",
    };
  }

  const label = appointment?.status || "Pending";
  return {
    label,
    className: normalizeAppointmentStatus(appointment, "Pending"),
  };
};

const parseAppointmentReason = (reason) => {
  if (!reason) return { visitReason: "", serviceType: "" };

  const exactSeparatorIndex = reason.indexOf(REASON_SEPARATOR);
  if (exactSeparatorIndex !== -1) {
    return {
      visitReason: reason.slice(0, exactSeparatorIndex),
      serviceType: reason.slice(exactSeparatorIndex + REASON_SEPARATOR.length),
    };
  }

  const knownReason = Object.keys(VISIT_REASONS)
    .sort((a, b) => b.length - a.length)
    .find((visitReason) => reason.startsWith(visitReason));

  if (!knownReason) {
    return { visitReason: "", serviceType: reason };
  }

  return {
    visitReason: knownReason,
    serviceType: reason.slice(knownReason.length).replace(/^[\s\W_]+/, ""),
  };
};

const normalizeUsersResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  return [];
};

const fetchStaffOwners = async () => {
  try {
    const firstRes = await getStaffClients({ page: 1, limit: 100 });
    const firstOwners = normalizeUsersResponse(firstRes.data);
    const totalPages = Number(firstRes.data?.pages || 1);

    if (totalPages <= 1) return firstOwners;

    const pageResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        getStaffClients({ page: index + 2, limit: 100 }),
      ),
    );

    return [
      ...firstOwners,
      ...pageResponses.flatMap((response) =>
        normalizeUsersResponse(response.data),
      ),
    ];
  } catch {
    const fallbackRes = await getStaffClients();
    return normalizeUsersResponse(fallbackRes.data);
  }
};

const mergeOwnerOptions = (...ownerLists) => {
  const ownerMap = new Map();

  ownerLists.flat().forEach((owner) => {
    if (!owner?.id || owner.deletedAt) return;
    if (owner.role && owner.role !== "pet_owner") return;
    const key = String(owner.id);
    ownerMap.set(key, { ...(ownerMap.get(key) || {}), ...owner });
  });

  return Array.from(ownerMap.values()).sort((a, b) =>
    ownerDisplayName(a).localeCompare(ownerDisplayName(b)),
  );
};

const StaffAppointment = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const [viewMode, setViewMode] = useState("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [bookingCalendarDate, setBookingCalendarDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [vets, setVets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [apptDateFrom, setApptDateFrom] = useState("");
  const [apptDateTo, setApptDateTo] = useState("");
  const [apptVetFilter, setApptVetFilter] = useState("");
  const [apptStatusFilter, setApptStatusFilter] = useState("");
  const [apptPage, setApptPage] = useState(1);
  const [apptPageSize, setApptPageSize] = useState(DEFAULT_APPT_PAGE_SIZE);
  const [isSelectingDate, setIsSelectingDate] = useState(false);
  const [availableDateKeys, setAvailableDateKeys] = useState(
    loadStoredAvailableDates,
  );
  const [draftAvailableDateKeys, setDraftAvailableDateKeys] = useState([]);
  const [dateSelectionMode, setDateSelectionMode] = useState("single");
  const [showAvailabilityConfirm, setShowAvailabilityConfirm] =
    useState(false);
  const [queueDateKey, setQueueDateKey] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [cancelledAppointment, setCancelledAppointment] = useState(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [pendingAppointment, setPendingAppointment] = useState(null);
  const [rebookedAppointment, setRebookedAppointment] = useState(null);
  const [pendingPastDueDate, setPendingPastDueDate] = useState("");
  const [pendingPastDueAppointment, setPendingPastDueAppointment] =
    useState(null);
  const [editing, setEditing] = useState(null);
  const [isRebooking, setIsRebooking] = useState(false);
  const [finalStepReady, setFinalStepReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [showOwnerCreate, setShowOwnerCreate] = useState(false);
  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER_FORM);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerCreateError, setOwnerCreateError] = useState("");
  const [ownerCreateMessage, setOwnerCreateMessage] = useState("");
  const [showPetCreate, setShowPetCreate] = useState(false);
  const [petForm, setPetForm] = useState(EMPTY_PET_FORM);
  const [petSaving, setPetSaving] = useState(false);
  const [petCreateError, setPetCreateError] = useState("");
  const [form, setForm] = useState({
    ownerId: "",
    petId: "",
    vetId: "",
    date: "",
    slot: "",
    visitReason: "",
    serviceType: "",
    notes: "",
    status: "Pending",
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
      const [appointmentRes, petRes, vetRes, ownerData, inventoryRes] =
        await Promise.all([
          getAppointments(),
          getPets(),
          getAvailableVets(),
          fetchStaffOwners().catch(() => []),
          getInventory().catch(() => ({ data: [] })),
        ]);
      const appointmentData = appointmentRes.data || [];
      const petData = petRes.data || [];
      const ownersFromPets = petData.map((pet) => pet.owner).filter(Boolean);
      const ownersFromAppointments = appointmentData
        .map((appointment) => appointment.owner || appointment.pet?.owner)
        .filter(Boolean);

      setAppointments(appointmentData);
      setPets(petData);
      setVets(vetRes.data || []);
      setOwners(
        mergeOwnerOptions(ownerData, ownersFromPets, ownersFromAppointments),
      );
      setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
    } catch (err) {
      handleApiError(err, "Failed to load appointments");
    } finally {
      setLoading(false);
    }
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
      setSlots([]);
      handleApiError(err, "Failed to fetch available slots");
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

  useEffect(() => {
    if (!showModal || bookingStep !== FINAL_BOOKING_STEP_INDEX) {
      setFinalStepReady(true);
      return undefined;
    }

    setFinalStepReady(false);
    const timer = window.setTimeout(() => {
      setFinalStepReady(true);
    }, FINAL_STEP_SUBMIT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [bookingStep, showModal]);

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setIsRebooking(false);
    setFinalStepReady(true);
    setSaving(false);
    setBookingStep(0);
    setPendingPastDueDate("");
    setPendingPastDueAppointment(null);
    setShowOwnerCreate(false);
    setOwnerForm(EMPTY_OWNER_FORM);
    setOwnerSaving(false);
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    setShowPetCreate(false);
    setPetForm(EMPTY_PET_FORM);
    setPetSaving(false);
    setPetCreateError("");
    setSlots([]);
    setSlotsLoading(false);
    setError("");
  };

  const openCreate = ({ date = "" } = {}) => {
    const nextCalendarDate = date ? new Date(`${date}T00:00:00`) : new Date();
    setCancelledAppointment(null);
    setConfirmedAppointment(null);
    setCompletedAppointment(null);
    setPendingAppointment(null);
    setRebookedAppointment(null);
    setPendingPastDueDate("");
    setPendingPastDueAppointment(null);
    setEditing(null);
    setIsRebooking(false);
    setIsSelectingDate(false);
    setDraftAvailableDateKeys([]);
    setShowAvailabilityConfirm(false);
    setQueueDateKey("");
    setBookingCalendarDate(nextCalendarDate);
    setFinalStepReady(true);
    setBookingStep(0);
    setShowOwnerCreate(false);
    setOwnerForm(EMPTY_OWNER_FORM);
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    setShowPetCreate(false);
    setPetForm(EMPTY_PET_FORM);
    setPetCreateError("");
    setForm({
      ownerId: "",
      petId: "",
      vetId: vets[0]?.id || "",
      date,
      slot: "",
      visitReason: "",
      serviceType: "",
      notes: "",
      status: "Pending",
    });
    setSlots([]);
    setSlotsLoading(false);
    setError("");
    setShowModal(true);
  };

  const startDateSelection = () => {
    setViewMode("calendar");
    setDraftAvailableDateKeys([]);
    setDateSelectionMode("single");
    setShowAvailabilityConfirm(false);
    setIsSelectingDate(true);
    setError("");
  };

  const toggleDraftAvailableDate = (dateKey) => {
    if (isPastDateValue(dateKey)) {
      setError(
        "Due dates cannot be selected. Please choose today or a future date.",
      );
      return;
    }
    if (availableDateKeys.includes(dateKey)) {
      setError("");
      return;
    }

    setError("");
    if (dateSelectionMode === "single") {
      setDraftAvailableDateKeys([dateKey]);
      setShowAvailabilityConfirm(true);
      return;
    }

    setDraftAvailableDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((savedDateKey) => savedDateKey !== dateKey)
        : normalizeDateKeyList([...current, dateKey]),
    );
  };

  const requestAvailabilityConfirmation = () => {
    if (draftAvailableDateKeys.length === 0) {
      setError("Please select at least one non-due date.");
      return;
    }

    setError("");
    setShowAvailabilityConfirm(true);
  };

  const confirmAvailableDates = () => {
    const normalizedDateKeys = normalizeDateKeyList([
      ...availableDateKeys,
      ...draftAvailableDateKeys,
    ]);
    setAvailableDateKeys(normalizedDateKeys);
    saveStoredAvailableDates(normalizedDateKeys);
    setDraftAvailableDateKeys([]);
    setShowAvailabilityConfirm(false);
    setIsSelectingDate(false);
    setError("");
  };

  const cancelAvailableDateSelection = () => {
    setDraftAvailableDateKeys([]);
    setShowAvailabilityConfirm(false);
    setIsSelectingDate(false);
    setError("");
  };

  const closeAvailabilityConfirmation = () => {
    setShowAvailabilityConfirm(false);
  };

  const openEdit = (appointment) => {
    setCancelledAppointment(null);
    setConfirmedAppointment(null);
    setCompletedAppointment(null);
    setPendingAppointment(null);
    setRebookedAppointment(null);
    setPendingPastDueDate("");
    setPendingPastDueAppointment(null);
    setIsRebooking(false);
    setFinalStepReady(true);
    const currentSlotIso = new Date(appointment.scheduledAt).toISOString();
    const currentDate = currentSlotIso.slice(0, 10);
    const appointmentPet =
      appointment.pet ||
      pets.find((pet) => String(pet.id) === String(appointment.petId));
    const appointmentOwner =
      appointment.owner || appointmentPet?.owner || null;
    const parsedReason = parseAppointmentReason(appointment.reason || "");

    setEditing(appointment);
    setBookingStep(0);
    setBookingCalendarDate(new Date(`${currentDate}T00:00:00`));
    setShowOwnerCreate(false);
    setOwnerForm(EMPTY_OWNER_FORM);
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    setShowPetCreate(false);
    setPetForm(EMPTY_PET_FORM);
    setPetCreateError("");
    setForm({
      ownerId:
        appointment.ownerId ||
        appointmentOwner?.id ||
        petOwnerId(appointmentPet) ||
        "",
      petId: appointment.petId || appointment.pet?.id || "",
      vetId: appointment.vetId || "",
      date: currentDate,
      slot: currentSlotIso,
      visitReason: parsedReason.visitReason,
      serviceType: parsedReason.serviceType,
      notes: appointment.notes || "",
      status: appointment.status || "Pending",
    });
    setSlots([]);
    setSlotsLoading(false);
    setError("");
    setShowModal(true);
  };

  const applyFormChange = (name, value) => {
    setForm((prev) => {
      const reset = {};
      if (name === "ownerId") {
        reset.petId = "";
        setShowPetCreate(false);
        setPetForm(EMPTY_PET_FORM);
        setPetCreateError("");
      }
      if (name === "visitReason") reset.serviceType = "";
      if (name === "vetId" || name === "date") reset.slot = "";
      return { ...prev, [name]: value, ...reset };
    });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setError("");
    if (name === "date" && isPastDateValue(value)) {
      setError(
        "Due dates cannot be selected. Please choose today or a future date.",
      );
      return;
    }
    applyFormChange(name, value);
  };

  const confirmPastDueDate = () => {
    if (pendingPastDueAppointment) {
      const appointment = pendingPastDueAppointment;
      setPendingPastDueDate("");
      setPendingPastDueAppointment(null);
      openCalendarAppointmentDetails(appointment);
      return;
    }

    applyFormChange("date", pendingPastDueDate);
    setPendingPastDueDate("");
  };

  const closePastDueConfirm = () => {
    setPendingPastDueDate("");
    setPendingPastDueAppointment(null);
  };

  const onOwnerFormChange = (e) => {
    const { name, value } = e.target;
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    setOwnerForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? normalizePhone(value) : value,
    }));
  };

  const onPetFormChange = (e) => {
    const { name, value } = e.target;
    setPetCreateError("");
    setPetForm((prev) => ({ ...prev, [name]: value }));
  };

  const isOwnerFormValid =
    ownerForm.firstName.trim() &&
    ownerForm.lastName.trim() &&
    ownerForm.username.trim() &&
    ownerForm.email.trim() &&
    isValidPhone(ownerForm.phone);

  const isPetCreateFormValid =
    petForm.name.trim() &&
    petForm.species.trim() &&
    petForm.breed.trim() &&
    String(petForm.age).trim() &&
    petForm.gender;

  const submitQuickOwner = async (e) => {
    e.preventDefault();
    if (!isOwnerFormValid) {
      setOwnerCreateError(
        isValidPhone(ownerForm.phone)
          ? "Please complete the required owner fields."
          : "Phone number must be 11 digits and start with 09.",
      );
      return;
    }

    setOwnerSaving(true);
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    try {
      const payload = {
        firstName: ownerForm.firstName.trim(),
        lastName: ownerForm.lastName.trim(),
        username: ownerForm.username.trim(),
        email: ownerForm.email.trim(),
        phone: normalizePhone(ownerForm.phone),
        address: ownerForm.address.trim(),
      };
      const result = await createStaffClient({
        ...payload,
        password: generateTemporaryPassword(),
        role: "pet_owner",
      });
      const createdOwner = result.data?.user || result.data || payload;
      const ownerWithRole = { ...createdOwner, ...payload, role: "pet_owner" };

      try {
        await requestPasswordReset(payload.email);
        setOwnerCreateMessage("Owner added and activation link sent.");
      } catch {
        setOwnerCreateMessage("Owner added. Activation link was not sent.");
      }

      setOwners((prev) => mergeOwnerOptions(prev, [ownerWithRole]));
      setForm((prev) => ({
        ...prev,
        ownerId: ownerWithRole.id || createdOwner.id || "",
        petId: "",
      }));
      setOwnerForm(EMPTY_OWNER_FORM);
      setShowOwnerCreate(false);
      setShowPetCreate(true);
      setPetForm(EMPTY_PET_FORM);
    } catch (err) {
      setOwnerCreateError(
        err.response?.data?.message || "Failed to add pet owner.",
      );
    } finally {
      setOwnerSaving(false);
    }
  };

  const submitQuickPet = async (e) => {
    e.preventDefault();
    if (!form.ownerId) {
      setPetCreateError("Select a pet owner first.");
      return;
    }
    if (!isPetCreateFormValid) {
      setPetCreateError("Please complete the required pet fields.");
      return;
    }

    setPetSaving(true);
    setPetCreateError("");
    try {
      const payload = {
        name: petForm.name.trim(),
        species: petForm.species.trim(),
        breed: petForm.breed.trim(),
        age: petForm.age === "" ? null : Number(petForm.age),
        gender: petForm.gender,
        status: petForm.status || "Healthy",
        notes: petForm.notes.trim(),
        ownerId: form.ownerId,
      };
      const result = await createPet(payload);
      const createdPet = {
        ...(result.data?.pet || result.data || {}),
        ...payload,
        owner: selectedOwner || undefined,
      };

      setPets((prev) => [createdPet, ...prev]);
      setForm((prev) => ({ ...prev, petId: createdPet.id || "" }));
      setPetForm(EMPTY_PET_FORM);
      setShowPetCreate(false);
    } catch (err) {
      setPetCreateError(
        err.response?.data?.message || "Failed to add pet profile.",
      );
    } finally {
      setPetSaving(false);
    }
  };

  const getStepError = (step = bookingStep) => {
    if (step === 0 && !form.ownerId) return "Please select a pet owner.";
    if (step === 1 && !form.petId) return "Please select a pet.";
    if (step === 2 && (!form.visitReason || !form.serviceType)) {
      return "Please select a visit reason and service.";
    }
    if (step === 3) {
      if (!form.vetId) return "Please select a veterinarian.";
      if (!editing && availableDateKeys.length === 0) {
        return "No available appointment dates yet. Please make a date available first.";
      }
      if (!form.date) return "Please select an available appointment date.";
      if (!editing && !availableDateKeys.includes(form.date)) {
        return "Please choose a date marked available by the clinic.";
      }
      if (!form.slot) return "Please select an available time slot.";
    }
    return "";
  };

  const goNextStep = () => {
    const stepError = getStepError();
    if (stepError) {
      setError(stepError);
      return;
    }
    setError("");
    setBookingStep((step) => Math.min(step + 1, FINAL_BOOKING_STEP_INDEX));
  };

  const goBackStep = () => {
    setError("");
    setBookingStep((step) => Math.max(step - 1, 0));
  };

  const validateAllSteps = () => {
    for (let step = 0; step < BOOKING_STEPS.length; step += 1) {
      const stepError = getStepError(step);
      if (stepError) {
        setBookingStep(step);
        setError(stepError);
        return false;
      }
    }
    return true;
  };

  const submitAppointment = async () => {
    if (bookingStep < FINAL_BOOKING_STEP_INDEX) {
      goNextStep();
      return;
    }
    if (!finalStepReady) return;
    if (!validateAllSteps()) return;

    setSaving(true);
    setError("");
    const assembledReason = `${form.visitReason}${REASON_SEPARATOR}${form.serviceType}`;
    let rebookConfirmation = null;
    try {
      if (editing) {
        await updateAppointment(editing.id, {
          ownerId: form.ownerId,
          petId: form.petId,
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: assembledReason,
          notes: form.notes,
          status: form.status,
        });
      } else {
        const createPayload = {
          ownerId: form.ownerId,
          petId: form.petId,
          vetId: form.vetId,
          scheduledAt: form.slot,
          reason: assembledReason,
          notes: form.notes,
          ...(isRebooking ? { status: "Confirmed" } : {}),
        };
        const result = await createAppointment(createPayload);

        if (isRebooking) {
          rebookConfirmation = {
            ...(result.data?.appointment || result.data || {}),
            ...createPayload,
            owner: selectedOwner || undefined,
            pet: selectedPet || undefined,
            vet: selectedVet || undefined,
          };
        }
      }
      closeModal();
      if (rebookConfirmation) {
        setRebookedAppointment(rebookConfirmation);
      }
      await loadData();
    } catch (err) {
      handleApiError(err, "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (bookingStep < FINAL_BOOKING_STEP_INDEX) {
      goNextStep();
    }
  };

  const handleDelete = async (
    appointment,
    { skipPrompt = false, showCancelledPopup = false } = {},
  ) => {
    if (!skipPrompt && !window.confirm("Cancel this appointment?")) return;
    const cancelPayload = {
      status: "Cancelled",
    };

    try {
      await updateAppointment(appointment.id, cancelPayload);
      await loadData();
      setPendingAppointment(null);
      setPendingPastDueAppointment(null);
      if (showCancelledPopup) {
        setConfirmedAppointment(null);
        setCompletedAppointment(null);
        setCancelledAppointment({ ...appointment, ...cancelPayload });
      }
    } catch (err) {
      handleApiError(err, "Failed to cancel appointment");
    }
  };

  const handleConfirm = async (appointment, { showPopup = true } = {}) => {
    if (
      normalizeAppointmentStatus(appointment, "Pending") === "pending" &&
      isAppointmentPastDue(appointment)
    ) {
      setPendingAppointment(appointment);
      setError("Past due pending appointments cannot be confirmed.");
      return;
    }

    try {
      await updateAppointment(appointment.id, { status: "Confirmed" });
      await loadData();
      setPendingAppointment(null);
      setCompletedAppointment(null);
      setCancelledAppointment(null);
      setRebookedAppointment(null);
      if (showPopup) {
        setConfirmedAppointment({ ...appointment, status: "Confirmed" });
      }
    } catch (err) {
      handleApiError(err, "Failed to confirm appointment");
    }
  };

  const handleComplete = async (appointment, { showPopup = true } = {}) => {
    try {
      await updateAppointment(appointment.id, { status: "Completed" });
      await loadData();
      setPendingAppointment(null);
      setConfirmedAppointment(null);
      setCancelledAppointment(null);
      setRebookedAppointment(null);
      if (showPopup) {
        setCompletedAppointment({ ...appointment, status: "Completed" });
      }
    } catch (err) {
      handleApiError(err, "Failed to mark appointment as complete");
    }
  };

  const openRebook = (appointment) => {
    setCancelledAppointment(null);
    setConfirmedAppointment(null);
    setCompletedAppointment(null);
    setPendingAppointment(null);
    setRebookedAppointment(null);
    const appointmentPet =
      appointment.pet ||
      pets.find((pet) => String(pet.id) === String(appointment.petId));
    const appointmentOwner =
      appointment.owner || appointmentPet?.owner || null;
    const parsedReason = parseAppointmentReason(appointment.reason || "");
    const ownerId =
      appointment.ownerId ||
      appointmentOwner?.id ||
      petOwnerId(appointmentPet) ||
      "";
    const petId = appointment.petId || appointmentPet?.id || "";

    if (appointmentOwner?.id) {
      setOwners((prev) => mergeOwnerOptions(prev, [appointmentOwner]));
    }
    if (appointmentPet?.id) {
      setPets((prev) =>
        prev.some((pet) => String(pet.id) === String(appointmentPet.id))
          ? prev
          : [{ ...appointmentPet, ownerId, owner: appointmentOwner }, ...prev],
      );
    }

    setEditing(null);
    setIsRebooking(true);
    setBookingCalendarDate(new Date());
    setFinalStepReady(true);
    setBookingStep(
      parsedReason.visitReason && parsedReason.serviceType ? 3 : 2,
    );
    setShowOwnerCreate(false);
    setOwnerForm(EMPTY_OWNER_FORM);
    setOwnerCreateError("");
    setOwnerCreateMessage("");
    setShowPetCreate(false);
    setPetForm(EMPTY_PET_FORM);
    setPetCreateError("");
    setForm({
      ownerId,
      petId,
      vetId: appointment.vetId || vets[0]?.id || "",
      date: "",
      slot: "",
      visitReason: parsedReason.visitReason,
      serviceType: parsedReason.serviceType,
      notes: appointment.notes || "",
      status: "Pending",
    });
    setSlots([]);
    setSlotsLoading(false);
    setError("");
    setShowModal(true);
  };

  const renderAppointmentActions = (appointment) => {
    const status = normalizeAppointmentStatus(appointment, "Pending");

    if (isNoComplianceCandidate(appointment)) {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => openRebook(appointment)}
        >
          Rebook
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button
          type="button"
          className="btn-confirm"
          onClick={() => handleConfirm(appointment)}
        >
          Confirm
        </button>
      );
    }

    if (status === "confirmed") {
      return (
        <button
          type="button"
          className="btn-complete"
          onClick={() => handleComplete(appointment)}
        >
          Mark as Complete
        </button>
      );
    }

    if (status === "cancelled") {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => openRebook(appointment)}
        >
          Rebook
        </button>
      );
    }

    if (status === "completed") {
      return <span className="no-action-text">Done</span>;
    }

    return <span className="no-action-text">None</span>;
  };

  const renderQueueAppointmentActions = (appointment) => {
    const status = normalizeAppointmentStatus(appointment, "Pending");

    if (isNoComplianceCandidate(appointment)) {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => {
            setQueueDateKey("");
            openRebook(appointment);
          }}
        >
          Rebook
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button
          type="button"
          className="btn-confirm"
          onClick={() => handleConfirm(appointment, { showPopup: false })}
        >
          Confirm
        </button>
      );
    }

    if (status === "confirmed") {
      return (
        <button
          type="button"
          className="btn-complete"
          onClick={() => handleComplete(appointment, { showPopup: false })}
        >
          Mark as Complete
        </button>
      );
    }

    if (status === "cancelled") {
      return (
        <button
          type="button"
          className="btn-rebook"
          onClick={() => {
            setQueueDateKey("");
            openRebook(appointment);
          }}
        >
          Rebook
        </button>
      );
    }

    if (status === "completed") {
      return <span className="no-action-text">Done</span>;
    }

    return <span className="no-action-text">None</span>;
  };

  const handleApptPageSizeChange = (e) => {
    setApptPageSize(Number(e.target.value));
    setApptPage(1);
  };

  const filteredAppointments = appointments.filter((a) => {
    const ownerName =
      `${a.owner?.firstName || ""} ${a.owner?.lastName || ""}`.trim() ||
      a.owner?.username ||
      "";
    const ownerUsername = a.owner?.username || "";
    const ownerEmail = a.owner?.email || "";
    const ownerPhone = a.owner?.phone || "";
    const petName = a.pet?.name || "";
    const statusDisplay = getAppointmentStatusDisplay(a);
    const query = search.trim().toLowerCase();
    const matchSearch =
      !query ||
      petName.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      ownerUsername.toLowerCase().includes(query) ||
      ownerEmail.toLowerCase().includes(query) ||
      ownerPhone.toLowerCase().includes(query) ||
      (a.status || "").toLowerCase().includes(query) ||
      statusDisplay.label.toLowerCase().includes(query);
    if (!matchSearch) return false;
    if (
      apptStatusFilter === "Due" &&
      !isPastDateValue(getLocalDateKey(new Date(a.scheduledAt)))
    ) {
      return false;
    }
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
    if (apptVetFilter && a.vetId !== apptVetFilter) return false;
    if (apptDateFrom && new Date(a.scheduledAt) < new Date(apptDateFrom)) return false;
    if (apptDateTo && new Date(a.scheduledAt) > new Date(apptDateTo + "T23:59:59")) return false;
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
  const visibleNonDueDateKeys = days
    .map((day) => getLocalDateKey(new Date(selectedYear, selectedMonth, day)))
    .filter((dateKey) => !isPastDateValue(dateKey));
  const visibleBlankDateKeys = visibleNonDueDateKeys.filter(
    (dateKey) => !availableDateKeys.includes(dateKey),
  );
  const selectedDateKeysInView = draftAvailableDateKeys.filter((dateKey) =>
    visibleBlankDateKeys.includes(dateKey),
  );
  const allVisibleDatesSelected =
    visibleBlankDateKeys.length > 0 &&
    visibleBlankDateKeys.every((dateKey) =>
      draftAvailableDateKeys.includes(dateKey),
    );
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
  const hasAvailableAppointmentDates = availableDateKeys.length > 0;
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
      !availableDateKeys.includes(dateKey) &&
      (!editing || editingDateKey !== dateKey)
    ) {
      return;
    }

    setError("");
    setBookingCalendarDate(new Date(`${dateKey}T00:00:00`));
    applyFormChange("date", dateKey);
  };

  const toggleAllVisibleAvailableDates = () => {
    if (!visibleBlankDateKeys.length) return;

    setError("");
    setDateSelectionMode("multiple");
    setDraftAvailableDateKeys((current) =>
      normalizeDateKeyList([...current, ...visibleBlankDateKeys]),
    );
  };

  const openCalendarAppointmentDetails = (appointment) => {
    const status = normalizeAppointmentStatus(appointment);

    if (status === "cancelled") {
      setConfirmedAppointment(null);
      setCompletedAppointment(null);
      setPendingAppointment(null);
      setPendingPastDueDate("");
      setPendingPastDueAppointment(null);
      setCancelledAppointment(appointment);
      return;
    }

    if (status === "confirmed") {
      setCancelledAppointment(null);
      setCompletedAppointment(null);
      setPendingAppointment(null);
      setPendingPastDueDate("");
      setPendingPastDueAppointment(null);
      setConfirmedAppointment(appointment);
      return;
    }

    if (status === "completed") {
      setCancelledAppointment(null);
      setConfirmedAppointment(null);
      setPendingAppointment(null);
      setPendingPastDueDate("");
      setPendingPastDueAppointment(null);
      setCompletedAppointment(appointment);
      return;
    }

    if (status === "pending") {
      setCancelledAppointment(null);
      setConfirmedAppointment(null);
      setCompletedAppointment(null);
      setPendingPastDueDate("");
      setPendingPastDueAppointment(null);
      setPendingAppointment(appointment);
      return;
    }

    openEdit(appointment);
  };

  const openCalendarAppointment = (appointment) => {
    const status = normalizeAppointmentStatus(appointment);

    if (status === "completed") {
      openCalendarAppointmentDetails(appointment);
      return;
    }

    openCalendarAppointmentDetails(appointment);
  };

  const onCalendarDayKeyDown = (e, dateKey, dayAppointments = []) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isSelectingDate) {
        toggleDraftAvailableDate(dateKey);
        return;
      }
      if (dayAppointments.length > 0) {
        openAppointmentQueue(dateKey);
      }
    }
  };

  const openAppointmentQueue = (dateKey) => {
    setQueueDateKey(dateKey);
    setCancelledAppointment(null);
    setConfirmedAppointment(null);
    setCompletedAppointment(null);
    setPendingAppointment(null);
    setPendingPastDueDate("");
    setPendingPastDueAppointment(null);
  };

  const currentOwnerOption =
    editing &&
    form.ownerId &&
    !owners.some((owner) => String(owner.id) === String(form.ownerId))
      ? {
          ...(editing.owner || {}),
          id: form.ownerId,
          username:
            ownerDisplayName(editing.owner || editing.pet?.owner) ||
            "Current owner",
          isCurrent: true,
        }
      : null;
  const ownerOptions = currentOwnerOption
    ? [currentOwnerOption, ...owners]
    : owners;
  const selectedOwner =
    ownerOptions.find((owner) => String(owner.id) === String(form.ownerId)) ||
    null;
  const ownerPets = form.ownerId
    ? pets.filter((pet) => String(petOwnerId(pet)) === String(form.ownerId))
    : [];
  const currentPetOption =
    editing &&
    form.petId &&
    !ownerPets.some((pet) => String(pet.id) === String(form.petId))
      ? {
          id: form.petId,
          ownerId: form.ownerId,
          name: editing.pet?.name || "Current pet",
          species: editing.pet?.species || "Unknown",
          isCurrent: true,
        }
      : null;
  const petOptions = currentPetOption ? [currentPetOption, ...ownerPets] : ownerPets;
  const selectedPet =
    petOptions.find((pet) => String(pet.id) === String(form.petId)) || null;
  const selectedVet =
    vets.find((vet) => String(vet.id) === String(form.vetId)) || null;
  const selectedSlot = slots.find((slot) => slot.startsAt === form.slot);
  const selectedReasonConfig = VISIT_REASONS[form.visitReason];
  const serviceGroups = getVisitServiceGroups(form.visitReason);
  const reasonSummary =
    form.visitReason && form.serviceType
      ? `${form.visitReason}${REASON_SEPARATOR}${form.serviceType}`
      : "";
  const activeInventory = inventory.filter((item) => !item.isArchived);
  const vaccineInventory = activeInventory.filter((item) => {
    const haystack = `${item.name || ""} ${item.category || ""} ${item.notes || ""}`.toLowerCase();
    return haystack.includes("vaccin") || haystack.includes("rabies");
  });
  const serviceWords = form.serviceType
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  const matchedVaccineInventory = vaccineInventory.filter((item) => {
    if (!serviceWords.length) return true;
    const haystack = `${item.name || ""} ${item.category || ""} ${item.notes || ""}`.toLowerCase();
    return serviceWords.some((word) => haystack.includes(word));
  });
  const vaccineInventoryPreview =
    form.visitReason === "Vaccination"
      ? (matchedVaccineInventory.length ? matchedVaccineInventory : vaccineInventory).slice(0, 4)
      : [];
  const pastDueConfirmDate =
    pendingPastDueDate ||
    (pendingPastDueAppointment
      ? getLocalDateKey(new Date(pendingPastDueAppointment.scheduledAt))
      : "");
  const isPendingAppointmentPastDue = isAppointmentPastDue(pendingAppointment);
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
                onClick={() => {
                  setViewMode("list");
                  cancelAvailableDateSelection();
                }}
              >
                List View
              </button>
            </div>
            <div className="appointment-actions">
              {viewMode === "calendar" && (
                <button
                  className={`select-date-btn ${isSelectingDate ? "active" : ""}`}
                  type="button"
                  onClick={startDateSelection}
                  aria-pressed={isSelectingDate}
                >
                  Select Date
                </button>
              )}
              <button
                className="add-apt-btn"
                type="button"
                onClick={() => openCreate()}
              >
                + Book Appointment
              </button>
            </div>
          </div>

          {viewMode === "calendar" && isSelectingDate && (
            <div className="date-availability-toolbar">
              <div className="date-availability-options">
                <button
                  type="button"
                  className={`date-option-btn ${
                    dateSelectionMode === "single" ? "active" : ""
                  }`}
                  onClick={() => {
                    setDateSelectionMode("single");
                    setDraftAvailableDateKeys([]);
                    setShowAvailabilityConfirm(false);
                    setError("");
                  }}
                >
                  Select One
                </button>
                <button
                  type="button"
                  className={`date-option-btn ${
                    dateSelectionMode === "multiple" ? "active" : ""
                  }`}
                  onClick={() => {
                    setDateSelectionMode("multiple");
                    setShowAvailabilityConfirm(false);
                    setError("");
                  }}
                >
                  Select Multiple
                </button>
                <button
                  type="button"
                  className={`date-option-btn ${
                    allVisibleDatesSelected ? "active" : ""
                  }`}
                  onClick={toggleAllVisibleAvailableDates}
                  disabled={!visibleBlankDateKeys.length}
                >
                  Select All This Month
                </button>
              </div>
              <span className="date-selection-count">
                {selectedDateKeysInView.length} of {visibleBlankDateKeys.length}{" "}
                dates selected
              </span>
              <div className="date-confirm-actions">
                <button
                  type="button"
                  className="step-back-btn"
                  onClick={cancelAvailableDateSelection}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={requestAvailabilityConfirmation}
                >
                  Make Date Available
                </button>
              </div>
            </div>
          )}

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
                  <div className="calendar-picker" aria-label="Calendar date">
                    <label>
                      <span>Month</span>
                      <select
                        value={selectedMonth}
                        onChange={onCalendarMonthChange}
                        aria-label="Choose calendar month"
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Year</span>
                      <select
                        value={selectedYear}
                        onChange={onCalendarYearChange}
                        aria-label="Choose calendar year"
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
                  const isPastDay = dayDate < todayStart;
                  const dayKey = getLocalDateKey(dayDate);
                  const isDraftSelected =
                    draftAvailableDateKeys.includes(dayKey);
                  const isConfirmedAvailable =
                    availableDateKeys.includes(dayKey);
                  const isMarkedAvailableDay =
                    isDraftSelected || isConfirmedAvailable;
                  const isDateSelectable =
                    isSelectingDate && !isPastDay && !isConfirmedAvailable;
                  const dayAppointments = filteredAppointments
                    .filter((appointment) => {
                      const scheduled = new Date(appointment.scheduledAt);
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
                  const isQueueClickable =
                    !isSelectingDate && dayAppointments.length > 0;

                  return (
                    <div
                      key={d}
                      className={`calendar-day ${isPastDay ? "past-due" : ""} ${
                        isDateSelectable ? "date-selectable" : ""
                      } ${isMarkedAvailableDay ? "available-selected" : ""} ${
                        isDraftSelected ? "draft-selected" : ""
                      } ${isQueueClickable ? "appointment-queue-day" : ""}`}
                      title={
                        isPastDay
                          ? "Past due date"
                          : isConfirmedAvailable
                            ? "Already available"
                            : isSelectingDate
                              ? "Select this date"
                              : isQueueClickable
                                ? "View appointment queue"
                                : undefined
                      }
                      role={
                        isDateSelectable || isQueueClickable
                          ? "button"
                          : undefined
                      }
                      tabIndex={
                        isDateSelectable || isQueueClickable ? 0 : undefined
                      }
                      aria-disabled={
                        isSelectingDate && (isPastDay || isConfirmedAvailable)
                          ? "true"
                          : undefined
                      }
                      aria-pressed={
                        isDateSelectable ? isDraftSelected : undefined
                      }
                      onClick={() => {
                        if (isDateSelectable) {
                          toggleDraftAvailableDate(dayKey);
                          return;
                        }
                        if (isQueueClickable) {
                          openAppointmentQueue(dayKey);
                        }
                      }}
                      onKeyDown={(e) =>
                        onCalendarDayKeyDown(e, dayKey, dayAppointments)
                      }
                    >
                      <span className="day-num">{d}</span>
                      {(isPastDay ||
                        isMarkedAvailableDay ||
                        dayAppointments.length > 0) && (
                        <div className="date-status-row">
                          {isPastDay ? (
                            <span className="date-state-badge due">Due</span>
                          ) : (
                            isMarkedAvailableDay && (
                              <span className="date-state-badge available">
                                {isDraftSelected ? "Selected" : "Available"}
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
                    Search by name, email, or phone and choose how many
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
                    placeholder="Search by name, email, or phone..."
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
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Cancelled Due to No Compliance">
                      Cancelled Due to No Compliance
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
                    {vets.map((v) => (
                      <option key={v.id} value={v.id}>
                        {`${v.firstName || ""} ${v.lastName || ""}`.trim() ||
                          v.username}
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
                <p className="list-placeholder">No appointments found.</p>
              ) : (
                <>
                  <div className="table-desktop">
                    <table className="appointment-table">
                      <thead>
                        <tr>
                          <th>Pet</th>
                          <th>Pet Owner</th>
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

                          return (
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

                      return (
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

      {rebookedAppointment &&
        (() => {
          const rebookedVet =
            rebookedAppointment.vet ||
            vets.find(
              (vet) => String(vet.id) === String(rebookedAppointment.vetId),
            );
          const rebookedVetName =
            rebookedVet
              ? `${rebookedVet.firstName || ""} ${rebookedVet.lastName || ""}`.trim() ||
                rebookedVet.username
              : "-";

          return (
            <div
              className="modal-overlay"
              onClick={() => setRebookedAppointment(null)}
            >
              <div
                className="modal-box rebooked-appointment-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="rebooked-appointment-badge">
                  Rebook Confirmed
                </span>
                <h3>Rebook Confirmed</h3>
                <p className="rebooked-appointment-copy">
                  The rebooked appointment has been confirmed and sent to the
                  pet owner and veterinarian.
                </p>

                <div className="rebooked-appointment-details">
                  <div>
                    <span>Pet</span>
                    <strong>{rebookedAppointment.pet?.name || "-"}</strong>
                  </div>
                  <div>
                    <span>Pet Owner</span>
                    <strong>
                      {ownerDisplayName(
                        rebookedAppointment.owner ||
                          rebookedAppointment.pet?.owner,
                      ) || "-"}
                    </strong>
                  </div>
                  <div>
                    <span>Veterinarian</span>
                    <strong>{rebookedVetName}</strong>
                  </div>
                  <div>
                    <span>Date and Time</span>
                    <strong>
                      {new Date(
                        rebookedAppointment.scheduledAt,
                      ).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span>Reason</span>
                    <strong>{rebookedAppointment.reason || "-"}</strong>
                  </div>
                </div>

                <div className="modal-actions rebooked-appointment-actions">
                  <button
                    type="button"
                    className="save-btn rebooked-done-btn"
                    onClick={() => setRebookedAppointment(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {pendingAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setPendingAppointment(null)}
        >
          <div
            className="modal-box pending-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`pending-appointment-badge ${
                isPendingAppointmentPastDue ? "no-compliance" : ""
              }`}
            >
              {isPendingAppointmentPastDue
                ? "Cancelled Due to No Compliance"
                : "Pending"}
            </span>
            <h3>
              {isPendingAppointmentPastDue
                ? "Cancelled Due to No Compliance"
                : "Pending Appointment"}
            </h3>
            <p className="pending-appointment-copy">
              {isPendingAppointmentPastDue
                ? "This appointment passed without compliance. Rebook it to choose a new schedule."
                : "This appointment is waiting for action. Confirm it to notify the pet owner and vet, cancel it, or rebook a new schedule."}
            </p>

            <div className="pending-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{pendingAppointment.pet?.name || "-"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>
                  {ownerDisplayName(
                    pendingAppointment.owner || pendingAppointment.pet?.owner,
                  ) || "-"}
                </strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(pendingAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{pendingAppointment.reason || "-"}</strong>
              </div>
            </div>

            <div className="modal-actions pending-appointment-actions">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setPendingAppointment(null)}
              >
                Back
              </button>
              {isPendingAppointmentPastDue ? (
                <button
                  type="button"
                  className="btn-rebook"
                  onClick={() => openRebook(pendingAppointment)}
                >
                  Rebook
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => handleConfirm(pendingAppointment)}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() =>
                      handleDelete(pendingAppointment, {
                        skipPrompt: true,
                        showCancelledPopup: true,
                      })
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-rebook"
                    onClick={() => openRebook(pendingAppointment)}
                  >
                    Rebook
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmedAppointment &&
        (() => {
          const confirmedVet =
            confirmedAppointment.vet ||
            vets.find(
              (vet) => String(vet.id) === String(confirmedAppointment.vetId),
            );
          const confirmedVetName =
            confirmedVet
              ? `${confirmedVet.firstName || ""} ${confirmedVet.lastName || ""}`.trim() ||
                confirmedVet.username
              : "-";
          const isConfirmedPastDue =
            isNoComplianceCandidate(confirmedAppointment);

          return (
            <div
              className="modal-overlay"
              onClick={() => setConfirmedAppointment(null)}
            >
              <div
                className="modal-box confirmed-appointment-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className={`confirmed-appointment-badge ${
                    isConfirmedPastDue ? "no-compliance" : ""
                  }`}
                >
                  {isConfirmedPastDue
                    ? "Cancelled Due to No Compliance"
                    : "Confirmed"}
                </span>
                <h3>
                  {isConfirmedPastDue
                    ? "Cancelled Due to No Compliance"
                    : "Appointment Confirmed"}
                </h3>
                <p className="confirmed-appointment-copy">
                  {isConfirmedPastDue
                    ? "This appointment passed without compliance. Rebook it to choose a new schedule."
                    : "This appointment is confirmed. Mark it complete when the visit is done."}
                </p>

                <div className="confirmed-appointment-details">
                  <div>
                    <span>Pet</span>
                    <strong>{confirmedAppointment.pet?.name || "-"}</strong>
                  </div>
                  <div>
                    <span>Pet Owner</span>
                    <strong>
                      {ownerDisplayName(
                        confirmedAppointment.owner ||
                          confirmedAppointment.pet?.owner,
                      ) || "-"}
                    </strong>
                  </div>
                  <div>
                    <span>Veterinarian</span>
                    <strong>{confirmedVetName}</strong>
                  </div>
                  <div>
                    <span>Date and Time</span>
                    <strong>
                      {new Date(
                        confirmedAppointment.scheduledAt,
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="modal-actions confirmed-appointment-actions">
                  <button
                    type="button"
                    className="step-back-btn"
                    onClick={() => setConfirmedAppointment(null)}
                  >
                    Back
                  </button>
                  {isConfirmedPastDue ? (
                    <button
                      type="button"
                      className="btn-rebook"
                      onClick={() => openRebook(confirmedAppointment)}
                    >
                      Rebook
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-complete"
                      onClick={() => handleComplete(confirmedAppointment)}
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {completedAppointment &&
        (() => {
          const completedVet =
            completedAppointment.vet ||
            vets.find(
              (vet) => String(vet.id) === String(completedAppointment.vetId),
            );
          const completedVetName =
            completedVet
              ? `${completedVet.firstName || ""} ${completedVet.lastName || ""}`.trim() ||
                completedVet.username
              : "-";

          return (
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
                    <strong>{completedAppointment.pet?.name || "-"}</strong>
                  </div>
                  <div>
                    <span>Pet Owner</span>
                    <strong>
                      {ownerDisplayName(
                        completedAppointment.owner ||
                          completedAppointment.pet?.owner,
                      ) || "-"}
                    </strong>
                  </div>
                  <div>
                    <span>Veterinarian</span>
                    <strong>{completedVetName}</strong>
                  </div>
                  <div>
                    <span>Date and Time</span>
                    <strong>
                      {new Date(
                        completedAppointment.scheduledAt,
                      ).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span>Reason</span>
                    <strong>{completedAppointment.reason || "-"}</strong>
                  </div>
                </div>

                <div className="modal-actions completed-appointment-actions">
                  <button
                    type="button"
                    className="step-back-btn"
                    onClick={() => setCompletedAppointment(null)}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {cancelledAppointment && (
        <div
          className="modal-overlay"
          onClick={() => setCancelledAppointment(null)}
        >
          <div
            className="modal-box cancelled-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`cancelled-appointment-badge ${
                isNoComplianceCancelled(cancelledAppointment)
                  ? "no-compliance"
                  : ""
              }`}
            >
              {isNoComplianceCancelled(cancelledAppointment)
                ? "Cancelled Due to No Compliance"
                : "Cancelled"}
            </span>
            <h3>
              {isNoComplianceCancelled(cancelledAppointment)
                ? "Cancelled Due to No Compliance"
                : "Cancelled Appointment"}
            </h3>
            <p className="cancelled-appointment-copy">
              {isNoComplianceCancelled(cancelledAppointment)
                ? "This appointment was cancelled due to no compliance. Rebook it to choose a new date and time."
                : "This appointment has been cancelled and cannot be edited from the calendar. Rebook it to choose a new date and time."}
            </p>

            <div className="cancelled-appointment-details">
              <div>
                <span>Pet</span>
                <strong>{cancelledAppointment.pet?.name || "-"}</strong>
              </div>
              <div>
                <span>Pet Owner</span>
                <strong>
                  {ownerDisplayName(
                    cancelledAppointment.owner ||
                      cancelledAppointment.pet?.owner,
                  ) || "-"}
                </strong>
              </div>
              <div>
                <span>Date and Time</span>
                <strong>
                  {new Date(cancelledAppointment.scheduledAt).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Reason</span>
                <strong>{cancelledAppointment.reason || "-"}</strong>
              </div>
            </div>

            <div className="modal-actions cancelled-appointment-actions">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setCancelledAppointment(null)}
              >
                Back
              </button>
              <button
                type="button"
                className="save-btn cancelled-rebook-btn"
                onClick={() => openRebook(cancelledAppointment)}
              >
                Rebook
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form
              className="user-modal-form appointment-booking-form"
              onSubmit={onSubmit}
            >
              <h3>{editing ? "Edit Appointment" : "Book Appointment"}</h3>

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
                    <div className="form-group">
                      <label>Pet Owner</label>
                      <select
                        name="ownerId"
                        value={form.ownerId}
                        onChange={onChange}
                        required
                      >
                        <option value="">Select pet owner</option>
                        {ownerOptions.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {ownerDisplayName(owner)}
                            {owner.isCurrent ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="quick-create-toolbar">
                      <button
                        type="button"
                        className="quick-create-toggle"
                        onClick={() => {
                          setShowOwnerCreate((current) => !current);
                          setOwnerCreateError("");
                          setOwnerCreateMessage("");
                        }}
                      >
                        {showOwnerCreate ? "Hide Add Owner" : "+ Add Pet Owner"}
                      </button>
                    </div>
                    {showOwnerCreate && (
                      <div
                        className="quick-create-panel"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                      >
                        <div className="form-row">
                          <div className="form-group">
                            <label>First Name</label>
                            <input
                              name="firstName"
                              value={ownerForm.firstName}
                              onChange={onOwnerFormChange}
                              placeholder="First name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Last Name</label>
                            <input
                              name="lastName"
                              value={ownerForm.lastName}
                              onChange={onOwnerFormChange}
                              placeholder="Last name"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Username</label>
                            <input
                              name="username"
                              value={ownerForm.username}
                              onChange={onOwnerFormChange}
                              placeholder="Username"
                            />
                          </div>
                          <div className="form-group">
                            <label>Email</label>
                            <input
                              type="email"
                              name="email"
                              value={ownerForm.email}
                              onChange={onOwnerFormChange}
                              placeholder="Email"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Phone</label>
                            <input
                              name="phone"
                              value={ownerForm.phone}
                              onChange={onOwnerFormChange}
                              placeholder="09XXXXXXXXX"
                            />
                          </div>
                          <div className="form-group">
                            <label>Address</label>
                            <input
                              name="address"
                              value={ownerForm.address}
                              onChange={onOwnerFormChange}
                              placeholder="Address"
                            />
                          </div>
                        </div>
                        {ownerCreateError && (
                          <p className="modal-error">{ownerCreateError}</p>
                        )}
                        <div className="quick-create-actions">
                          <button
                            type="button"
                            className="step-back-btn"
                            onClick={() => {
                              setShowOwnerCreate(false);
                              setOwnerForm(EMPTY_OWNER_FORM);
                              setOwnerCreateError("");
                            }}
                            disabled={ownerSaving}
                          >
                            Cancel Add
                          </button>
                          <button
                            type="button"
                            className="save-btn"
                            onClick={submitQuickOwner}
                            disabled={ownerSaving || !isOwnerFormValid}
                          >
                            {ownerSaving ? "Adding..." : "Save Owner"}
                          </button>
                        </div>
                      </div>
                    )}
                    {ownerCreateMessage && (
                      <p className="appointment-success-hint">
                        {ownerCreateMessage}
                      </p>
                    )}
                    {selectedOwner && (
                      <div className="appointment-summary compact">
                        <div>
                          <span>Owner</span>
                          <strong>{ownerDisplayName(selectedOwner)}</strong>
                        </div>
                        {selectedOwner.phone && (
                          <div>
                            <span>Phone</span>
                            <strong>{selectedOwner.phone}</strong>
                          </div>
                        )}
                        {selectedOwner.email && (
                          <div>
                            <span>Email</span>
                            <strong>{selectedOwner.email}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {bookingStep === 1 && (
                  <>
                    <div className="form-group">
                      <label>Specific Pet</label>
                      <select
                        name="petId"
                        value={form.petId}
                        onChange={onChange}
                        required
                        disabled={!form.ownerId}
                      >
                        <option value="">
                          {form.ownerId ? "Select specific pet" : "Select owner first"}
                        </option>
                        {petOptions.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {petDisplayName(pet)}
                            {pet.isCurrent ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.ownerId && (
                      <div className="quick-create-toolbar">
                        <button
                          type="button"
                          className="quick-create-toggle"
                          onClick={() => {
                            setShowPetCreate((current) => !current);
                            setPetCreateError("");
                          }}
                        >
                          {showPetCreate ? "Hide Add Pet" : "+ Add Pet"}
                        </button>
                      </div>
                    )}
                    {form.ownerId && showPetCreate && (
                      <div
                        className="quick-create-panel"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                      >
                        <div className="form-row">
                          <div className="form-group">
                            <label>Pet Name</label>
                            <input
                              name="name"
                              value={petForm.name}
                              onChange={onPetFormChange}
                              placeholder="Pet name"
                            />
                          </div>
                          <div className="form-group">
                            <label>Species</label>
                            <input
                              name="species"
                              value={petForm.species}
                              onChange={onPetFormChange}
                              placeholder="Dog, Cat"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Breed</label>
                            <input
                              name="breed"
                              value={petForm.breed}
                              onChange={onPetFormChange}
                              placeholder="Breed"
                            />
                          </div>
                          <div className="form-group">
                            <label>Age</label>
                            <input
                              type="number"
                              min="0"
                              name="age"
                              value={petForm.age}
                              onChange={onPetFormChange}
                              placeholder="Age"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Gender</label>
                            <select
                              name="gender"
                              value={petForm.gender}
                              onChange={onPetFormChange}
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Status</label>
                            <select
                              name="status"
                              value={petForm.status}
                              onChange={onPetFormChange}
                            >
                              <option value="Healthy">Healthy</option>
                              <option value="UnderTreatment">
                                Under Treatment
                              </option>
                              <option value="Deceased">Deceased</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Notes</label>
                          <input
                            name="notes"
                            value={petForm.notes}
                            onChange={onPetFormChange}
                            placeholder="Optional notes"
                          />
                        </div>
                        {petCreateError && (
                          <p className="modal-error">{petCreateError}</p>
                        )}
                        <div className="quick-create-actions">
                          <button
                            type="button"
                            className="step-back-btn"
                            onClick={() => {
                              setShowPetCreate(false);
                              setPetForm(EMPTY_PET_FORM);
                              setPetCreateError("");
                            }}
                            disabled={petSaving}
                          >
                            Cancel Add
                          </button>
                          <button
                            type="button"
                            className="save-btn"
                            onClick={submitQuickPet}
                            disabled={petSaving || !isPetCreateFormValid}
                          >
                            {petSaving ? "Adding..." : "Save Pet"}
                          </button>
                        </div>
                      </div>
                    )}
                    {form.ownerId && petOptions.length === 0 && (
                      <p className="appointment-field-hint">
                        No pets found for this owner.
                      </p>
                    )}
                    {selectedPet && (
                      <div className="appointment-summary compact">
                        <div>
                          <span>Pet</span>
                          <strong>{petDisplayName(selectedPet)}</strong>
                        </div>
                        {selectedPet.breed && (
                          <div>
                            <span>Breed</span>
                            <strong>{selectedPet.breed}</strong>
                          </div>
                        )}
                        {selectedPet.status && (
                          <div>
                            <span>Status</span>
                            <strong>{selectedPet.status}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {bookingStep === 2 && (
                  <>
                    <div className="form-group">
                      <label>Visit Reason</label>
                      <select
                        name="visitReason"
                        value={form.visitReason}
                        onChange={onChange}
                        required
                      >
                        <option value="">Select visit reason</option>
                        {Object.keys(VISIT_REASONS).map((visitReason) => (
                          <option key={visitReason} value={visitReason}>
                            {visitReason}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedReasonConfig?.note && (
                      <p className="appointment-field-hint">
                        {selectedReasonConfig.note}
                      </p>
                    )}

                    {form.visitReason && (
                      <div className="form-group">
                        <label>Service</label>
                        <select
                          name="serviceType"
                          value={form.serviceType}
                          onChange={onChange}
                          required
                        >
                          <option value="">Select service</option>
                          {serviceGroups.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.services.map((service) => (
                                <option key={service} value={service}>
                                  {service}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.visitReason === "Vaccination" && form.serviceType && (
                      <div className="inventory-check-box">
                        <div className="inventory-check-header">
                          <span>Inventory Check</span>
                          <button
                            type="button"
                            className="inventory-link-btn"
                            onClick={() => navigate("/staff-inventory")}
                          >
                            Open Inventory
                          </button>
                        </div>
                        {vaccineInventoryPreview.length > 0 ? (
                          <ul className="inventory-match-list">
                            {vaccineInventoryPreview.map((item) => (
                              <li key={item.id || item.name}>
                                <span>{item.name}</span>
                                <strong>
                                  {item.stock ?? 0} {item.unit || "pcs"}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="inventory-empty">
                            No vaccine item matched. Check inventory before
                            confirming.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {bookingStep === 3 && (
                  <>
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

                    <div className="form-group">
                      <label>Date</label>
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

                        {!hasAvailableAppointmentDates && !editing ? (
                          <p className="appointment-field-hint no-available-dates-hint">
                            No available appointment dates yet. Please make a
                            date available first.
                          </p>
                        ) : (
                          <div className="booking-date-grid">
                            {[
                              "Sun",
                              "Mon",
                              "Tue",
                              "Wed",
                              "Thu",
                              "Fri",
                              "Sat",
                            ].map((day) => (
                              <div key={day} className="booking-date-weekday">
                                {day}
                              </div>
                            ))}
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
                              const isAvailableDay =
                                !isPastDay &&
                                availableDateKeys.includes(dayKey);
                              const isSelectedDay = form.date === dayKey;
                              const isEditingCurrentDay =
                                editingDateKey === dayKey;
                              const canSelectDay =
                                !isPastDay &&
                                (isAvailableDay || isEditingCurrentDay);
                              const badgeLabel = isPastDay
                                ? "Due"
                                : isSelectedDay
                                  ? "Selected"
                                  : isAvailableDay || isEditingCurrentDay
                                    ? "Available"
                                    : "";

                              return (
                                <button
                                  type="button"
                                  key={dayKey}
                                  className={`booking-date-day ${
                                    isPastDay ? "past-due" : ""
                                  } ${isAvailableDay ? "available" : ""} ${
                                    isSelectedDay ? "selected" : ""
                                  } ${
                                    !canSelectDay && !isPastDay
                                      ? "unavailable"
                                      : ""
                                  }`}
                                  disabled={!canSelectDay}
                                  onClick={() => selectBookingDate(dayKey)}
                                >
                                  <span className="booking-date-number">
                                    {day}
                                  </span>
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

                    <div className="form-row">
                      <div className="form-group">
                        <label>Available Time Slot</label>
                        <select
                          name="slot"
                          value={form.slot}
                          onChange={onChange}
                          required
                          disabled={
                            !form.vetId ||
                            !form.date ||
                            slotsLoading ||
                            (!hasAvailableAppointmentDates && !editing)
                          }
                        >
                          <option value="">
                            {slotsLoading
                              ? "Loading slots..."
                              : !hasAvailableAppointmentDates && !editing
                                ? "No available dates"
                                : form.vetId && form.date
                                  ? "Select time slot"
                                  : "Select vet and date first"}
                          </option>
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
                      {editing && (
                        <div className="form-group">
                          <label>Status</label>
                          <select
                            name="status"
                            value={form.status}
                            onChange={onChange}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {form.vetId && form.date && slotsLoading && (
                      <p className="appointment-field-hint">
                        Loading slots...
                      </p>
                    )}
                    {!hasAvailableAppointmentDates && !editing && (
                      <p className="appointment-field-hint">
                        No available appointment dates yet. Please make a date
                        available first.
                      </p>
                    )}
                    {form.vetId &&
                      form.date &&
                      !slotsLoading &&
                      slots.length === 0 &&
                      (hasAvailableAppointmentDates || editing) && (
                      <p className="appointment-field-hint">
                        No available slots for this date.
                      </p>
                    )}
                  </>
                )}

                {bookingStep === 4 && (
                  <>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={onChange}
                        placeholder="Notes for this appointment"
                      />
                    </div>
                    <div className="appointment-summary">
                      <div>
                        <span>Owner</span>
                        <strong>{ownerDisplayName(selectedOwner) || "-"}</strong>
                      </div>
                      <div>
                        <span>Pet</span>
                        <strong>{petDisplayName(selectedPet)}</strong>
                      </div>
                      <div>
                        <span>Reason</span>
                        <strong>{reasonSummary || "-"}</strong>
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
                        <span>Date & Time</span>
                        <strong>
                          {selectedSlot || form.slot
                            ? new Date(
                                selectedSlot?.startsAt || form.slot,
                              ).toLocaleString()
                            : "-"}
                        </strong>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions appointment-step-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                {bookingStep > 0 && (
                  <button
                    type="button"
                    className="step-back-btn"
                    onClick={goBackStep}
                    disabled={saving}
                  >
                    Back
                  </button>
                )}
                {bookingStep < FINAL_BOOKING_STEP_INDEX ? (
                  <button
                    type="button"
                    className="save-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      goNextStep();
                    }}
                    disabled={saving}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="save-btn"
                    onClick={submitAppointment}
                    disabled={saving || !finalStepReady}
                  >
                    {saving
                      ? "Saving..."
                      : editing
                        ? "Save Changes"
                        : isRebooking
                          ? "Rebook Appointment"
                          : "Book Appointment"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

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
                  const ownerName = ownerDisplayName(
                    appointment.owner || appointment.pet?.owner,
                  );

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
                        <div className="appointment-queue-meta">
                          {ownerName || "Pet owner"} | {vetName}
                        </div>
                        {appointment.reason && (
                          <div className="appointment-queue-reason">
                            {appointment.reason}
                          </div>
                        )}
                      </div>
                      <div className="appointment-queue-actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => {
                            setQueueDateKey("");
                            openCalendarAppointment(appointment);
                          }}
                        >
                          View
                        </button>
                        {renderQueueAppointmentActions(appointment)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-actions appointment-queue-modal-actions">
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

      {showAvailabilityConfirm && (
        <div
          className="modal-overlay availability-confirm-overlay"
          onClick={closeAvailabilityConfirmation}
        >
          <div
            className="modal-box availability-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="availability-confirm-badge">Date Availability</span>
            <h3>Make Date Available?</h3>
            <p className="availability-confirm-copy">
              Confirm to mark {draftAvailableDateKeys.length} selected{" "}
              {draftAvailableDateKeys.length === 1 ? "date" : "dates"} as
              available.
            </p>
            <div className="availability-confirm-date">
              <span>Selected Dates</span>
              <ul className="availability-confirm-list">
                {draftAvailableDateKeys.slice(0, 5).map((dateKey) => (
                  <li key={dateKey}>
                    {new Date(`${dateKey}T00:00:00`).toLocaleDateString()}
                  </li>
                ))}
                {draftAvailableDateKeys.length > 5 && (
                  <li>+{draftAvailableDateKeys.length - 5} more</li>
                )}
              </ul>
            </div>
            <div className="modal-actions availability-confirm-actions">
              <button
                type="button"
                className="step-back-btn"
                onClick={closeAvailabilityConfirmation}
              >
                Back
              </button>
              <button
                type="button"
                className="save-btn availability-confirm-btn"
                onClick={confirmAvailableDates}
              >
                Make Date Available
              </button>
            </div>
          </div>
        </div>
      )}

      {pastDueConfirmDate && (
        <div
          className="modal-overlay past-due-confirm-overlay"
          onClick={closePastDueConfirm}
        >
          <div
            className="modal-box past-due-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="past-due-confirm-badge">Past Due</span>
            <h3>Date Already Due</h3>
            <p className="past-due-confirm-copy">
              This date is already due. Do you still want to continue?
            </p>
            <div className="past-due-confirm-date">
              <span>Selected Date</span>
              <strong>
                {new Date(`${pastDueConfirmDate}T00:00:00`).toLocaleDateString()}
              </strong>
            </div>
            <div className="modal-actions past-due-confirm-actions">
              <button
                type="button"
                className="step-back-btn"
                onClick={closePastDueConfirm}
              >
                Back
              </button>
              <button
                type="button"
                className="save-btn past-due-confirm-btn"
                onClick={confirmPastDueDate}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAppointment;
