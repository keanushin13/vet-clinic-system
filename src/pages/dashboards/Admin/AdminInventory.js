import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  updateStock,
  deleteInventoryItem,
  restoreInventoryItem,
  getInventoryAiAnalysis,
} from "../../../api/api";
import "../../../css/AdminInventory.css";
import userIcon from "../../../assets/Profile.png";

const CATEGORIES = [
  { value: "Medication",       label: "Medication" },
  { value: "Vaccine",          label: "Vaccine" },
  { value: "Vaccines",         label: "Vaccines" },
  { value: "Supplies",         label: "Supplies" },
  { value: "Grooming",         label: "Grooming" },
  { value: "Medical",          label: "Medical" },
  { value: "TestKits",         label: "Test Kits" },
  { value: "Antibiotics",      label: "Antibiotics" },
  { value: "Supplements",      label: "Supplements" },
  { value: "EyeDrops",         label: "Eye Drops" },
  { value: "EarDrops",         label: "Ear Drops" },
  { value: "AntiParasite",     label: "Anti-Parasite" },
  { value: "AntiInflammatory", label: "Anti-Inflammatory" },
  { value: "FoodSupplements",  label: "Food Supplements" },
  { value: "ShampooAndSoap",   label: "Shampoo & Soap" },
  { value: "Others",           label: "Others" },
];

const EMPTY_FORM = {
  name: "",
  category: "Supplies",
  quantity: 0,
  unit: "",
  reorderLevel: 5,
  price: "",
  expiryDate: "",
  description: "",
};

