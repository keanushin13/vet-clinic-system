import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetMedRec.css";
import "../../../css/responsive-tables.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getAppointments,
  getInventory,
  getMedicalRecords,
  getMedicalRecordAiInsight,
  getPets,
  restoreMedicalRecord,
  updateMedicalRecord,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

function parseNotes(notesStr) {
  if (!notesStr) return { symptoms: "", notes: "" };
  const prefix = "Symptoms: ";
  if (!notesStr.startsWith(prefix)) return { symptoms: "", notes: notesStr };
  const nl = notesStr.indexOf("\n\n");
  if (nl === -1) return { symptoms: notesStr.slice(prefix.length), notes: "" };
  return { symptoms: notesStr.slice(prefix.length, nl), notes: notesStr.slice(nl + 2) };
}

const QUICK_TEMPLATES = [
  {
    label: "Wellness Exam",
    diagnosis: "Routine wellness examination",
    symptoms: "No urgent symptoms reported.",
    treatment: "Physical examination completed. Preventive care discussed.",
    notes: "Monitor appetite, activity, hydration, and stool quality.",
  },
  {
    label: "Vaccination",
    diagnosis: "Vaccination visit",
    symptoms: "No adverse symptoms reported before vaccination.",
    treatment: "Vaccine administered as scheduled.",
    notes: "Advise owner to monitor for mild soreness, swelling, fever, or allergic reaction.",
  },
  {
    label: "Deworming",
    diagnosis: "Deworming care",
    symptoms: "Possible parasite exposure or scheduled parasite prevention.",
    treatment: "Deworming treatment provided.",
    notes: "Recommend follow-up dose or fecal check if symptoms continue.",
  },
  {
    label: "Dental",
    diagnosis: "Dental concern",
    symptoms: "Oral odor, tartar buildup, gum irritation, or chewing discomfort reported.",
    treatment: "Oral examination completed. Dental care plan discussed.",
    notes: "Recommend dental hygiene monitoring and follow-up if appetite changes.",
  },
  {
    label: "Skin Issue",
    diagnosis: "Skin irritation",
    symptoms: "Itching, redness, hair loss, rash, or skin discomfort reported.",
    treatment: "Skin assessment completed. Treatment plan discussed with owner.",
    notes: "Prevent licking or scratching when possible and monitor affected areas.",
  },
  {
    label: "Injury",
    diagnosis: "Injury assessment",
    symptoms: "Pain, swelling, limping, wound, or movement difficulty reported.",
    treatment: "Injury examined. Care plan and activity restriction discussed.",
    notes: "Return urgently if pain, swelling, bleeding, or weakness worsens.",
  },
  {
    label: "Follow-up",
    diagnosis: "Follow-up evaluation",
    symptoms: "Recheck visit for previously noted condition.",
    treatment: "Progress reviewed and treatment plan updated as needed.",
    notes: "Continue monitoring response to treatment and schedule next review if needed.",
  },
];

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const MEDREC_STEPS = [
  "Owner & Pet",
  "Clinical Notes",
  "Treatment Plan",
  "Review",
];
const FINAL_STEP_INDEX = MEDREC_STEPS.length - 1;

