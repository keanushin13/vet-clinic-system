import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:5000/api`;

/* =========================
   AXIOS INSTANCE
========================= */
const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // REQUIRED for CSRF cookies
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* =========================
   INIT CSRF TOKEN
   Call ONCE on app load
========================= */
export const initCSRF = async () => {
  try {
    const res = await API.get("/users/csrf-token");
    API.defaults.headers.common["X-CSRF-Token"] = res.data.csrfToken;
  } catch (error) {
    console.error("Failed to initialize CSRF token", error);
  }
};

/* =========================
   OPTIONAL: RESET CSRF
   (use on logout)
========================= */
export const clearCSRF = () => {
  delete API.defaults.headers.common["X-CSRF-Token"];
};

// ─── USERS ────────────────────────────────────────────────────────────────────
export const getUsers = (params) => API.get("/users", { params });
export const getMe = () => API.get("/users/me");
export const updateMe = (data) => API.put("/users/me", data);
export const createUser = (data) => API.post("/users/create", data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/delete/${id}`);
export const updatePassword = (data) =>
  API.post("/users/update-password", data);
export const getStaffClients = () =>
  API.get("/users", { params: { role: "pet_owner" } });
export const createStaffClient = (data) => API.post("/users/create", data);
export const updateStaffClient = (id, data) => API.put(`/users/${id}`, data);
export const toggleStaffClientActive = (id) =>
  API.patch(`/users/${id}/toggle-active`);

// ─── PETS ─────────────────────────────────────────────────────────────────────
export const getPets = (params) => API.get("/pets", { params });
export const getPet = (id) => API.get(`/pets/${id}`);
export const createPet = (data) => API.post("/pets", data);
export const updatePet = (id, data) => API.put(`/pets/${id}`, data);
export const deletePet = (id) => API.delete(`/pets/${id}`);
export const restorePet = (id) => API.patch(`/pets/${id}/restore`);

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
export const getAppointments = (params) => API.get("/appointments", { params });
export const getAppointment = (id) => API.get(`/appointments/${id}`);
export const getAppointmentBillingSummary = (id) =>
  API.get(`/appointments/${id}/billing-summary`);
export const addAppointmentInventoryUsage = (id, data) =>
  API.post(`/appointments/${id}/inventory-usage`, data);
export const deleteAppointmentInventoryUsage = (id, usageId) =>
  API.delete(`/appointments/${id}/inventory-usage/${usageId}`);
export const createAppointment = (data) => API.post("/appointments", data);
export const updateAppointment = (id, data) =>
  API.patch(`/appointments/${id}`, data);
export const deleteAppointment = (id) => API.delete(`/appointments/${id}`);

// ─── VET SCHEDULES / AVAILABILITY ───────────────────────────────────────────
export const getAvailableVets = () => API.get("/vet-schedules/vets");
export const getMyVetSchedule = () => API.get("/vet-schedules/me");
export const updateMyVetSchedule = (weekly) =>
  API.put("/vet-schedules/me", { weekly });
export const createMyVetScheduleException = (data) =>
  API.post("/vet-schedules/me/exceptions", data);
export const getVetSchedule = (vetId) => API.get(`/vet-schedules/${vetId}`);
export const updateVetSchedule = (vetId, weekly) =>
  API.put(`/vet-schedules/${vetId}/weekly`, { weekly });
export const createVetScheduleException = (vetId, data) =>
  API.post(`/vet-schedules/${vetId}/exceptions`, data);
export const deleteVetScheduleException = (id) =>
  API.delete(`/vet-schedules/exceptions/${id}`);
export const getVetAvailableSlots = (vetId, date) =>
  API.get(`/vet-schedules/${vetId}/available-slots`, { params: { date } });

// ─── MEDICAL RECORDS ──────────────────────────────────────────────────────────
export const getMedicalRecords = (params) =>
  API.get("/medical-records", { params });
export const getMedicalRecord = (id) => API.get(`/medical-records/${id}`);
export const createMedicalRecord = (data) => API.post("/medical-records", data);
export const updateMedicalRecord = (id, data) =>
  API.put(`/medical-records/${id}`, data);
export const deleteMedicalRecord = (id) => API.delete(`/medical-records/${id}`);
export const restoreMedicalRecord = (id) =>
  API.patch(`/medical-records/${id}/restore`);
export const getMedicalRecordAiInsight = (id, refresh = false) =>
  API.post(
    `/medical-records/${id}/ai-insight${refresh ? "?refresh=true" : ""}`,
  );

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const getPayments = (params) => API.get("/payments", { params });
export const getPayment = (id) => API.get(`/payments/${id}`);
export const createPayment = (data) => API.post("/payments", data);
export const updatePayment = (id, data) => API.patch(`/payments/${id}`, data);
export const deletePayment = (id) => API.delete(`/payments/${id}`);
export const restorePayment = (id) => API.patch(`/payments/${id}/restore`);

// ─── INVENTORY ────────────────────────────────────────────────────────────────
export const getInventory = (params) => API.get("/inventory", { params });
export const createInventoryItem = (data) => API.post("/inventory", data);
export const updateInventoryItem = (id, data) =>
  API.put(`/inventory/${id}`, data);
export const updateStock = (id, stock) =>
  API.patch(`/inventory/${id}/stock`, { stock });
export const deleteInventoryItem = (id) => API.delete(`/inventory/${id}`);
export const restoreInventoryItem = (id) =>
  API.patch(`/inventory/${id}/restore`);
export const getInventoryAiAnalysis = (refresh = false) =>
  API.post(`/inventory/ai-analysis${refresh ? "?refresh=true" : ""}`);

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const getMessageThreads = () => API.get("/messages/threads");
export const getMessageThread = (userId) => API.get(`/messages/${userId}`);
export const sendMessage = (data) => API.post("/messages", data);
export const updateMessage = (id, data) => API.patch(`/messages/${id}`, data);
export const deleteMessage = (id) => API.delete(`/messages/${id}`);
export const markMessageRead = (id) => API.patch(`/messages/${id}/read`);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const getNotifications = () => API.get("/notifications");
export const markAllNotificationsRead = () =>
  API.patch("/notifications/mark-all-read");
export const markNotificationRead = (id) =>
  API.patch(`/notifications/${id}/read`);

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────
export const getActivityLogs = (params) =>
  API.get("/activity-logs", { params });

// ─── STATS ────────────────────────────────────────────────────────────────────
export const getAdminStats = () => API.get("/stats/admin");
export const getStaffStats = () => API.get("/stats/staff");
export const getVetStats = () => API.get("/stats/vet");
export const getPetOwnerStats = () => API.get("/stats/pet-owner");

export default API;