const STATUS_COLORS = {
  Available: "status-active",
  LowStock: "status-pending",
  OutOfStock: "status-suspended",
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function isExpiringSoon(d) {
  if (!d) return false;
  const diff = new Date(d) - new Date();
  return diff > 0 && diff < 30 * 24 * 3600 * 1000;
}

function buildCSV(rows) {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Quantity",
    "Unit",
    "Reorder Level",
    "Price",
    "Status",
    "Expiry Date",
  ];
  const lines = [headers.join(",")];
  for (const i of rows) {
    lines.push(
      [
        i.id,
        `"${i.name}"`,
        i.category,
        i.quantity,
        i.unit || "",
        i.reorderLevel || "",
        i.price || "",
        i.status,
        fmtDate(i.expiryDate),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export default function AdminInventory() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Modals
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | "stock"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockAdjust, setStockAdjust] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // AI Analysis
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (showArchived) params.includeArchived = "true";
      const r = await getInventory(params);
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, showArchived]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, showArchived]);

  const filtered = items.filter((i) => {
    if (expiringOnly && !isExpiringSoon(i.expiryDate)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.name || "").toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditTarget(null);
    setModalMode("add");
  };
  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category || "Supplies",
      quantity: item.quantity,
      unit: item.unit || "",
      reorderLevel: item.reorderLevel || 5,
      price: item.price || "",
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
      description: item.description || "",
    });
    setFormError("");
    setEditTarget(item);
    setModalMode("edit");
  };
  const openStock = (item) => {
    setStockAdjust("");
    setFormError("");
    setEditTarget(item);
    setModalMode("stock");
  };
  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        reorderLevel: Number(form.reorderLevel),
        price: form.price ? Number(form.price) : undefined,
      };
      if (modalMode === "add") await createInventoryItem(payload);
      else await updateInventoryItem(editTarget.id, payload);
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStockSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await updateStock(editTarget.id, { quantity: Number(stockAdjust) });
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Stock update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this item?")) return;
    try {
      await deleteInventoryItem(id);
      load();
    } catch {
      /* ignore */
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreInventoryItem(id);
      load();
    } catch {
      /* ignore */
    }
  };

  const exportCSV = () => {
    const csv = buildCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiError("");
    setAiText("");
    setAiOpen(true);
    try {
      const r = await getInventoryAiAnalysis();
      let text =
        r.data?.suggestions ||
        r.data?.analysis ||
        r.data?.insight ||
        JSON.stringify(r.data);

      // If text is a JSON string, try to parse it
      if (typeof text === "string" && text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text);
          text =
            parsed.insight ||
            parsed.suggestions ||
            parsed.analysis ||
            JSON.stringify(parsed);
        } catch {
          // If parsing fails, use as-is
        }
      }

      // Replace escaped newlines with actual newlines
      if (typeof text === "string") {
        text = text.replace(/\\n/g, "\n");
      }

      setAiText(text);
    } catch (err) {
      setAiError(err.response?.data?.message || "AI analysis failed");
    } finally {
      setAiLoading(false);
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
          <h2>Inventory</h2>
          <div className="top-bar-right">
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          {/* AI Analysis Panel */}
          {aiOpen && (
            <div className="inv-ai-panel">
              <div className="inv-ai-header">
                <span>🤖 AI Inventory Analysis</span>
                <button className="cancel-btn" onClick={() => setAiOpen(false)}>
                  ✕
                </button>
              </div>
              {aiLoading ? (
                <p>Analyzing inventory…</p>
              ) : aiError ? (
                <p className="form-error">{aiError}</p>
              ) : (
                <p className="inv-ai-text">{aiText}</p>
              )}
            </div>
          )}

          <div className="appt-card">
            <div className="appt-toolbar">
              <input
                className="appt-search"
                placeholder="Search name, category…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="appt-filter-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label className="show-deleted-toggle">
                <input
                  type="checkbox"
                  checked={expiringOnly}
                  onChange={(e) => {
                    setExpiringOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                Expiring Soon
              </label>
              <label className="show-deleted-toggle">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => {
                    setShowArchived(e.target.checked);
                    setPage(1);
                  }}
                />
                Show Archived
              </label>
              <button className="export-btn" onClick={exportCSV}>
                ⬇ Export CSV
              </button>
              <button className="ai-btn" onClick={runAI}>
                🤖 AI Analysis
              </button>
              <button className="add-user-btn" onClick={openAdd}>
                + Add Item
              </button>
            </div>
            <div className="table-summary">{filtered.length} item(s)</div>

            <div className="user-table-wrapper table-desktop">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Reorder</th>
                    <th>Status</th>
                    <th>Expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="empty-row">
                        Loading…
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-row">
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.isArchived
                            ? "row-deleted"
                            : isExpiringSoon(item.expiryDate)
                              ? "row-expiring"
                              : ""
                        }
                      >
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit || "—"}</td>
                        <td>{item.reorderLevel || "—"}</td>
                        <td>
                          <span
                            className={`status-pill ${STATUS_COLORS[item.status] || ""}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {fmtDate(item.expiryDate)}
                          {isExpiringSoon(item.expiryDate) && (
                            <span className="expiry-warn"> ⚠</span>
                          )}
                        </td>
                        <td>
                          <div className="action-btns">
                            {!item.isArchived && (
                              <>
                                <button
                                  className="edit-btn icon-btn"
                                  title="Edit"
                                  onClick={() => openEdit(item)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none">
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
                                  className="activate-btn icon-btn"
                                  title="Adjust Stock"
                                  onClick={() => openStock(item)}
                                >
                                  📦
                                </button>
                                <button
                                  className="delete-btn icon-btn"
                                  title="Archive"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none">
                                    <path
                                      d="M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                            {item.isArchived && (
                              <button
                                className="restore-btn icon-btn"
                                title="Restore"
                                onClick={() => handleRestore(item.id)}
                              >
                                ↺
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="table-mobile table-cards-list">
              {loading ? (
                <p className="empty-row">Loading…</p>
              ) : paginated.length === 0 ? (
                <p className="empty-row">No items found.</p>
              ) : (
                paginated.map((item) => (
                  <div
                    className="user-card"
                    key={item.id}
                    style={item.isArchived ? { opacity: 0.6 } : {}}
                  >
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        {item.name.charAt(0)}
                      </div>
                      <div className="user-card-name">{item.name}</div>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row">
                        <span className="user-card-label">Category</span>
                        <span>{item.category}</span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Qty / Reorder</span>
                        <span>
                          {item.quantity} / {item.reorderLevel}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Status</span>
                        <span
                          className={`status-pill ${STATUS_COLORS[item.status] || ""}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Expiry</span>
                        <span>
                          {fmtDate(item.expiryDate)}
                          {isExpiringSoon(item.expiryDate) && " ⚠"}
                        </span>
                      </div>
                      <div className="user-card-row">
                        <span className="user-card-label">Actions</span>
                        <div className="action-btns">
                          {!item.isArchived && (
                            <>
                              <button
                                className="edit-btn icon-btn"
                                onClick={() => openEdit(item)}
                              >
                                ✎
                              </button>
                              <button
                                className="activate-btn icon-btn"
                                onClick={() => openStock(item)}
                              >
                                📦
                              </button>
                              <button
                                className="delete-btn icon-btn"
                                onClick={() => handleDelete(item.id)}
                              >
                                🗑
                              </button>
                            </>
                          )}
                          {item.isArchived && (
                            <button
                              className="restore-btn icon-btn"
                              onClick={() => handleRestore(item.id)}
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-row">
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add/Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === "add" ? "Add Inventory Item" : "Edit Item"}</h3>
            <form onSubmit={handleSubmit}>
              <label>Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <label>Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={form.quantity}
                onChange={handleChange}
                required
              />
              <label>Unit</label>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. pcs, ml, kg"
              />
              <label>Reorder Level</label>
              <input
                type="number"
                name="reorderLevel"
                min="0"
                value={form.reorderLevel}
                onChange={handleChange}
              />
              <label>Price</label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
              />
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
              />
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
              />
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {modalMode === "stock" && editTarget && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust Stock — {editTarget.name}</h3>
            <p>
              Current quantity: <strong>{editTarget.quantity}</strong>
            </p>
            <form onSubmit={handleStockSave}>
              <label>New Quantity *</label>
              <input
                type="number"
                min="0"
                value={stockAdjust}
                onChange={(e) => setStockAdjust(e.target.value)}
                required
              />
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? "Saving…" : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