const ownerDisplayName = (owner) => {
  if (!owner) return "";
  return (
    `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() ||
    owner.username ||
    owner.email ||
    ""
  );
};

const petOwnerId = (pet) =>
  pet?.ownerId || pet?.owner?.id || pet?.petOwnerId || pet?.userId || "";

const formatAppointmentLabel = (appointment) => {
  if (!appointment?.scheduledAt) return "Unscheduled appointment";
  return new Date(appointment.scheduledAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const VetMedRec = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [records, setRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [search, setSearch] = useState("");
  const [includeArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [cancelConfirmModal, setCancelConfirmModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [petDropdownOpen, setPetDropdownOpen] = useState(false);
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState("");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationDropdownOpen, setMedicationDropdownOpen] = useState(false);
  const [treatmentAttachment, setTreatmentAttachment] = useState(null);
  const [appointmentProgressConfirmed, setAppointmentProgressConfirmed] =
    useState(false);
  const [progressConfirmModal, setProgressConfirmModal] = useState(false);
  const [progressConfirmSaving, setProgressConfirmSaving] = useState(false);
  const [progressConfirmError, setProgressConfirmError] = useState("");
  const [aiModal, setAiModal] = useState(null); // { record, insight, loading, error }
  const [form, setForm] = useState({
    petId: "",
    appointmentId: "",
    diagnosis: "",
    symptoms: "",
    treatment: "",
    prescription: "",
    notes: "",
    status: "",
    followUpDate: "",
    modificationReason: "",
  });

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [recordRes, petRes, appointmentRes, inventoryRes] = await Promise.all([
        getMedicalRecords({ includeArchived }),
        getPets(),
        getAppointments().catch(() => ({ data: [] })),
        getInventory().catch(() => ({ data: [] })),
      ]);
      setRecords(recordRes.data || []);
      setPets(petRes.data || []);
      setAppointments(appointmentRes.data || []);
      setInventoryItems(inventoryRes.data || []);
    } catch {
      setError("Failed to load medical records");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    const q = search.toLowerCase();
    const petName = rec.pet?.name?.toLowerCase() || "";
    return (
      petName.includes(q) ||
      (rec.id || "").toLowerCase().includes(q) ||
      (rec.diagnosis || "").toLowerCase().includes(q)
    );
  });

  const ownerOptions = useMemo(() => {
    const ownerMap = new Map();
    pets.forEach((pet) => {
      const ownerId = petOwnerId(pet);
      if (!ownerId) return;
      ownerMap.set(String(ownerId), {
        ...(ownerMap.get(String(ownerId)) || {}),
        ...(pet.owner || {}),
        id: ownerId,
      });
    });
    return Array.from(ownerMap.values()).sort((a, b) =>
      ownerDisplayName(a).localeCompare(ownerDisplayName(b)),
    );
  }, [pets]);

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return ownerOptions.slice(0, 6);
    return ownerOptions
      .filter((owner) => {
        const name = ownerDisplayName(owner).toLowerCase();
        return (
          name.includes(q) ||
          (owner.email || "").toLowerCase().includes(q) ||
          (owner.phone || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [ownerOptions, ownerSearch]);

  const selectedOwner = useMemo(
    () =>
      ownerOptions.find((owner) => String(owner.id) === String(selectedOwnerId)) ||
      null,
    [ownerOptions, selectedOwnerId],
  );

  const ownerPets = useMemo(() => {
    if (!selectedOwnerId) return [];
    return pets
      .filter((pet) => String(petOwnerId(pet)) === String(selectedOwnerId))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [pets, selectedOwnerId]);

  const filteredOwnerPets = useMemo(() => {
    const q = petSearch.trim().toLowerCase();
    if (!q) return ownerPets.slice(0, 8);
    return ownerPets
      .filter((pet) => {
        const text = [pet.name, pet.species, pet.breed, pet.gender]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8);
  }, [ownerPets, petSearch]);

  const selectedPet = useMemo(
    () => pets.find((pet) => String(pet.id) === String(form.petId)) || null,
    [pets, form.petId],
  );

  const petAppointments = useMemo(() => {
    if (!form.petId) return [];
    return appointments
      .filter((appointment) => {
        const appointmentPetId = appointment.petId || appointment.pet?.id;
        return (
          String(appointmentPetId) === String(form.petId) &&
          normalizeStatus(appointment.status) === "confirmed"
        );
      })
      .sort((a, b) => {
        return new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0);
      })
      .slice(0, 5);
  }, [appointments, form.petId]);

  const selectedAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) => String(appointment.id) === String(form.appointmentId),
      ) || null,
    [appointments, form.appointmentId],
  );

  const selectedPetRecords = useMemo(
    () =>
      records
        .filter((record) => String(record.petId || record.pet?.id) === String(form.petId))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [records, form.petId],
  );

  const immunizationRecords = useMemo(
    () =>
      selectedPetRecords.filter((record) => {
        const text = [
          record.diagnosis,
          record.treatment,
          record.prescription,
          record.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return /vaccin|immuniz|rabies|booster|shot|deworm/.test(text);
      }),
    [selectedPetRecords],
  );

  const medicationOptions = useMemo(() => {
    const medicationItems = inventoryItems.filter((item) => {
      const category = String(item.category || "").toLowerCase();
      return (
        category.includes("medication") ||
        category.includes("medicine") ||
        category.includes("pharmaceutical")
      );
    });
    return medicationItems.length ? medicationItems : inventoryItems;
  }, [inventoryItems]);

  const filteredMedicationOptions = useMemo(() => {
    const q = medicationSearch.trim().toLowerCase();
    const source = medicationOptions.filter((item) => !item.isArchived);
    if (!q) return source.slice(0, 8);
    return source
      .filter((item) => {
        const text = [
          item.name,
          item.category,
          item.status,
          item.description,
          item.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8);
  }, [medicationOptions, medicationSearch]);

  const canAdvanceStep =
    (activeStep === 0 && Boolean(form.petId)) ||
    (activeStep === 1 && Boolean(form.diagnosis.trim())) ||
    (activeStep === 2 &&
      Boolean(form.treatment.trim()) &&
      Boolean(form.prescription.trim()) &&
      Boolean(form.status) &&
      (form.status !== "FollowUp" || Boolean(form.followUpDate))) ||
    activeStep === FINAL_STEP_INDEX;

  const canOpenStep = (stepIndex) => {
    if (stepIndex === 0) return true;
    if (stepIndex === 1) return Boolean(form.petId);
    return Boolean(form.petId && form.diagnosis.trim());
  };

  const toggleArchive = async (record) => {
    try {
      if (record.isArchived) {
        await restoreMedicalRecord(record.id);
      } else {
        await deleteMedicalRecord(record.id);
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update record status");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setActiveStep(0);
    setOwnerSearch("");
    setSelectedOwnerId("");
    setPetSearch("");
    setPetDropdownOpen(false);
    setSelectedTemplateLabel("");
    setMedicationSearch("");
    setMedicationDropdownOpen(false);
    setTreatmentAttachment(null);
    setAppointmentProgressConfirmed(false);
    setProgressConfirmModal(false);
    setCancelConfirmModal(false);
    setProgressConfirmSaving(false);
    setProgressConfirmError("");
    setForm({
      petId: "",
      appointmentId: "",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      prescription: "",
      notes: "",
      status: "",
      followUpDate: "",
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (record) => {
    setEditing(record);
    setActiveStep(0);
    setSelectedTemplateLabel("");
    setMedicationSearch(record.prescription || "");
    setMedicationDropdownOpen(false);
    setTreatmentAttachment(null);
    setAppointmentProgressConfirmed(Boolean(record.appointmentId));
    setProgressConfirmModal(false);
    setCancelConfirmModal(false);
    setProgressConfirmSaving(false);
    setProgressConfirmError("");
    const { symptoms, notes } = parseNotes(record.notes || "");
    const recordOwnerId = petOwnerId(record.pet) || record.pet?.owner?.id || "";
    setSelectedOwnerId(recordOwnerId);
    setOwnerSearch("");
    setPetSearch(record.pet?.name || "");
    setPetDropdownOpen(false);
    setForm({
      petId: record.petId,
      appointmentId: record.appointmentId || "",
      diagnosis: record.diagnosis || "",
      symptoms,
      treatment: record.treatment || "",
      prescription: record.prescription || "",
      notes,
      status: record.status || "",
      followUpDate: record.followUpDate
        ? new Date(record.followUpDate).toISOString().slice(0, 10)
        : "",
      modificationReason: "",
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const printRecord = (rec) => {
    const { symptoms, notes } = parseNotes(rec.notes || "");
    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html><head>
      <title>Medical Record – ${esc(rec.pet?.name)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 680px; margin: auto; }
        h1 { font-size: 20px; border-bottom: 2px solid #438fb5; padding-bottom: 8px; margin-bottom: 12px; }
        h2 { font-size: 13px; color: #255065; margin: 18px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        p { margin: 0; font-size: 13px; line-height: 1.6; }
        .meta { display: flex; gap: 20px; font-size: 12px; color: #666; margin-bottom: 20px; flex-wrap: wrap; }
        .badge { background: #e3f2fd; color: #255065; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <h1>Medical Record</h1>
      <div class="meta">
        <span>ID: REC-${esc(rec.id.slice(-6).toUpperCase())}</span>
        <span>Patient: ${esc(rec.pet?.name)}</span>
        <span>Species: ${esc(rec.pet?.species)}</span>
        <span>Date: ${new Date(rec.createdAt).toLocaleDateString()}</span>
        <span class="badge">${esc(rec.status)}</span>
      </div>
      <h2>Diagnosis</h2><p>${esc(rec.diagnosis)}</p>
      ${symptoms ? `<h2>Symptoms</h2><p>${esc(symptoms)}</p>` : ""}
      ${rec.treatment ? `<h2>Treatment / Treatment Plan</h2><p>${esc(rec.treatment)}</p>` : ""}
      ${rec.prescription ? `<h2>Prescription / Medications</h2><p>${esc(rec.prescription)}</p>` : ""}
      ${notes ? `<h2>Notes</h2><p>${esc(notes)}</p>` : ""}
      ${rec.followUpDate ? `<h2>Follow-up Date</h2><p>${new Date(rec.followUpDate).toLocaleDateString()}</p>` : ""}
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const closeModal = () => {
    setShowModal(false);
    setCancelConfirmModal(false);
    setEditing(null);
    setSaving(false);
    setActiveStep(0);
    setOwnerSearch("");
    setSelectedOwnerId("");
    setPetSearch("");
    setPetDropdownOpen(false);
    setSelectedTemplateLabel("");
    setMedicationSearch("");
    setMedicationDropdownOpen(false);
    setTreatmentAttachment(null);
    setAppointmentProgressConfirmed(false);
    setProgressConfirmModal(false);
    setProgressConfirmSaving(false);
    setProgressConfirmError("");
    setForm({
      petId: "",
      appointmentId: "",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      prescription: "",
      notes: "",
      status: "",
      followUpDate: "",
      modificationReason: "",
    });
  };

  const requestCancelModal = () => {
    setCancelConfirmModal(true);
  };

  const openAiInsight = async (record, refresh = false) => {
    setAiModal({ record, insight: null, loading: true, error: "" });
    try {
      const res = await getMedicalRecordAiInsight(record.id, refresh);
      setAiModal({ record, loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || "Failed to generate AI insight",
      }));
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" && value !== "FollowUp" ? { followUpDate: "" } : {}),
    }));
  };

  const onPrescriptionSearchChange = (e) => {
    const { value } = e.target;
    setMedicationSearch(value);
    setMedicationDropdownOpen(true);
    setForm((prev) => ({ ...prev, prescription: value }));
  };

  const selectMedication = (item) => {
    const medicationName = item?.name || "";
    setMedicationSearch(medicationName);
    setMedicationDropdownOpen(false);
    setForm((prev) => ({ ...prev, prescription: medicationName }));
  };

  const onTreatmentAttachmentChange = (e) => {
    setTreatmentAttachment(e.target.files?.[0] || null);
  };

  const selectPet = (pet) => {
    setForm((prev) => ({
      ...prev,
      petId: pet?.id || "",
      appointmentId: "",
    }));
    setPetSearch(pet?.name || "");
    setPetDropdownOpen(false);
    setAppointmentProgressConfirmed(false);
  };

  const selectOwner = (ownerId) => {
    const petsForOwner = pets.filter(
      (pet) => String(petOwnerId(pet)) === String(ownerId),
    );
    setSelectedOwnerId(ownerId);
    setPetSearch(petsForOwner.length === 1 ? petsForOwner[0].name || "" : "");
    setPetDropdownOpen(false);
    setForm((prev) => ({
      ...prev,
      petId: petsForOwner.length === 1 ? petsForOwner[0].id : "",
      appointmentId: "",
    }));
    setAppointmentProgressConfirmed(false);
  };

  const selectAppointment = (appointmentId) => {
    setForm((prev) => ({
      ...prev,
      appointmentId:
        String(prev.appointmentId) === String(appointmentId) ? "" : appointmentId,
    }));
    setAppointmentProgressConfirmed(false);
  };

  const goToNextStep = () => {
    if (!canAdvanceStep) return;
    if (
      activeStep === 0 &&
      selectedAppointment &&
      normalizeStatus(selectedAppointment.status) === "confirmed" &&
      !appointmentProgressConfirmed
    ) {
      setProgressConfirmModal(true);
      setProgressConfirmError("");
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, FINAL_STEP_INDEX));
  };

  const confirmAppointmentInProgress = () => {
    if (!selectedAppointment) {
      setProgressConfirmModal(false);
      setActiveStep(1);
      return;
    }

    setProgressConfirmError("");
    setAppointments((prev) =>
      prev.map((appointment) =>
        String(appointment.id) === String(selectedAppointment.id)
          ? { ...appointment, status: "InProgress" }
          : appointment,
      ),
    );
    setAppointmentProgressConfirmed(true);
    setProgressConfirmModal(false);
    setActiveStep(1);
  };

  const goToPreviousStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const applyTemplate = (template) => {
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      diagnosis: template.diagnosis,
      symptoms: template.symptoms,
      treatment: template.treatment,
      notes: template.notes,
    }));
  };

  const clearClinicalText = () => {
    setForm((prev) => ({
      ...prev,
      diagnosis: "",
      symptoms: "",
      treatment: "",
      prescription: "",
      notes: "",
    }));
    setMedicationSearch("");
    setMedicationDropdownOpen(false);
    setSelectedTemplateLabel("");
  };

  const selectedTemplate = useMemo(
    () =>
      QUICK_TEMPLATES.find(
        (template) => template.label === selectedTemplateLabel,
      ) || null,
    [selectedTemplateLabel],
  );

  const submitRecord = async (e) => {
    e?.preventDefault?.();
    if (!form.petId || !form.diagnosis || !form.treatment || !form.prescription || !form.status) {
      setError("Pet, diagnosis, treatment, prescription, and status are required");
      return;
    }
    if (form.status === "FollowUp" && !form.followUpDate) {
      setError("Follow-up date is required when status is FollowUp");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const assembledNotes = form.symptoms.trim()
        ? `Symptoms: ${form.symptoms.trim()}\n\n${form.notes}`
        : form.notes;
      const { symptoms: _s, ...rest } = form;
      const payload = {
        ...rest,
        appointmentId: selectedAppointment ? selectedAppointment.id : null,
        notes: assembledNotes,
        followUpDate: form.followUpDate || null,
      };
      // only send modificationReason for admin/staff edits
      if (!editing || user.role === "veterinarian") {
        delete payload.modificationReason;
      }
      if (editing) {
        await updateMedicalRecord(editing.id, payload);
        setSuccess("Medical record updated successfully.");
      } else {
        const response = await createMedicalRecord(payload);
        if (response?.data?.autoLinkedAppointment) {
          setSuccess(
            `Medical record created. Auto-linked to appointment ${response.data.linkedAppointmentId}.`,
          );
        } else {
          setSuccess("Medical record created successfully.");
        }
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save medical record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <VetSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Veterinary Clinical Medical Records</h2>
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
          <div className="records-list-card">
            <div className="records-filters">
              <input
                type="text"
                placeholder="Search by Patient ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {/* <label className="archived-filter-toggle">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Show archived
              </label> */}
              <button className="new-entry-btn" onClick={openCreate}>
                New Entry
              </button>
            </div>

            <div className="table-desktop">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Diagnosis</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="record-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </td>
                      <td>
                        {rec.pet?.name} <br />
                        <small className="species-meta">
                          {rec.pet?.species || ""}
                        </small>
                      </td>
                      <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td>{rec.diagnosis}</td>
                      <td>
                        <span
                          className={`status-pill ${rec.status?.toLowerCase()}`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-print"
                            onClick={() => printRecord(rec)}
                            title="Print / Save as PDF"
                          >
                            🖨
                          </button>
                          <button
                            className="row-btn icon-btn row-btn-ai"
                            onClick={() => openAiInsight(rec)}
                            title="AI Health Insight"
                            aria-label="AI Health Insight"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="row-btn icon-btn"
                            onClick={() => openEdit(rec)}
                            title="Edit record"
                            aria-label="Edit record"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
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
                          </button>
                          <button
                            className="row-btn row-btn-danger icon-btn"
                            onClick={() => toggleArchive(rec)}
                            title={
                              rec.isArchived
                                ? "Restore record"
                                : "Archive record"
                            }
                            aria-label={
                              rec.isArchived
                                ? "Restore record"
                                : "Archive record"
                            }
                          >
                            {rec.isArchived ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M8 7H5l3-3m-3 3 3 3"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 7h8a5 5 0 1 1 0 10h-2"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-mobile table-cards-list">
              {filteredRecords.map((rec) => (
                <div className="record-card" key={rec.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">
                      <div className="record-card-id">
                        REC-{rec.id.slice(-6).toUpperCase()}
                      </div>
                      <div className="record-card-patient">
                        {rec.pet?.name} ({rec.pet?.species || "N/A"})
                      </div>
                    </div>
                    <span
                      className={`status-pill ${rec.status?.toLowerCase()}`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="record-card-body">
                    <div className="record-card-row">
                      <span className="record-card-label">Date</span>
                      <span>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Diagnosis</span>
                      <span className="record-card-diagnosis">
                        {rec.diagnosis}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span className="record-card-label">Actions</span>
                      <div className="row-actions">
                        <button
                          className="btn-print"
                          onClick={() => printRecord(rec)}
                          title="Print / Save as PDF"
                        >
                          🖨
                        </button>
                        <button
                          className="row-btn icon-btn row-btn-ai"
                          onClick={() => openAiInsight(rec)}
                          title="AI Health Insight"
                          aria-label="AI Health Insight"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="row-btn icon-btn"
                          onClick={() => openEdit(rec)}
                          title="Edit record"
                          aria-label="Edit record"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
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
                        </button>
                        <button
                          className="row-btn row-btn-danger icon-btn"
                          onClick={() => toggleArchive(rec)}
                          title={
                            rec.isArchived ? "Restore record" : "Archive record"
                          }
                          aria-label={
                            rec.isArchived ? "Restore record" : "Archive record"
                          }
                        >
                          {rec.isArchived ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M8 7H5l3-3m-3 3 3 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 7h8a5 5 0 1 1 0 10h-2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <p className="list-feedback">Loading medical records...</p>
            )}
            {!loading && success && (
              <p className="list-feedback" style={{ color: "#166534" }}>
                {success}
              </p>
            )}
            {!loading && !filteredRecords.length && (
              <p className="list-feedback">No medical records found.</p>
            )}
            {error && <p className="list-error">{error}</p>}
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div
            className="modal-box quick-medrec-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              className="user-modal-form quick-medrec-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <h3>{editing ? "Edit Medical Record" : "Quick Medical Record"}</h3>

              <div className="medrec-stepper" aria-label="Medical record steps">
                {MEDREC_STEPS.map((step, index) => (
                  <button
                    type="button"
                    key={step}
                    className={`medrec-step ${activeStep === index ? "active" : ""} ${
                      activeStep > index ? "done" : ""
                    }`}
                    onClick={() => {
                      if (canOpenStep(index)) setActiveStep(index);
                    }}
                    disabled={!canOpenStep(index)}
                  >
                    <span>{index + 1}</span>
                    {step}
                  </button>
                ))}
              </div>

              {activeStep === 0 && (
                <div className="quick-form-section">
                  <div className="quick-section-heading">
                    <span>Owner & Pet Patient</span>
                  </div>

                  <div className="form-group">
                    <label>
                      Search Owner <span className="required-mark">*</span>
                    </label>
                    <input
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      placeholder="Search owner by name, email, or phone"
                      disabled={Boolean(editing)}
                    />
                  </div>

                  <div className="owner-picker">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map((owner) => {
                        const isSelected =
                          String(selectedOwnerId) === String(owner.id);
                        return (
                          <button
                            type="button"
                            key={owner.id}
                            className={`owner-option ${isSelected ? "selected" : ""}`}
                            onClick={() => selectOwner(owner.id)}
                            disabled={Boolean(editing)}
                          >
                            <strong>{ownerDisplayName(owner) || "Pet Owner"}</strong>
                            <small>
                              {[owner.email, owner.phone].filter(Boolean).join(" | ") ||
                                "No contact details"}
                            </small>
                          </button>
                        );
                      })
                    ) : (
                      <div className="appointment-empty">No owners found.</div>
                    )}
                  </div>

                  {selectedOwner && (
                    <div className="selected-appointment-summary">
                      <span>Selected owner</span>
                      <strong>{ownerDisplayName(selectedOwner) || "Pet Owner"}</strong>
                      <small>
                        {ownerPets.length === 1
                          ? "1 pet available"
                          : `${ownerPets.length} pets available`}
                      </small>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        Pet <span className="required-mark">*</span>
                      </label>
                      <div className="pet-combobox">
                        <input
                          value={petSearch}
                          onChange={(e) => {
                            setPetSearch(e.target.value);
                            setPetDropdownOpen(true);
                            setForm((prev) => ({
                              ...prev,
                              petId: "",
                              appointmentId: "",
                            }));
                            setAppointmentProgressConfirmed(false);
                          }}
                          onFocus={() => setPetDropdownOpen(true)}
                          placeholder={
                            selectedOwnerId
                              ? "Type or select pet"
                              : "Select owner first"
                          }
                          disabled={Boolean(editing) || !selectedOwnerId}
                          required
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="pet-dropdown-toggle"
                          aria-label="Show pets"
                          disabled={Boolean(editing) || !selectedOwnerId}
                          onClick={() =>
                            setPetDropdownOpen((isOpen) => !isOpen)
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="m6 9 6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {petDropdownOpen && selectedOwnerId && !editing && (
                          <div className="pet-dropdown">
                            {filteredOwnerPets.length > 0 ? (
                              filteredOwnerPets.map((pet) => (
                                <button
                                  type="button"
                                  key={pet.id}
                                  className="pet-dropdown-option"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectPet(pet)}
                                >
                                  <span>
                                    <strong>{pet.name || "Unnamed Pet"}</strong>
                                    <small>
                                      {[pet.species, pet.breed, pet.gender]
                                        .filter(Boolean)
                                        .join(" | ") || "No pet details"}
                                    </small>
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="pet-dropdown-empty">
                                No pets found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Selected Pet</label>
                      <div className="selected-pet-summary">
                        {selectedPet
                          ? `${selectedPet.name} (${selectedPet.species || "N/A"})`
                          : "No pet selected"}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirmed Appointments</label>
                    <div className="appointment-picker">
                      {petAppointments.length > 0 ? (
                        petAppointments.map((appointment) => {
                          const isSelected =
                            String(form.appointmentId) === String(appointment.id);
                          return (
                            <button
                              type="button"
                              key={appointment.id}
                              className={`appointment-option ${isSelected ? "selected" : ""}`}
                              onClick={() => selectAppointment(appointment.id)}
                            >
                              <span>
                                <strong>{formatAppointmentLabel(appointment)}</strong>
                                <small>{appointment.reason || "No reason recorded"}</small>
                              </span>
                              <em>{appointment.status || "Pending"}</em>
                            </button>
                          );
                        })
                      ) : (
                        <div className="appointment-empty">
                          {form.petId
                            ? "No confirmed appointments for this pet."
                            : "Select a pet to view confirmed appointments."}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedAppointment && (
                    <div className="selected-appointment-summary">
                      <span>Linked appointment</span>
                      <strong>{formatAppointmentLabel(selectedAppointment)}</strong>
                      <small>{selectedAppointment.reason || "No reason recorded"}</small>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 1 && (
                <>
                  <div className="quick-form-section">
                    <div className="quick-section-heading">
                      <span>Common Templates</span>
                    </div>
                    <div className="template-chip-row">
                      {QUICK_TEMPLATES.map((template) => (
                        <button
                          type="button"
                          key={template.label}
                          className={`template-chip ${
                            selectedTemplateLabel === template.label
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => setSelectedTemplateLabel(template.label)}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                    <div className="template-fill-actions">
                      <span>
                        {selectedTemplate
                          ? `${selectedTemplate.label} selected`
                          : "Select a template first"}
                      </span>
                      <div className="template-action-buttons">
                        <button
                          type="button"
                          className="template-clear-btn"
                          onClick={clearClinicalText}
                          disabled={
                            !form.diagnosis &&
                            !form.symptoms &&
                            !form.treatment &&
                            !form.prescription &&
                            !form.notes
                          }
                        >
                          Remove All Text
                        </button>
                        <button
                          type="button"
                          className="template-autofill-btn"
                          onClick={() => applyTemplate(selectedTemplate)}
                          disabled={!selectedTemplate}
                        >
                          Auto Fill
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="quick-form-section">
                    <div className="quick-section-heading">
                      <span>Clinical Notes</span>
                    </div>
                    <div className="form-group">
                      <label>
                        Diagnosis <span className="required-mark">*</span>
                      </label>
                      <input
                        name="diagnosis"
                        value={form.diagnosis}
                        onChange={onChange}
                        required
                        placeholder="Enter diagnosis"
                      />
                    </div>

                    <div className="form-group">
                      <label>Symptoms</label>
                      <textarea
                        name="symptoms"
                        value={form.symptoms}
                        onChange={onChange}
                        rows={2}
                        placeholder="Describe observed symptoms..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={onChange}
                        placeholder="Add visit notes"
                      />
                    </div>
                  </div>

                  <div className="quick-form-section">
                    <div className="quick-section-heading">
                      <span>Immunization Records</span>
                    </div>
                    {immunizationRecords.length > 0 ? (
                      <div className="history-record-list">
                        {immunizationRecords.slice(0, 4).map((record) => (
                          <div className="history-record-item" key={record.id}>
                            <div>
                              <strong>{record.diagnosis || "Immunization Record"}</strong>
                              <span>
                                {record.createdAt
                                  ? new Date(record.createdAt).toLocaleDateString()
                                  : "No date recorded"}
                              </span>
                            </div>
                            <small>
                              {record.treatment ||
                                record.prescription ||
                                parseNotes(record.notes || "").notes ||
                                "No details recorded"}
                            </small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="history-empty">
                        {form.petId
                          ? "No immunization records found for this pet."
                          : "Select a pet to view immunization records."}
                      </div>
                    )}
                  </div>

                  <div className="quick-form-section">
                    <div className="quick-section-heading">
                      <span>Recent Medical Records</span>
                    </div>
                    {selectedPetRecords.length > 0 ? (
                      <div className="history-record-list">
                        {selectedPetRecords.slice(0, 3).map((record) => (
                          <div className="history-record-item" key={record.id}>
                            <div>
                              <strong>{record.diagnosis || "Medical Record"}</strong>
                              <span>
                                {record.createdAt
                                  ? new Date(record.createdAt).toLocaleDateString()
                                  : "No date recorded"}
                              </span>
                            </div>
                            <small>
                              {record.treatment ||
                                parseNotes(record.notes || "").notes ||
                                "No notes recorded"}
                            </small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="history-empty">
                        {form.petId
                          ? "No past medical records found for this pet."
                          : "Select a pet to view past records."}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <div className="quick-form-section">
                    <div className="quick-section-heading">
                      <span>Treatment Plan</span>
                    </div>
                    <div className="form-group">
                      <label>
                        Treatment / Treatment Plan{" "}
                        <span className="required-mark">*</span>
                      </label>
                      <textarea
                        name="treatment"
                        value={form.treatment}
                        onChange={onChange}
                        rows={5}
                        placeholder="Enter treatment plan, care instructions, or next steps"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Prescription / Medications{" "}
                        <span className="required-mark">*</span>
                      </label>
                      <div className="medication-combobox">
                        <input
                          name="prescription"
                          value={medicationSearch}
                          onChange={onPrescriptionSearchChange}
                          onFocus={() => setMedicationDropdownOpen(true)}
                          placeholder="Search inventory medications"
                          autoComplete="off"
                          required
                        />
                        <button
                          type="button"
                          className="medication-dropdown-toggle"
                          aria-label="Show inventory medications"
                          onClick={() =>
                            setMedicationDropdownOpen((isOpen) => !isOpen)
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="m6 9 6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {medicationDropdownOpen && (
                          <div className="medication-dropdown">
                            {filteredMedicationOptions.length > 0 ? (
                              filteredMedicationOptions.map((item) => (
                                <button
                                  type="button"
                                  key={item.id || item.name}
                                  className="medication-option"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectMedication(item)}
                                >
                                  <span>
                                    <strong>{item.name}</strong>
                                    <small>
                                      {[item.category, item.status]
                                        .filter(Boolean)
                                        .join(" | ") || "Inventory item"}
                                    </small>
                                  </span>
                                  <em>{item.stock ?? 0} left</em>
                                </button>
                              ))
                            ) : (
                              <div className="medication-empty">
                                No inventory medication found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          Status <span className="required-mark">*</span>
                        </label>
                        <select
                          name="status"
                          value={form.status}
                          onChange={onChange}
                          required
                        >
                          <option value="">Select status</option>
                          <option value="Finalized">Finalized</option>
                          <option value="FollowUp">FollowUp</option>
                        </select>
                      </div>
                      {form.status === "FollowUp" && (
                        <div className="form-group">
                          <label>
                            Follow-up Date{" "}
                            <span className="required-mark">*</span>
                          </label>
                          <input
                            type="date"
                            name="followUpDate"
                            value={form.followUpDate}
                            onChange={onChange}
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group treatment-attachment-group">
                      <label>Attachment (optional)</label>
                      <div className="treatment-attachment-control">
                        <label className="treatment-attachment-btn">
                          Attach File
                          <input
                            key={treatmentAttachment?.name || "empty-attachment"}
                            type="file"
                            onChange={onTreatmentAttachmentChange}
                          />
                        </label>
                        <span>
                          {treatmentAttachment
                            ? treatmentAttachment.name
                            : "No file attached"}
                        </span>
                        {treatmentAttachment && (
                          <button
                            type="button"
                            className="treatment-attachment-remove"
                            onClick={() => setTreatmentAttachment(null)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeStep === FINAL_STEP_INDEX && (
                <div className="quick-form-section medrec-review">
                  <div className="quick-section-heading">
                    <span>Review</span>
                  </div>
                  <div className="review-grid">
                    <div>
                      <span>Owner</span>
                      <strong>{ownerDisplayName(selectedOwner) || "Not selected"}</strong>
                    </div>
                    <div>
                      <span>Pet</span>
                      <strong>
                        {selectedPet
                          ? `${selectedPet.name} (${selectedPet.species || "N/A"})`
                          : "Not selected"}
                      </strong>
                    </div>
                    <div>
                      <span>Appointment</span>
                      <strong>
                        {selectedAppointment
                          ? formatAppointmentLabel(selectedAppointment)
                          : "Not linked"}
                      </strong>
                    </div>
                    <div>
                      <span>Diagnosis</span>
                      <strong>{form.diagnosis || "Required"}</strong>
                    </div>
                    <div>
                      <span>Treatment Plan</span>
                      <strong>{form.treatment || "Not added"}</strong>
                    </div>
                    <div>
                      <span>Prescription / Medications</span>
                      <strong>{form.prescription || "Not added"}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{form.status || "Not selected"}</strong>
                    </div>
                    {form.status === "FollowUp" && (
                      <div>
                        <span>Follow-up Date</span>
                        <strong>
                          {form.followUpDate
                            ? new Date(form.followUpDate).toLocaleDateString()
                            : "Not scheduled"}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span>Date & Time</span>
                      <strong>{new Date().toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Attachment</span>
                      <strong>
                        {treatmentAttachment
                          ? treatmentAttachment.name
                          : "No file attached"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* modificationReason — required for admin/staff when editing */}
              {editing && (user.role === "admin" || user.role === "staff") && (
                <div className="form-group">
                  <label>Modification Reason *</label>
                  <select
                    name="modificationReason"
                    value={form.modificationReason}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="Typographical Error">
                      Typographical Error
                    </option>
                    <option value="Duplicate Entries">Duplicate Entries</option>
                    <option value="Ownership Transfer">
                      Ownership Transfer
                    </option>
                    <option value="Wrong Species">Wrong Species</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={requestCancelModal}
                >
                  Cancel
                </button>
                {activeStep > 0 && (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={goToPreviousStep}
                  >
                    Back
                  </button>
                )}
                {activeStep < FINAL_STEP_INDEX ? (
                  <button
                    type="button"
                    className="save-btn"
                    onClick={goToNextStep}
                    disabled={!canAdvanceStep}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="save-btn"
                    disabled={saving}
                    onClick={submitRecord}
                  >
                    {saving ? "Saving..." : "Save Record"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelConfirmModal && (
        <div className="modal-overlay" onClick={() => setCancelConfirmModal(false)}>
          <div
            className="modal-box cancel-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Discard Medical Record?</h3>
            <p>
              All information entered in this form will be removed. This cannot
              be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setCancelConfirmModal(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="save-btn discard-confirm-btn"
                onClick={closeModal}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {progressConfirmModal && selectedAppointment && (
        <div
          className="modal-overlay"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="modal-box progress-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Mark Appointment In Progress?</h3>
            <p>
              This confirmed appointment will be marked as In Progress before
              you continue creating the medical record.
            </p>
            <div className="progress-confirm-details">
              <span>Appointment</span>
              <strong>{formatAppointmentLabel(selectedAppointment)}</strong>
              <small>{selectedAppointment.reason || "No reason recorded"}</small>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setProgressConfirmModal(false);
                  setProgressConfirmError("");
                }}
                disabled={progressConfirmSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={confirmAppointmentInProgress}
                disabled={progressConfirmSaving}
              >
                {progressConfirmSaving ? "Marking..." : "Confirm"}
              </button>
            </div>
            {progressConfirmError && (
              <p className="progress-confirm-error">{progressConfirmError}</p>
            )}
          </div>
        </div>
      )}

      {aiModal && (
        <div className="modal-overlay">
          <div
            className="modal-box ai-insight-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-insight-header">
              <div className="ai-generated-badge">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  width="14"
                  height="14"
                >
                  <path
                    d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                AI Generated
              </div>
              <h3>Health Insight — {aiModal.record?.pet?.name}</h3>
              <p className="ai-insight-subheading">
                {aiModal.record?.diagnosis}
              </p>
              <p className="ai-insight-subheading">
                Analyzed from full medical history across all records.
              </p>
            </div>

            {aiModal.loading && (
              <div className="ai-insight-loading">
                <div className="ai-loading-spinner" />
                <span>Generating health insight...</span>
              </div>
            )}

            {aiModal.error && (
              <p className="ai-insight-error">{aiModal.error}</p>
            )}

            {!aiModal.loading && aiModal.insight && (
              <div className="ai-insight-body">
                <div className="ai-insight-content">
                  {aiModal.insight
                    .split("\n")
                    .map((line, i) =>
                      line.trim() ? <p key={i}>{line}</p> : <br key={i} />,
                    )}
                </div>
                <div className="ai-disclaimer">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    width="14"
                    height="14"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 8v4m0 4h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {aiModal.disclaimer}
                </div>
                <div className="ai-meta">
                  {aiModal.fromCache
                    ? "Cached insight · "
                    : "Freshly generated · "}
                  {aiModal.aiModel} &middot;{" "}
                  {new Date(aiModal.generatedAt).toLocaleString()}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {!aiModal.loading && aiModal.insight && (
                <button
                  className="cancel-btn"
                  onClick={() => openAiInsight(aiModal.record, true)}
                >
                  Refresh
                </button>
              )}
              <button className="save-btn" onClick={() => setAiModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetMedRec;
