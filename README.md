# PawCruz — Frontend (Web + Android)

React web application for the PawCruz veterinary clinic system. Supports 4 user roles with dedicated dashboards. Wrapped with Capacitor for Android APK generation.

---

## Tech Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| Framework      | React 19                             |
| Routing        | React Router 7                       |
| HTTP Client    | Axios                                |
| Mobile Wrapper | Capacitor 8                          |
| Styling        | Plain CSS (responsive, mobile-first) |

---

## Project Structure

```
frontend/
├── public/
│   └── index.html                  # Viewport meta for mobile
├── src/
│   ├── App.js                      # Route definitions
│   ├── index.js                    # App entry, imports global CSS
│   ├── api/
│   │   └── api.js                  # Axios instance + API calls
│   ├── components/
│   │   ├── useSidebar.js           # Sidebar open/close hook
│   │   ├── AdminSidebar.js
│   │   ├── StaffSidebar.js
│   │   ├── VetSidebar.js
│   │   └── PetOwnerSidebar.js
│   ├── css/
│   │   ├── global-mobile.css       # Global responsive base styles
│   │   └── *.css                   # Per-page styles
│   └── pages/
│       ├── Login.js
│       ├── Register.js
│       ├── DevNav.js               # Dev-only page to bypass auth
│       ├── dashboards/
│       │   ├── Admin/              # AdminDashboard, Users, Messages, Notif, Profile
│       │   ├── Staff/              # 8 pages
│       │   ├── Vet/                # 6 pages
│       │   └── PetOwner/           # 8 pages
│       └── security/               # ResetPassword, VerifyEmail, UnlockAccount, LoginOtp
├── android/                        # Capacitor Android project
├── capacitor.config.ts             # Capacitor config (appId, webDir)
└── build/                          # Production build output (git-ignored)
```

---

## Roles & Dashboards

| Role           | Dashboard Route | Pages                                                                                                                              |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `admin`        | `/admin`        | Dashboard, User Management, Messages, Notifications, Profile                                                                       |
| `veterinarian` | `/vet`          | Dashboard, Patients, Calendar, Messages, Medical Records, Inventory, Notifications, Profile                                        |
| `staff`        | `/staff`        | Dashboard, Appointments, User Management, Pets Profile, Messages, Inventory, Payment History, Activity Log, Notifications, Profile |
| `pet_owner`    | `/pet-owner`    | Dashboard, Appointments, My Pets, Messages, Medical Records, Payment History, Notifications, Profile                               |

---

## Setup

```bash
npm install
```

### Run development server

```bash
npm start
```

Runs at `http://localhost:3000`.

### Dev navigation (bypass login)

Visit `http://localhost:3000/dev` to get one-click access to all pages as any role — no backend or login required.

---

## Build for Web

```bash
npm run build
```

Output goes to `build/`.

---

## Build for Android (APK)

### Requirements

- Android Studio 2023+
- Java 17+ installed
- Capacitor CLI: `npm install -g @capacitor/cli`

### Environment Setup

Create `.env` in frontend root:

```env
# Production API
REACT_APP_API_URL=https://vet-clinic-system-api.onrender.com/api
```

For local development:

```env
# Local API (change localhost to your machine LAN IP for Android device)
REACT_APP_API_URL=http://192.168.x.x:5000/api
```

### Build Steps

```bash
# 1. Build React + sync to Android
npm run build:android

# 2. Open in Android Studio
npm run open:android

# 3. In Android Studio
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Test on Device/Emulator

**Option 1: Android Emulator**

- Open Android Studio
- Tools → Device Manager → Create Virtual Device
- Run app (green play icon)

**Option 2: Physical Phone**

- Enable USB Debugging (Settings → Developer Options)
- Connect via USB
- Select phone in Android Studio dropdown
- Click Run

### APK Installation

```bash
# Install APK on device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.pawcruz.app/.MainActivity
```

### Capacitor Configuration (`capacitor.config.ts`)

```ts
export const config: CapacitorConfig = {
  appId: "com.pawcruz.app",
  appName: "PawCruz",
  webDir: "build",
  server: {
    androidScheme: "https", // Important: Capacitor uses https://localhost
  },
};
```

**Important**: Capacitor runs at `https://localhost` on the webview. This origin must be in backend CORS `allowedOrigins`.

---

## Environment Variables

### Create `.env` file in frontend root:

```env
# API endpoint
REACT_APP_API_URL=https://vet-clinic-system-api.onrender.com/api
```

### For local development with Android on physical device:

Replace `localhost` with your machine's LAN IP:

```bash
# Get your LAN IP
# Windows: ipconfig | findstr "IPv4"
# Mac/Linux: ifconfig | grep inet

# Then in .env:
REACT_APP_API_URL=http://192.168.x.x:5000/api
```

### Environment-specific builds:

```bash
# Development (local backend)
REACT_APP_API_URL=http://localhost:5000/api npm run build

# Production (Render API)
REACT_APP_API_URL=https://vet-clinic-system-api.onrender.com/api npm run build:android
```

---

## Responsive Design

All pages are fully responsive for mobile (375px+) and tablet using CSS media queries:

- Desktop: Sidebar always visible
- Tablet (≤768px): Sidebar drawer with hamburger toggle
- Mobile (≤480px): Optimized layouts, full-width inputs, card views

Key responsive features:

- Pet list shows as cards on mobile (src/css/responsive-tables.css)
- Forms stack single-column on small screens
- Video on login page resizes for mobile
- Bottom navigation bar collapses on small screens

---

## Troubleshooting Mobile Build

### Build fails: "Gradle plugin not found"

Update `android/build.gradle` to use AGP 8.11.1:

```gradle
classpath 'com.android.tools.build:gradle:8.11.1'
```

### CORS error on mobile (XMLHttpRequest blocked)

- Backend must include `https://localhost` in `allowedOrigins` (see backend README)
- Verify `.env` has correct API_URL
- Clear app data on device and rebuild APK

### Can't connect to local backend from Android device

- Get your machine LAN IP:
  - Windows: `ipconfig | findstr IPv4`
  - Mac/Linux: `ifconfig | grep inet`
- Update `.env`: `REACT_APP_API_URL=http://192.168.x.x:5000/api`
- Rebuild APK: `npm run build:android`
- Verify firewall allows port 5000 from device

### App crashes on startup

```bash
# Check Android logs
adb logcat | grep pawcruz

# Clear app data
adb shell pm clear com.pawcruz.app
```

### APK won't install

```bash
# Uninstall old version first
adb uninstall com.pawcruz.app

# Then reinstall
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
