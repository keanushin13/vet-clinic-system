import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarUserMenu from "../../../components/TopbarUserMenu";
import "../../../css/AdminDashboard.css";
import AdminSidebar from "../../../components/AdminSidebar";
import { useSidebar } from "../../../components/useSidebar";
import { getAdminStats } from "../../../api/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ASSETS
import userIcon from "../../../assets/Profile.png";

const PIE_COLORS = ["#4f8cff", "#63c58d", "#f6b93b", "#e55353", "#a78bfa"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { isOpen, toggle, close } = useSidebar();
  const [stats, setStats] = useState({
    totalUsers: 0,
    monthlyRevenue: 0,
    activeAppointments: 0,
    lowStockCount: 0,
    usersByRole: {},
    totalPets: 0,
    topDiagnoses: [],
    revenueByMonth: [],
    appointmentsByMonth: [],
    appointmentsByStatus: {},
    expiringCount: 0,
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    getAdminStats()
      .then((r) => setStats((prev) => ({ ...prev, ...r.data })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build role pie data
  const rolePieData = Object.entries(stats.usersByRole || {}).map(
    ([name, value]) => ({ name, value }),
  );

  // Build appointment status pie data
  const apptStatusData = Object.entries(stats.appointmentsByStatus || {}).map(
    ([name, value]) => ({ name, value }),
  );

  return (
    <div className="dashboard-container">
      <AdminSidebar isOpen={isOpen} onClose={close} />

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
          <h2>Admin Dashboard</h2>
          <div className="top-bar-right">
            <TopbarUserMenu
              avatarSrc={userIcon}
              avatarAlt="Admin Profile"
              profilePath="/admin-profile"
            />
          </div>
        </header>

        <section className="content-body">
          <div className="welcome-section">
            <h3>System Overview</h3>
            <p>Monitoring clinic performance and user activity.</p>
          </div>

          {/* STATS GRID */}
          <div className="admin-stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span>Total Users</span>
                <h4>{stats.totalUsers.toLocaleString()}</h4>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-info">
                <span>Monthly Revenue</span>
                <h4>₱{Number(stats.monthlyRevenue).toLocaleString()}</h4>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-info">
                <span>Active Appointments</span>
                <h4>{stats.activeAppointments}</h4>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-info">
                <span>Low Stock Items</span>
                <h4>{stats.lowStockCount}</h4>
              </div>
            </div>
          </div>

          {/* USER ROLE MINI CARDS */}
          <div className="admin-role-cards">
            <div className="role-mini-card">
              <span className="role-mini-label">Veterinarians</span>
              <span className="role-mini-value">
                {stats.usersByRole?.veterinarian || 0}
              </span>
            </div>
            <div className="role-mini-card">
              <span className="role-mini-label">Staff</span>
              <span className="role-mini-value">
                {stats.usersByRole?.staff || 0}
              </span>
            </div>
            <div className="role-mini-card">
              <span className="role-mini-label">Pet Owners</span>
              <span className="role-mini-value">
                {stats.usersByRole?.pet_owner || 0}
              </span>
            </div>
            <div className="role-mini-card">
              <span className="role-mini-label">Total Pets</span>
              <span className="role-mini-value">{stats.totalPets || 0}</span>
            </div>
            <div className="role-mini-card orange">
              <span className="role-mini-label">Expiring Items</span>
              <span className="role-mini-value">
                {stats.expiringCount || 0}
              </span>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="admin-charts-row">
            {/* Revenue Line Chart */}
            <div className="chart-box">
              <h4>Revenue (Last 6 Months)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(v) => `₱${Number(v).toLocaleString()}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f8cff"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Appointments Bar Chart */}
            <div className="chart-box">
              <h4>Appointments (Last 6 Months)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.appointmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#63c58d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHARTS ROW */}
          <div className="admin-charts-row">
            {/* User Role Pie */}
            <div className="chart-box">
              <h4>Users by Role</h4>
              {rolePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={rolePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {rolePieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="chart-empty">No data</p>
              )}
            </div>

            {/* Appointment Status Pie */}
            <div className="chart-box">
              <h4>Appointments by Status</h4>
              {apptStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={apptStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {apptStatusData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="chart-empty">No data</p>
              )}
            </div>
          </div>

          {/* BOTTOM ROW: Top Diagnoses + Inventory Alerts */}
          <div className="admin-bottom-row">
            <div className="recent-box">
              <h4>Top Diagnoses</h4>
              {(stats.topDiagnoses || []).length === 0 ? (
                <p className="chart-empty">No data</p>
              ) : (
                <ol className="diagnosis-list">
                  {stats.topDiagnoses.map((d, i) => (
                    <li key={i} className="diagnosis-item">
                      <span className="diagnosis-name">{d.diagnosis}</span>
                      <span className="diagnosis-count">{d.count} cases</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="recent-box">
              <h4>Inventory Alerts</h4>
              <div className="inv-alert-row">
                <div className="inv-alert-card red-alert">
                  <span>Low Stock</span>
                  <strong>{stats.lowStockCount}</strong>
                </div>
                <div className="inv-alert-card orange-alert">
                  <span>Expiring Soon</span>
                  <strong>{stats.expiringCount}</strong>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                Visit{" "}
                <button
                  className="inline-link"
                  onClick={() => navigate("/admin-inventory")}
                >
                  Inventory
                </button>{" "}
                to manage.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
