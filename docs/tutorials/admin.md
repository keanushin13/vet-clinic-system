# Admin — Step‑by‑step Feature Guide

## Overview

Admin responsibilities: user management, viewing site activity, messages/notifications, owner pet oversight, and profile settings.

## Prerequisites

- Admin account and access to admin dashboard.

## Navigation

- Admin Dashboard: `/admin`
- User Management: `/admin-users`
- Owner Pets: `/admin-users/:id/pets`
- Messages: `/admin-messages`
- Notifications: `/admin-notifications`

---

## User Management (Create / Edit / Delete)

Goal: Manage staff, vets, and owners.

Steps:

1. Open `User Management` (`/admin-users`).
2. Click **Create User** or similar control.
3. Fill required fields (name, email, role, password as required).
4. Submit to create the account.
5. To edit: click edit on a user row → modify fields → Save.
6. To delete: click delete → confirm (admin-only action).

Backend note: Admin endpoints are protected (see `routes/userRoutes.js`): `POST /api/users/create`, `PUT /api/users/:id`, `DELETE /api/users/delete/:id`.

Expected: User list updates and new users can log in with the provided credentials.

Troubleshooting: If creation fails, confirm required fields and that the email is not already used.

---

## Owner Pets (inspect owner's pets)

Steps:

1. From `User Management`, click a user and select **View Pets** or open `/admin-users/:id/pets`.
2. Review pet details and perform admin edits if the UI exposes them.

---

## Messages & Notifications

- Use `Admin Messages` to oversee communication and `Admin Notifications` to view system alerts.

---

## Verification checklist

- Can create, edit, and delete users.
- Can view owner pets and important admin notifications.

_End of Admin guide._
