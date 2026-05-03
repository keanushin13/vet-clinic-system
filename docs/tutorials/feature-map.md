# Feature → Role Map

This file maps high-level features to the roles that can access them in the application: `admin`, `staff`, `veterinarian`, and `pet_owner`.

- Authentication (register, login, OTP, password reset): all roles (UI: `src/pages/*`, API: `routes/userRoutes.js`).
- User Management (create/edit/delete users): admin (UI: `src/pages/dashboards/Admin/AdminUserManagement.js`, API: `routes/userRoutes.js` — protected admin endpoints).
- Pet Management (add/edit/archive pet records): pet_owner, staff, admin (UI: `src/pages/dashboards/PetOwner/PetOwnerMyPets.js`, `src/pages/dashboards/Staff/StaffOwnerPets.js`, API: `routes/petRoutes.js`).
- Appointments (book, edit, cancel, calendar): pet_owner, staff, veterinarian, admin (UI: `PetOwnerAppointment.js`, `StaffAppointment.js`, `VetCalendar.js`; API: `routes/appointmentRoutes.js`).
- Vet Schedule / Calendar management: veterinarian, staff (UI: `src/pages/dashboards/Veterinary/VetSchedule.js`, `VetCalendar.js`; API: `routes/vetScheduleRoutes.js`).
- Medical Records (view/add/update): veterinarian, staff, admin; pet_owner (view only) (UI: `src/pages/dashboards/*/MedRec.js`; API: `routes/medicalRecordRoutes.js`).
- AI Medical Insight (generate summary from records): veterinarian, staff, admin, pet_owner (UI: `PetOwnerMyPets.js` AI modal; API likely under medical records controller).
- Inventory (view/update stock, usage): staff, veterinarian, admin (UI: `StaffInventory.js`, `VetInventory.js`; API: `routes/inventoryRoutes.js`).
- Payments (view/record/refund): staff, admin, pet_owner (view own payments) (UI: `StaffPaymentHistory.js`, `PetOwnerPayHis.js`; API: `routes/paymentRoutes.js`).
- Messages / Conversations: all roles (role-limited views) (UI: `*Messages.js`; API: `routes/messageRoutes.js`).
- Notifications: all roles (UI: `*Notif.js`; API: `routes/notificationRoutes.js`).
- Activity Logs / Audit: admin, staff (UI: `StaffActivityLog.js`; API: `routes/activityLogRoutes.js`).
- Stats / Dashboards: admin, staff, veterinarian (UI: `AdminDashboard.js`, `StaffDashboard.js`, `VetDashboard.js`; API: `routes/statsRoutes.js`).
- Profile / Account settings: all roles (UI: `src/pages/dashboards/*/*Profile.js`; API: `routes/profileRoutes.js`).
- CSRF token endpoint: frontend uses `GET /api/users/csrf-token` (see `server.js` + `routes/userRoutes.js`).

Notes:

- UI file locations referenced above live under `vet-clinic-system-thesis-fe/src/pages/dashboards/`.
- Protected API endpoints require authentication and role checks (see `vet-clinic-system-api/middleware/auth.js` and per-route `protect` / `authorizeRoles`).
- Use this mapping to prioritize which tutorial pages to expand for each role.
