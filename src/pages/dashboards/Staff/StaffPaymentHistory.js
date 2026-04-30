import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffPaymentHistory.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  createPayment,
  deletePayment,
  getAppointmentBillingSummary,
  getAppointments,
  getPayments,
  getPets,
  restorePayment,
  updatePayment,
} from "../../../api/api";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffPaymentHistory = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();

  const [payments, setPayments] = useState([]);
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [linkedAppointmentIds, setLinkedAppointmentIds] = useState([]);
  const [showArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useAppointmentMode, setUseAppointmentMode] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [billingSummary, setBillingSummary] = useState(null);
  const [form, setForm] = useState({
    appointmentId: "",
    petId: "",
    service: "",
    amount: "",
    method: "Cash",
    status: "Pending",
    reference: "",
    notes: "",
    adjustmentReason: "",
  });
  const [expandedStatus, setExpandedStatus] = useState({
    Paid: false,
    Pending: true,
    Refunded: false,
  });

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadData(showArchived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const loadData = async (includeArchived = false) => {
    setError("");
    try {
      const [paymentRes, petRes, appointmentRes, allPaymentRes] =
        await Promise.all([
          getPayments({ includeArchived }),
          getPets(),
          getAppointments(),
          getPayments({ includeArchived: true }),
        ]);
      setPayments(paymentRes.data || []);
      setLinkedAppointmentIds(
        (allPaymentRes.data || [])
          .map((payment) => payment.appointment?.id)
          .filter(Boolean),
      );
      setPets(petRes.data || []);
      setAppointments(appointmentRes.data || []);
    } catch {
      setError("Failed to load payments");
    }
  };

  const availableAppointments = appointments.filter(
    (appointment) =>
      !linkedAppointmentIds.includes(appointment.id) &&
      String(appointment.status || "").toLowerCase() !== "cancelled",
  );

  const totalRevenue = payments
    .filter((p) => !p.isArchived && p.status === "Paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingAmount = payments
    .filter((p) => !p.isArchived && p.status === "Pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const ownerName =
      `${p.owner?.firstName || ""} ${p.owner?.lastName || ""}`.trim() ||
      p.owner?.username ||
      "";
    const query = search.toLowerCase();
    return (
      p.id.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      (p.service || "").toLowerCase().includes(query) ||
      (p.status || "").toLowerCase().includes(query)
    );
  });

  // Group payments by status
  const groupedPayments = filteredPayments.reduce((acc, payment) => {
    const status = payment.status || "Pending";
    if (!acc[status]) acc[status] = [];
    acc[status].push(payment);
    return acc;
  }, {});

  // Define status order for consistent display
  const statusOrder = ["Pending", "Paid", "Refunded"];
  const sortedStatuses = statusOrder.filter(
    (s) => groupedPayments[s]?.length > 0,
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
      Paid: { icon: "✓", color: "#4caf50" },
      Pending: { icon: "⏳", color: "#ff9800" },
      Refunded: { icon: "↺", color: "#607d8b" },
    };
    return configs[status] || configs.Pending;
  };

  const getPetDisplayById = (petId) => {
    const pet = pets.find((p) => p.id === petId);
    return pet ? `${pet.name} (${pet.species})` : "Unknown Pet";
  };

  const getDisplayedAutoTotal = () => {
    if (!billingSummary) return 0;
    const enteredAmount = Number(form.amount);
    if (
      form.amount !== "" &&
      Number.isFinite(enteredAmount) &&
      enteredAmount >= 0
    ) {
      return enteredAmount;
    }
    return Number(billingSummary.total || 0);
  };

  const formatAppointmentOption = (appointment) => {
    const ownerName = appointment.owner
      ? `${appointment.owner.firstName ?? ""} ${appointment.owner.lastName ?? ""}`.trim() ||
        appointment.owner.username
      : "Unknown Owner";

    return `${new Date(appointment.scheduledAt).toLocaleString()} - ${appointment.pet?.name || "Unknown Pet"} (${ownerName})`;
  };

  const fetchAppointmentSummary = async (appointmentId) => {
    if (!appointmentId) {
      setBillingSummary(null);
      return;
    }

    setLoadingSummary(true);
    try {
      const { data } = await getAppointmentBillingSummary(appointmentId);
      setBillingSummary(data);
      setForm((prev) => ({
        ...prev,
        appointmentId,
        petId: data.appointment?.pet?.id || prev.petId,
        service:
          prev.service || data.appointment?.reason || "Veterinary Checkup",
        amount:
          prev.amount && Number(prev.amount) > 0
            ? prev.amount
            : String(data.total ?? ""),
      }));
    } catch (err) {
      setBillingSummary(null);
      setError(err.response?.data?.message || "Failed to load billing summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setUseAppointmentMode(true);
    setBillingSummary(null);
    setForm({
      appointmentId: "",
      petId: pets[0]?.id || "",
      service: "",
      amount: "",
      method: "Cash",
      status: "Pending",
      reference: "",
      notes: "",
      adjustmentReason: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (payment) => {
    setEditing(payment);
    setUseAppointmentMode(Boolean(payment.appointment?.id));
    setBillingSummary(null);
    setForm({
      appointmentId: payment.appointment?.id || "",
      petId: payment.petId || payment.pet?.id || "",
      service: payment.service || "",
      amount: String(payment.amount ?? ""),
      method: payment.method || "Cash",
      status: payment.status || "Pending",
      reference: payment.reference || "",
      notes: payment.notes || "",
      adjustmentReason: payment.adjustmentReason || "",
    });
    setError("");
    setShowModal(true);

    if (payment.appointment?.id) {
      fetchAppointmentSummary(payment.appointment.id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setSaving(false);
    setLoadingSummary(false);
    setBillingSummary(null);
    setError("");
  };

  const onChange = async (e) => {
    const { name, value } = e.target;

    if (name === "appointmentId") {
      setForm((prev) => ({ ...prev, appointmentId: value }));
      await fetchAppointmentSummary(value);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (useAppointmentMode && !editing && !form.appointmentId) {
      setError(
        "Please select an appointment or turn off appointment-based billing",
      );
      return;
    }

    if (!form.petId || !form.service || !form.amount) {
      setError("Pet, service, and amount are required");
      return;
    }

    if (
      useAppointmentMode &&
      form.appointmentId &&
      billingSummary &&
      Math.abs(Number(form.amount) - Number(billingSummary.total || 0)) >
        0.009 &&
      !form.adjustmentReason
    ) {
      setError(
        "Adjustment reason is required when overriding auto-computed total",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updatePayment(editing.id, {
          service: form.service,
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
          reference: form.reference,
          notes: form.notes,
          adjustmentReason: form.adjustmentReason,
        });
      } else {
        await createPayment({
          appointmentId: useAppointmentMode
            ? form.appointmentId || undefined
            : undefined,
          petId: form.petId,
          service: form.service,
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
          reference: form.reference,
          notes: form.notes,
          adjustmentReason: form.adjustmentReason,
        });
      }
      closeModal();
      await loadData(showArchived);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (payment) => {
    try {
      if (payment.isArchived) await restorePayment(payment.id);
      else await deletePayment(payment.id);
      await loadData(showArchived);
    } catch {
      setError("Failed to update payment status");
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
          <h2>Payment History</h2>
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
          <div className="payment-summary-row">
            <div className="summary-card">
              <span>Total Revenue (Feb)</span>
              <h3>
                ₱
                {totalRevenue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="summary-card">
              <span>Pending Payments</span>
              <h3>
                ₱
                {pendingAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </h3>
            </div>
          </div>

          <div className="payment-table-card">
            <div className="table-header">
              <h3>Transaction Records</h3>
              <div className="table-header-actions">
                <input
                  type="text"
                  placeholder="Search by Transaction ID or Owner..."
                  className="payment-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {/* <label className="archived-toggle">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived
                </label> */}
                <button className="add-payment-btn" onClick={openCreate}>
                  + Add Payment
                </button>
              </div>
            </div>

            {sortedStatuses.length > 0 ? (
              sortedStatuses.map((status) => {
                const statusConfig = getStatusConfig(status);
                const isExpanded = expandedStatus[status];

                return (
                  <div className="status-group" key={status}>
                    <button
                      className="status-group-header"
                      onClick={() => toggleStatus(status)}
                      aria-expanded={isExpanded}
                    >
                      <div className="status-header-left">
                        <span
                          className="status-icon"
                          style={{ color: statusConfig.color }}
                        >
                          {statusConfig.icon}
                        </span>
                        <span className="status-title">{status}</span>
                        <span className="status-count">
                          {groupedPayments[status]?.length}
                        </span>
                      </div>
                      <span className="status-toggle-icon" aria-hidden="true">
                        ▾
                      </span>
                    </button>

                    {isExpanded && (
                      <>
                        <div className="table-desktop">
                          <table className="payment-table">
                            <thead>
                              <tr>
                                <th>Txn ID</th>
                                <th>Pet Owner</th>
                                <th>Service</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupedPayments[status]?.map((p) => (
                                <tr key={p.id}>
                                  <td className="txn-id">
                                    TXN-{p.id.slice(-6).toUpperCase()}
                                  </td>
                                  <td>
                                    <div className="owner-info">
                                      <strong>
                                        {p.owner
                                          ? `${p.owner.firstName ?? ""} ${p.owner.lastName ?? ""}`.trim() ||
                                            p.owner.username
                                          : "—"}
                                      </strong>
                                      <span>{p.pet?.name}</span>
                                    </div>
                                  </td>
                                  <td>{p.service}</td>
                                  <td className="amount-cell">
                                    ₱{Number(p.amount).toLocaleString()}
                                  </td>
                                  <td>
                                    {new Date(p.createdAt).toLocaleDateString()}
                                  </td>
                                  <td>
                                    <span
                                      className={`payment-status ${p.status?.toLowerCase()}`}
                                    >
                                      {p.status}
                                    </span>
                                    {p.isArchived && (
                                      <span className="payment-status archived">
                                        Archived
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="action-btns">
                                      <button
                                        className="receipt-btn icon-btn"
                                        onClick={() => openEdit(p)}
                                        disabled={p.isArchived}
                                        title="Edit payment"
                                        aria-label="Edit payment"
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
                                        className="receipt-btn btn-muted icon-btn"
                                        onClick={() => toggleArchive(p)}
                                        title={
                                          p.isArchived
                                            ? "Restore payment"
                                            : "Archive payment"
                                        }
                                        aria-label={
                                          p.isArchived
                                            ? "Restore payment"
                                            : "Archive payment"
                                        }
                                      >
                                        {p.isArchived ? (
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
                          {groupedPayments[status]?.map((p) => (
                            <div className="payment-card" key={p.id}>
                              <div className="payment-card-header">
                                <div className="payment-card-title">
                                  <div className="payment-card-id">
                                    TXN-{p.id.slice(-6).toUpperCase()}
                                  </div>
                                  <div className="payment-card-owner">
                                    {p.owner
                                      ? `${p.owner.firstName ?? ""} ${p.owner.lastName ?? ""}`.trim() ||
                                        p.owner.username
                                      : "—"}
                                  </div>
                                </div>
                                <div className="payment-card-amount">
                                  ₱{Number(p.amount).toLocaleString()}
                                </div>
                              </div>
                              <div className="payment-card-body">
                                <div className="payment-card-row">
                                  <span className="payment-card-label">
                                    Pet
                                  </span>
                                  <span>{p.pet?.name || "—"}</span>
                                </div>
                                <div className="payment-card-row">
                                  <span className="payment-card-label">
                                    Service
                                  </span>
                                  <span>{p.service}</span>
                                </div>
                                <div className="payment-card-row">
                                  <span className="payment-card-label">
                                    Date
                                  </span>
                                  <span>
                                    {new Date(p.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="payment-card-row">
                                  <span className="payment-card-label">
                                    Status
                                  </span>
                                  <span
                                    className={`payment-status ${p.status?.toLowerCase()}`}
                                  >
                                    {p.status}
                                  </span>
                                </div>
                                {p.isArchived && (
                                  <div className="payment-card-row">
                                    <span className="payment-card-label">
                                      Archive
                                    </span>
                                    <span className="payment-status archived">
                                      Archived
                                    </span>
                                  </div>
                                )}
                                <div className="payment-card-row">
                                  <span className="payment-card-label">
                                    Actions
                                  </span>
                                  <div className="action-btns">
                                    <button
                                      className="receipt-btn icon-btn"
                                      onClick={() => openEdit(p)}
                                      disabled={p.isArchived}
                                      title="Edit payment"
                                      aria-label="Edit payment"
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
                                      className="receipt-btn btn-muted icon-btn"
                                      onClick={() => toggleArchive(p)}
                                      title={
                                        p.isArchived
                                          ? "Restore payment"
                                          : "Archive payment"
                                      }
                                      aria-label={
                                        p.isArchived
                                          ? "Restore payment"
                                          : "Archive payment"
                                      }
                                    >
                                      {p.isArchived ? (
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
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="list-placeholder">No payments found.</p>
            )}
            {error && <p className="modal-error">{error}</p>}
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form className="user-modal-form" onSubmit={onSubmit}>
              <h3>{editing ? "Edit Payment" : "Add Payment"}</h3>

              {!editing && (
                <div className="form-group">
                  <label className="archived-toggle">
                    <input
                      type="checkbox"
                      checked={useAppointmentMode}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setUseAppointmentMode(enabled);
                        setBillingSummary(null);
                        setError("");
                        setForm((prev) => ({
                          ...prev,
                          appointmentId: "",
                          adjustmentReason: "",
                          amount: enabled ? "" : prev.amount,
                        }));
                      }}
                      disabled={Boolean(editing && form.appointmentId)}
                    />
                    Appointment-based billing
                  </label>
                </div>
              )}

              {useAppointmentMode && !editing && (
                <div className="form-group">
                  <label>Appointment</label>
                  <select
                    name="appointmentId"
                    value={form.appointmentId}
                    onChange={onChange}
                  >
                    <option value="">Select appointment</option>
                    {availableAppointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {formatAppointmentOption(appointment)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(form.appointmentId || (editing && useAppointmentMode)) && (
                <div className="form-group">
                  <label>Appointment Summary</label>
                  <div className="billing-summary-box">
                    {loadingSummary ? (
                      <p>Loading billing summary...</p>
                    ) : billingSummary ? (
                      <>
                        <p>
                          Owner: {billingSummary.appointment?.owner?.firstName}{" "}
                          {billingSummary.appointment?.owner?.lastName}
                        </p>
                        <p>Pet: {billingSummary.appointment?.pet?.name}</p>
                        <p>
                          Vet: {billingSummary.appointment?.vet?.firstName}{" "}
                          {billingSummary.appointment?.vet?.lastName}
                        </p>
                        <p>
                          Checkup Rate: ₱
                          {Number(
                            billingSummary.checkupRate || 0,
                          ).toLocaleString()}
                        </p>
                        <p>
                          Inventory Subtotal: ₱
                          {Number(
                            billingSummary.inventorySubtotal || 0,
                          ).toLocaleString()}
                        </p>
                        <p>
                          Auto Total: ₱
                          {getDisplayedAutoTotal().toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p>No summary available</p>
                    )}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Pet</label>
                  {editing || (useAppointmentMode && form.petId) ? (
                    <input
                      type="text"
                      value={getPetDisplayById(form.petId)}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5", cursor: "default" }}
                    />
                  ) : (
                    <select
                      name="petId"
                      value={form.petId}
                      onChange={onChange}
                      required
                    >
                      <option value="">Select pet</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Service</label>
                  <input
                    name="service"
                    value={form.service}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="amount"
                    value={form.amount}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Method</label>
                  <select name="method" value={form.method} onChange={onChange}>
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="BankTransfer">BankTransfer</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={onChange}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input
                    name="reference"
                    value={form.reference}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={form.notes} onChange={onChange} />
              </div>

              {(useAppointmentMode || Boolean(editing?.appointment?.id)) && (
                <div className="form-group">
                  <label>
                    Adjustment Reason (required if amount is overridden)
                  </label>
                  <input
                    name="adjustmentReason"
                    value={form.adjustmentReason}
                    onChange={onChange}
                    placeholder="e.g., Manual discount approved by admin"
                  />
                </div>
              )}

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

export default StaffPaymentHistory;
