# Pet Owner — Step‑by‑step Feature Guide

## Overview

This guide covers the Pet Owner web flows: Dashboard, My Pets, Book Appointment, Messages, Medical Records, Payments, Notifications, and Profile. Each section includes exact UI steps, verification, screenshot placeholders, and a short video script bullet.

## Prerequisites

- Have an account with role `pet_owner` and be logged in.
- Frontend running at `http://localhost:3000` (or your `CLIENT_URL`).

## Navigation

- Dashboard: `/pet-owner`
- Appointments: `/pet-owner-appointments`
- My Pets: `/pet-owner-pets`
- Messages: `/pet-owner-messages`
- Medical Records: `/pet-owner-records`
- Payments History: `/pet-owner-payments`
- Notifications: `/pet-owner-notifications`
- Profile: `/pet-owner-profile`

---

## My Pets — Add / Edit / Archive

Goal: Manage your pets and view quick AI health insight.

Steps:

1. Open `My Pets` (`/pet-owner-pets`).
2. Click **+ Add New Pet**.
3. Fill the form: `Name` (required), `Species` (required), optional `Breed`, `Age`, `Gender`, `Status`, `Notes`.
4. Click **Add Pet**. Wait for the success state and the list to refresh.
5. To edit a pet: click the edit icon next to the pet → modify fields → **Save Changes**.
6. To archive a pet: click the delete/archive icon → confirm the prompt.
7. To get AI insight: click the AI icon on a pet row; if no records exist the app will notify you.

Expected result: New/updated pet appears in the list; archive removes it from active list.

Troubleshooting:

- If saving fails, check the error message displayed above the table. Common cause: missing required fields.

---

## Book Appointment (Calendar / List)

Goal: Book, edit, or cancel vet appointments.

Steps:

1. Open `Appointments` (`/pet-owner-appointments`).
2. Click **+ Book New Appointment**.
3. In the modal choose: `Pet` (from your pets), `Veterinarian`, `Date`, then pick an available `Time slot`.
4. Enter `Reason` and optional `Notes`.
5. Click **Book Appointment** (button label shows booking state).
6. To edit: click an appointment in list or calendar → change fields → save.
7. To cancel: click an appointment → **Cancel** → confirm.

Expected result: Appointment appears in your calendar or list and receives a status (Pending → Confirmed).

Troubleshooting:

- If no slots show, change date or pick a different veterinarian.

---

## Messages

Goal: Send and read messages with clinic staff.

Steps:

1. Open `Messages` (`/pet-owner-messages`).
2. Select a conversation or start a new one (UI dependent).
3. Type message and press Enter or send button.

Expected result: Message is posted and visible in the thread.

---

## Medical Records & AI Insight

Goal: View your pet's medical records and request an AI health summary.

Steps:

1. Open `Medical Records` (`/pet-owner-records`).
2. Select a pet or record to view details.
3. Click **AI Insight** if available to generate a health summary.

Expected result: Medical record details shown; AI modal shows summary or an explanation if none exists.

---

## Payment History

Goal: View your transactions, check payment status, and review receipts or references.

What you'll see:

- Each transaction shows: Service, Pet, Date, Payment Method (e.g., Cash, GCash), Amount, and Status (`Pending`, `Paid`, `Refunded`).

Steps:

1. Open `Payment History` (`/pet-owner-payments`). The page lists your payments with most recent first.
2. Scan the status badge to confirm payment state:
   - `Pending`: payment recorded but not confirmed.
   - `Paid`: payment completed.
   - `Refunded`: payment returned to the payer.
3. Click a transaction card (or row) to view details such as `reference` or `notes` (if implemented).
4. For questions or disputes, note the `TXN-` id shown on the staff view (ask staff/admin to look up your transaction by that id) and open a message to support or clinic staff.

Backend/API note:

- Pet owners use `GET /api/payments` (protected) to fetch their own transactions — staff/admin endpoints create or modify payments.

Troubleshooting:

- If you expect a `Paid` status but see `Pending`, contact clinic staff with the transaction date and service; staff can update status or add a reference.
- If a transaction is missing, confirm the appointment was completed and staff processed billing.

Verification checklist:

- Payments page loads and lists recent transactions.
- Status badges match expected outcomes (Pending → Paid).
- You can obtain a transaction reference to give staff for follow-up.

---

## Notifications & Profile

Goal: View notifications and update your profile.

Steps:

1. Open `Notifications` (`/pet-owner-notifications`) to view alerts.
2. Open `Profile` (`/pet-owner-profile`) to edit contact info and preferences.

---

## Verification checklist

- Can add/edit/archive a pet.
- Can book, edit, and cancel an appointment.
- AI insight modal opens for records when available.
- Messages load and you can send a message.

---

_End of Pet Owner guide._
