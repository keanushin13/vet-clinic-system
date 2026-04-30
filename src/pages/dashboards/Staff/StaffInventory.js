import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/StaffInventory.css";
import "../../../css/responsive-tables.css";
import StaffSidebar from "../../../components/StaffSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getInventory,
  updateStock,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restoreInventoryItem,
  getInventoryAiAnalysis,
} from "../../../api/api";
import {
  INVENTORY_CATEGORY_OPTIONS,
  formatInventoryCategory,
  normalizeInventoryCategory,
} from "../../../constants/inventoryCategories";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const StaffInventory = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const pesoFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiModal, setAiModal] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Others",
    stock: 0,
    unit: "pcs",
    price: "",
    expirationDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!user || user.role !== "staff") {
      navigate("/login");
      return;
    }
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInventory = () =>
    getInventory({ includeArchived: true })
      .then((r) => setItems(r.data))
      .catch(() => {});

  const activeItems = items.filter((i) => !i.isArchived);
  const totalItems = activeItems.length;
  const lowStockCount = activeItems.filter(
    (i) => i.status === "LowStock",
  ).length;

  const openCreate = () => {
    setEditing(null);
    setError("");
    setForm({
      name: "",
      category: "Others",
      stock: 0,
      unit: "pcs",
      price: "",
      expirationDate: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setError("");
    setForm({
      name: item.name,
      category: normalizeInventoryCategory(item.category),
      stock: item.stock,
      unit: item.unit,
      price: item.price ?? "",
      expirationDate: item.expirationDate
        ? new Date(item.expirationDate).toISOString().slice(0, 10)
        : "",
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setError("");
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        stock: Number(form.stock),
        price: form.price === "" ? null : Number(form.price),
        expirationDate: form.expirationDate || null,
      };
      if (editing) {
        await updateInventoryItem(editing.id, payload);
      } else {
        await createInventoryItem(payload);
      }
      closeModal();
      await loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStock = async (item) => {
    const val = prompt(`Enter new stock for ${item.name}:`, item.stock);
    if (val === null || isNaN(val)) return;
    await updateStock(item.id, parseInt(val));
    loadInventory();
  };

  const toggleArchive = async (item) => {
    try {
      if (item.isArchived) await restoreInventoryItem(item.id);
      else await deleteInventoryItem(item.id);
      await loadInventory();
    } catch {
      setError("Failed to update item status");
    }
  };

  const openAiAnalysis = async (refresh = false) => {
    setAiModal({ insight: null, loading: true, error: "" });
    try {
      const res = await getInventoryAiAnalysis(refresh);
      setAiModal({ loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error:
          err.response?.data?.message ||
          "Failed to generate AI inventory analysis",
      }));
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
          <h2>Inventory Management</h2>
          <div className="top-bar-right">
            {/* Added the missing navigation handler here */}
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
          <div className="inventory-header">
            <div className="inventory-stats">
              <div className="stat-box">
                <span className="stat-label">Total Items</span>
                <span className="stat-num">{totalItems}</span>
              </div>
              <div className="stat-box warning">
                <span className="stat-label">Low Stock</span>
                <span className="stat-num">{lowStockCount}</span>
              </div>
            </div>
            <div className="inventory-header-actions">
              <button className="inv-ai-btn" onClick={() => openAiAnalysis()}>
                AI Analysis
              </button>
              <button className="add-item-btn" onClick={openCreate}>
                + Add New Item
              </button>
            </div>
          </div>

          <>
            <div className="inventory-card table-desktop">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Expiration Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="item-name-cell">{item.name}</td>
                      <td>
                        <span className="cat-badge">
                          {formatInventoryCategory(item.category)}
                        </span>
                      </td>
                      <td>
                        {item.stock} {item.unit}
                      </td>
                      <td>
                        {item.price === null || item.price === undefined
                          ? "-"
                          : pesoFormatter.format(Number(item.price))}
                      </td>
                      <td>
                        {item.expirationDate
                          ? new Date(item.expirationDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        <span
                          className={`stock-status ${item.status?.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="inventory-action-btns">
                          <button
                            className="stock-btn btn-neutral icon-btn"
                            onClick={() => handleUpdateStock(item)}
                            title="Update stock"
                            aria-label="Update stock"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M12 5v14M5 12h14"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="stock-btn btn-edit icon-btn"
                            onClick={() => openEdit(item)}
                            title="Edit item"
                            aria-label="Edit item"
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
                            className="stock-btn btn-remove icon-btn"
                            onClick={() => toggleArchive(item)}
                            title={
                              item.isArchived ? "Restore item" : "Archive item"
                            }
                            aria-label={
                              item.isArchived ? "Restore item" : "Archive item"
                            }
                          >
                            {item.isArchived ? (
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
              {items.map((item) => (
                <div className="inventory-card" key={item.id}>
                  <div className="inventory-card-header">
                    <div className="inventory-card-title">
                      <div className="inventory-card-name">{item.name}</div>
                      <span className="inventory-card-category">
                        {formatInventoryCategory(item.category)}
                      </span>
                    </div>
                  </div>
                  <div className="inventory-card-body">
                    <div className="inventory-card-row">
                      <span className="inventory-card-label">Quantity</span>
                      <span>
                        {item.stock} {item.unit}
                      </span>
                    </div>
                    <div className="inventory-card-row">
                      <span className="inventory-card-label">Price</span>
                      <span>
                        {item.price === null || item.price === undefined
                          ? "-"
                          : pesoFormatter.format(Number(item.price))}
                      </span>
                    </div>
                    <div className="inventory-card-row">
                      <span className="inventory-card-label">Expiration</span>
                      <span>
                        {item.expirationDate
                          ? new Date(item.expirationDate).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="inventory-card-row">
                      <span className="inventory-card-label">Status</span>
                      <span
                        className={`stock-status ${item.status?.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="inventory-card-row">
                      <span className="inventory-card-label">Actions</span>
                      <div className="inventory-action-btns">
                        <button
                          className="stock-btn btn-neutral icon-btn"
                          onClick={() => handleUpdateStock(item)}
                          title="Update stock"
                          aria-label="Update stock"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 5v14M5 12h14"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="stock-btn btn-edit icon-btn"
                          onClick={() => openEdit(item)}
                          title="Edit item"
                          aria-label="Edit item"
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
                          className="stock-btn btn-remove icon-btn"
                          onClick={() => toggleArchive(item)}
                          title={
                            item.isArchived ? "Restore item" : "Archive item"
                          }
                          aria-label={
                            item.isArchived ? "Restore item" : "Archive item"
                          }
                        >
                          {item.isArchived ? (
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
          {error && <p className="modal-error">{error}</p>}
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitForm} className="user-modal-form">
              <h3>{editing ? "Edit Inventory Item" : "Add Inventory Item"}</h3>
              <div className="form-group">
                <label>Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={onChange}
                  >
                    {INVENTORY_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={onChange}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    name="unit"
                    value={form.unit}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={form.price}
                    onChange={onChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    name="expirationDate"
                    value={form.expirationDate}
                    onChange={onChange}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input name="notes" value={form.notes} onChange={onChange} />
                </div>
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

      {aiModal && (
        <div className="modal-overlay" onClick={() => setAiModal(null)}>
          <div
            className="modal-box ai-insight-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-insight-header">
              <span className="ai-generated-badge">AI Generated</span>
              <h3>Inventory Intelligence Report</h3>
              <p className="ai-insight-subheading">
                Fast-moving products and near-expiry promotion opportunities.
              </p>
            </div>

            {aiModal.loading && (
              <div className="ai-insight-loading">
                <span className="ai-loading-spinner" />
                Generating inventory analysis...
              </div>
            )}

            {!aiModal.loading && aiModal.error && (
              <div className="ai-insight-error">{aiModal.error}</div>
            )}

            {!aiModal.loading && !aiModal.error && aiModal.insight && (
              <div className="ai-insight-body">
                <div className="ai-insight-content">
                  {aiModal.insight
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                </div>
                <div className="ai-disclaimer">{aiModal.disclaimer}</div>
                <div className="ai-meta">
                  {aiModal.fromCache
                    ? "Cached analysis · "
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
                  onClick={() => openAiAnalysis(true)}
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

export default StaffInventory;
