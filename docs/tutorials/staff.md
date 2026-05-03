# Staff — Step‑by‑step Feature Guide

## Overview

Covers clinic staff flows: Appointments (calendar & list), Inventory management, Messages, Payments, Activity Log, Owner/Pet management, Vet schedules, and Profile.

## Prerequisites

- Logged-in account with `staff` role.

## Navigation (examples)

- Appointments: `/staff-appointments`
- User Management: `/staff-users`
- Owner pets: `/staff-users/:id/pets`
- Pets Profile: `/staff-pets`
- Messages: `/staff-messages`
- Vet Schedules: `/staff-vet-schedules`
- Inventory: `/staff-inventory`
- Payments: `/staff-payments`
- Activity: `/staff-activity`
- Profile: `/staff-profile`

---

## Appointments — Book / Edit / Cancel (Staff)

Goal: Manage all appointments, pick vets and available slots for clients.

Steps:

1. Open `Appointments` (`/staff-appointments`).
2. Toggle between **Calendar View** and **List View**.
3. Click **+ Book Appointment** to open the form.
4. Select `Pet` (from list), `Veterinarian`, `Date`, then pick an available `Slot`.
5. Fill `Reason` and `Notes`, then click **Book Appointment**.
6. To edit a booking: click the appointment in calendar or list → update fields → Save.
7. To cancel: click appointment → **Cancel** → confirm.

Expected: Appointment appears for the selected vet and owner; status updates as staff/vet confirms.

Troubleshooting: If slots are empty, confirm you selected a vet and a valid date.

---

## User Management — `/staff-users`

Goal: Manage pet owner accounts (create, view, edit, activate/deactivate) and navigate to owner pets.

What you'll see:

- A searchable list of clients showing name, contact, registered pets count, status, and actions (View Pets, View, Edit, Activate/Deactivate).

Steps — Common tasks:

1. Open `User Management` (`/staff-users`).
2. Use the search box to filter by name, email, or username.
3. Add a new client: click **+ Add New Client** → fill `Username` (required), `Email` (required), `Password` (required for new), optional `First Name`, `Last Name`, and `Phone` → **Save**.
4. View client details: click the eye/view icon → use **View Pets** to go to `/staff-users/:id/pets` for that owner.
5. Edit client: click the edit (pencil) icon → update fields; password is optional when editing.
6. Toggle active status: click the activate/deactivate icon to mark user `Active` or `Inactive`.

Notes & validations:

- Phone input uses country code `+63` and strips any leading `63` from input; enter the local 10-digit number.
- When adding a client, `username`, `email`, and `password` are required; the backend will return errors for duplicates.
- API helpers: `getStaffClients()`, `createStaffClient(data)`, `updateStaffClient(id, data)`, `toggleStaffClientActive(id)` (see `src/api/api.js`).

Troubleshooting:

- If creation fails with a duplicate email/username error, pick a unique username or check existing accounts.
- If the pets count appears incorrect, open **View Pets** to confirm the owner's pet list.

Verification checklist:

- You can create a new client and they appear in the list.
- View Pets navigates to `/staff-users/:id/pets` with the owner state.
- Toggling active correctly updates the status badge.

---

## Inventory

Goal: View and update inventory items.

Steps:

1. Open `Inventory` (`/staff-inventory`).
2. Search or filter by category.
3. Edit stock quantities or add usage records as needed.

Expected: Inventory shows up-to-date quantities and recent usage.

## Messages, Payments, Activity Log

- Messages: open `Messages` to reply to clients and vets.
- Activity Log: view audit entries in `Activity`.

### Payments — Detailed (Staff)

Goal: Create, modify, and manage payments for appointments and ad-hoc services.

What staff can do:

- Create new payment records (optionally linked to an appointment).
- Use appointment-based billing to auto-populate checkup + inventory totals.
- Mark payments as `Pending`, `Paid`, or `Refunded`.
- Archive/restore payment records.

Steps — Create a payment:

1. Open `Payments` (`/staff-payments`).
2. Click **+ Add Payment**.
3. (Optional) Enable **Appointment-based billing** and select an available appointment. The UI will fetch an **Appointment Summary** with:
   - Owner, Pet, Vet
   - Checkup rate
   - Inventory subtotal
   - Auto Total
4. Review the `Service` and `Amount`. If you override the auto-computed `Amount`, provide an **Adjustment Reason** (required when overriding).
5. Select `Method` (Cash, GCash, BankTransfer) and set `Status` to `Paid` or `Pending`.
6. Enter `Reference` (transaction id), `Notes`, then **Save**.

Steps — Edit / Archive / Restore:

1. From the transactions list, click the edit (pencil) icon to change service, amount, method, status, or notes.
2. Use the archive action to hide legacy/incorrect entries; archived payments can be restored.

API and validation notes:

- Endpoints: `GET /api/payments`, `POST /api/payments`, `PATCH /api/payments/:id`, `DELETE /api/payments/:id`, `PATCH /api/payments/:id/restore` (staff/admin only).
- When using appointment-based billing, the frontend calls `GET /api/payments/appointment-summary` (or similar) to compute totals — staff UI shows a billing summary before confirmation.
- If you change the `Amount` away from the auto total, the backend requires `adjustmentReason`.

Edge cases / Troubleshooting:

- If the billing summary fails to load, try reselecting the appointment or reload the page.
- If a payment is accidentally created with wrong amount, archive and recreate or edit and provide a clear `adjustmentReason`.

Verification checklist:

- You can create a payment linked to an appointment and see the auto total.
- Overriding the amount requires an adjustment reason.
- Archived payments are hidden from default lists and can be restored.

---

## Owner / Pet Management

Goal: From a user record, view associated pets and manage owner details.

Steps:

1. Open `User Management` (`/staff-users`).
2. Click a user → **View Pets** or navigate to `/staff-users/:id/pets`.
3. Use create/edit flows where available.

---

## Verification checklist

- Can create and cancel appointments.
- Inventory updates persist.
- Messages send and payment entries are visible.

_End of Staff guide._
