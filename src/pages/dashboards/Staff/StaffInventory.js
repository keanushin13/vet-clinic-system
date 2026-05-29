import { useEffect, useState, useMemo } from "react";
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

const INV_LIMIT = 15;

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function expiryClass(dateStr) {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return "";
  if (days < 0) return "inv-expired";
  if (days <= 30) return "inv-expiring-soon";
  return "";
}

function buildInventoryCSV(rows, fmt) {
  const headers = ["Name", "Category", "Stock", "Unit", "Price", "Status", "Expiry Date"];
  const lines = [headers.join(",")];
  rows.forEach((i) => {
    lines.push([
      `"${i.name}"`,
      i.category,
      i.stock,
      i.unit,
      i.price != null ? fmt.format(Number(i.price)).replace(/,/g, "") : "",
      i.status,
      i.expirationDate ? new Date(i.expirationDate).toLocaleDateString() : "",
    ].join(","));
  });
  return lines.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [stockModal, setStockModal] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter / pagination state
  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [invExpiring, setInvExpiring] = useState(false);
  const [invPage, setInvPage] = useState(1);
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
  const lowStockCount = activeItems.filter((i) => i.status === "LowStock").length;

  // Filtered + paginated view
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (invSearch) {
        const q = invSearch.toLowerCase();
        if (!(i.name || "").toLowerCase().includes(q) && !(i.notes || "").toLowerCase().includes(q)) return false;
      }
      if (invCategory && i.category !== invCategory) return false;
      if (invStatus && i.status !== invStatus) return false;
      if (invExpiring) {
        const days = daysUntilExpiry(i.expirationDate);
        if (days === null || days > 30) return false;
      }
      return true;
    });
  }, [items, invSearch, invCategory, invStatus, invExpiring]);

  const invTotalPages = Math.max(1, Math.ceil(filtered.length / INV_LIMIT));
  const invPaginated = filtered.slice((invPage - 1) * INV_LIMIT, invPage * INV_LIMIT);

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
    setSaving(false);
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

  const handleUpdateStock = (item) => {
    setError("");
    setStockModal({
      item,
      value: String(item.stock ?? 0),
      error: "",
      saving: false,
    });
  };

  const closeStockModal = () => {
    setStockModal(null);
  };

  const submitStockUpdate = async (e) => {
    e.preventDefault();
    if (!stockModal?.item) return;

    const nextStock = Number(stockModal.value);
    if (stockModal.value.trim() === "" || !Number.isInteger(nextStock) || nextStock < 0) {
      setStockModal((prev) => prev && ({
        ...prev,
        error: "Stock must be a whole number of 0 or more.",
      }));
      return;
    }

    setStockModal((prev) => prev && ({
      ...prev,
      error: "",
      saving: true,
    }));

    try {
      await updateStock(stockModal.item.id, nextStock);
      await loadInventory();
      closeStockModal();
    } catch (err) {
      setStockModal((prev) => prev && ({
        ...prev,
        saving: false,
        error: err.response?.data?.message || "Failed to update stock",
      }));
    }
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
          <h2>Staff Inventory Management</h2>
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
              <button type="button" className="inv-ai-btn" onClick={() => openAiAnalysis()}>
                AI Analysis
              </button>
              <button
                type="button"
                className="inv-export-btn"
                onClick={() => downloadCSV(buildInventoryCSV(filtered, pesoFormatter), "inventory-report.csv")}
                disabled={filtered.length === 0}
              >
                Export CSV
              </button>
              <button type="button" className="add-item-btn" onClick={openCreate}>
                + Add New Item
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="inv-filter-bar">
            <input
              className="inv-search"
              placeholder="Search item name..."
              value={invSearch}
              onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
            />
            <select
              className="inv-filter-select"
              value={invCategory}
              onChange={(e) => { setInvCategory(e.target.value); setInvPage(1); }}
            >
              <option value="">All Categories</option>
              {INVENTORY_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="inv-filter-select"
              value={invStatus}
              onChange={(e) => { setInvStatus(e.target.value); setInvPage(1); }}
            >
              <option value="">All Status</option>
              <option value="InStock">In Stock</option>
              <option value="LowStock">Low Stock</option>
              <option value="OutOfStock">Out of Stock</option>
            </select>
            <label className="inv-expiry-check">
              <input
                type="checkbox"
                checked={invExpiring}
                onChange={(e) => { setInvExpiring(e.target.checked); setInvPage(1); }}
              />
              Expiring ≤30 days
            </label>
            {(invSearch || invCategory || invStatus || invExpiring) && (
              <button type="button" className="inv-reset-btn" onClick={() => { setInvSearch(""); setInvCategory(""); setInvStatus(""); setInvExpiring(false); setInvPage(1); }}>
                Reset
              </button>
            )}
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
                  {invPaginated.map((item) => (
                    <tr key={item.id} className={expiryClass(item.expirationDate)}>
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
                        {item.expirationDate ? (
                          <>
                            {new Date(item.expirationDate).toLocaleDateString()}
                            {(() => {
                              const d = daysUntilExpiry(item.expirationDate);
                              if (d === null) return null;
                              if (d < 0) return <span className="expiry-badge expired"> Expired</span>;
                              if (d <= 30) return <span className="expiry-badge expiring"> {d}d left</span>;
                              return null;
                            })()}
                          </>
                        ) : "—"}
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
                            type="button"
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
                            type="button"
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
                            type="button"
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
              {invPaginated.map((item) => (
                <div className={`inventory-card ${expiryClass(item.expirationDate)}`} key={item.id}>
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
                        {item.expirationDate ? (
                          <>
                            {new Date(item.expirationDate).toLocaleDateString()}
                            {(() => {
                              const d = daysUntilExpiry(item.expirationDate);
                              if (d === null) return null;
                              if (d < 0) return <span className="expiry-badge expired"> Expired</span>;
                              if (d <= 30) return <span className="expiry-badge expiring"> {d}d left</span>;
                              return null;
                            })()}
                          </>
                        ) : "—"}
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
                          type="button"
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
                          type="button"
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
                          type="button"
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
          {/* Pagination */}
          {invTotalPages > 1 && (
            <div className="inv-pagination">
              <button className="inv-page-btn" disabled={invPage === 1} onClick={() => setInvPage((p) => p - 1)}>Prev</button>
              <span className="inv-page-info">Page {invPage} of {invTotalPages} ({filtered.length} items)</span>
              <button className="inv-page-btn" disabled={invPage === invTotalPages} onClick={() => setInvPage((p) => p + 1)}>Next</button>
            </div>
          )}

          {error && <p className="modal-error">{error}</p>}
        </section>
      </main>

      {stockModal && (
        <div
          className="inventory-modal-overlay"
          onClick={closeStockModal}
          role="presentation"
        >
          <div
            className="inventory-modal-box stock-update-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-update-modal-title"
          >
            <form
              className="inventory-modal-form stock-update-form"
              onSubmit={submitStockUpdate}
            >
              <h3 id="stock-update-modal-title">Update Stock</h3>
              <p className="stock-modal-subtitle">{stockModal.item.name}</p>

              <div className="stock-summary-row">
                <span>Current stock</span>
                <strong>
                  {stockModal.item.stock} {stockModal.item.unit}
                </strong>
              </div>

              <div className="form-group">
                <label htmlFor="stock-update-input">New stock</label>
                <input
                  id="stock-update-input"
                  type="number"
                  min="0"
                  step="1"
                  value={stockModal.value}
                  autoFocus
                  onChange={(e) => {
                    const { value } = e.target;
                    setStockModal((prev) => prev && ({
                      ...prev,
                      value,
                      error: "",
                    }));
                  }}
                />
              </div>

              {stockModal.error && (
                <p className="inventory-modal-error">{stockModal.error}</p>
              )}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={closeStockModal}
                  disabled={stockModal.saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inventory-save-btn"
                  disabled={stockModal.saving}
                >
                  {stockModal.saving ? "Updating..." : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="inventory-modal-overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="inventory-modal-box inventory-form-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-item-modal-title"
          >
            <form onSubmit={submitForm} className="inventory-modal-form">
              <h3 id="inventory-item-modal-title">
                {editing ? "Edit Inventory Item" : "Add Inventory Item"}
              </h3>
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
              {error && <p className="inventory-modal-error">{error}</p>}
              <div className="inventory-modal-actions">
                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="inventory-save-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aiModal && (
        <div className="inventory-modal-overlay" onClick={() => setAiModal(null)}>
          <div
            className="inventory-modal-box ai-insight-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-insight-header">
              <span className="ai-generated-badge">AI Generated — Advisory Only</span>
              <h3>Inventory Intelligence Report</h3>
              <p className="ai-insight-subheading">
                Fast-moving products and near-expiry promotion opportunities.
              </p>
              <p className="ai-advisory-note">
                AI restocking suggestions are advisory only. Please verify before ordering.
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

            <div className="inventory-modal-actions">
              {!aiModal.loading && aiModal.insight && (
                <button
                  type="button"
                  className="inventory-cancel-btn"
                  onClick={() => openAiAnalysis(true)}
                >
                  Refresh
                </button>
              )}
              <button type="button" className="inventory-save-btn" onClick={() => setAiModal(null)}>
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
