# Staff — Step‑by‑step Feature Guide

## Overview

Covers clinic staff flows: Appointments (calendar & list), Inventory management, Messages, Payments, Activity Log, Owner/Pet management, Vet schedules, and Profile.

## Prerequisites

- Logged-in account with `staff` role.

## Navigation (examples)

- Appointments: `/staff-appointments`
- Inventory: `/staff-inventory`
- Messages: `/staff-messages`
- Payments: `/staff-payments`
- Activity: `/staff-activity`
- Owner pets: `/staff-users/:id/pets`
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

Screenshot placeholder: booking modal + calendar.

Video script bullet: "Staff dashboard → Book appointment for owner → verify on calendar."

---

## Inventory

Goal: View and update inventory items.

Steps:

1. Open `Inventory` (`/staff-inventory`).
2. Search or filter by category.
3. Edit stock quantities or add usage records as needed.

Expected: Inventory shows up-to-date quantities and recent usage.

Video script bullet: "Open Inventory → update stock for an item → show updated quantity."

---

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

Video script bullet: "Staff → Add Payment → show appointment-based billing summary → save as Paid."

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

_End of Staff guide (placeholder screenshots)._
