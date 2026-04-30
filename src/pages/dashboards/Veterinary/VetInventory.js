import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/VetInventory.css";
import VetSidebar from "../../../components/VetSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getInventory, getInventoryAiAnalysis } from "../../../api/api";
import { formatInventoryCategory } from "../../../constants/inventoryCategories";

// ASSETS
import bellIcon from "../../../assets/Bell_Icon.png";
import userIcon from "../../../assets/Profile.png";

const VetInventory = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const { isOpen, toggle, close } = useSidebar();
  const pesoFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

  const [items, setItems] = useState([]);
  const [aiModal, setAiModal] = useState(null);

  // FUNCTION: Guard Clause (Matches your PetOwner format)
  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/login");
      return;
    }
    getInventory()
      .then((r) => setItems(r.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAiAnalysis = async () => {
    setAiModal({ insight: null, loading: true, error: "" });
    try {
      const res = await getInventoryAiAnalysis(false);
      setAiModal({ loading: false, error: "", ...res.data });
    } catch (err) {
      setAiModal((prev) => ({
        ...prev,
        loading: false,
        error:
          err.response?.data?.message || "Failed to load AI inventory analysis",
      }));
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
          <h2>Clinic Inventory</h2>
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
          <div className="dashboard-header-action">
            <h3
              style={{
                fontFamily: "Poppins",
                fontWeight: "600",
                marginBottom: "15px",
              }}
            >
              Supply Management
            </h3>
            <p style={{ color: "#555", marginBottom: "25px" }}>
              Monitor and manage your medical supplies and pharmaceutical stock.
            </p>
            <button className="inv-ai-btn" onClick={openAiAnalysis}>
              AI Analysis
            </button>
          </div>

          <div
            className="inventory-card"
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "15px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                  <th style={{ padding: "15px", color: "#255065" }}>
                    Item Name
                  </th>
                  <th style={{ padding: "15px", color: "#255065" }}>
                    Category
                  </th>
                  <th style={{ padding: "15px", color: "#255065" }}>
                    Stock Level
                  </th>
                  <th style={{ padding: "15px", color: "#255065" }}>Price</th>
                  <th style={{ padding: "15px", color: "#255065" }}>
                    Expiration
                  </th>
                  <th style={{ padding: "15px", color: "#255065" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #f9f9f9" }}
                  >
                    <td style={{ padding: "15px", fontWeight: "500" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {formatInventoryCategory(item.category)}
                    </td>
                    <td style={{ padding: "15px" }}>{item.stock} units</td>
                    <td style={{ padding: "15px" }}>
                      {item.price === null || item.price === undefined
                        ? "-"
                        : pesoFormatter.format(Number(item.price))}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {item.expirationDate
                        ? new Date(item.expirationDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <span
                        style={{
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          backgroundColor:
                            item.status === "In Stock"
                              ? "#dcfce7"
                              : item.status === "Low Stock"
                                ? "#fef9c3"
                                : "#fee2e2",
                          color:
                            item.status === "In Stock"
                              ? "#166534"
                              : item.status === "Low Stock"
                                ? "#854d0e"
                                : "#991b1b",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

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
                Loading cached inventory analysis...
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

export default VetInventory;
