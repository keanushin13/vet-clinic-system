import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { initCSRF } from "./api/api";
import BottomNavigation from "./components/BottomNavigation";
import PetOwnerTutorial, {
  STORAGE_KEY as PO_TUTORIAL_KEY,
} from "./components/PetOwnerTutorial";

// DEV
import DevNav from "./pages/DevNav";

// AUTH & SECURITY IMPORTS
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnlockAccount from "./pages/security/UnlockAccount";
import VerifyEmail from "./pages/security/VerifyEmail";
import ResetPassword from "./pages/security/password/ResetPassword";

// DASHBOARD IMPORTS
import AdminDashboard from "./pages/dashboards/Admin/AdminDashboard";
import StaffDashboard from "./pages/dashboards/Staff/StaffDashboard";

// ADMIN NEW IMPORTS
import AdminMessages from "./pages/dashboards/Admin/AdminMessages";
import AdminNotif from "./pages/dashboards/Admin/AdminNotif";
import AdminProfile from "./pages/dashboards/Admin/AdminProfile";
import AdminUserManagement from "./pages/dashboards/Admin/AdminUserManagement";
import AdminOwnerPets from "./pages/dashboards/Admin/AdminOwnerPets";

// STAFF IMPORTS
import StaffActivityLog from "./pages/dashboards/Staff/StaffActivityLog";
import StaffAppointment from "./pages/dashboards/Staff/StaffAppointment";
import StaffInventory from "./pages/dashboards/Staff/StaffInventory";
import StaffMessages from "./pages/dashboards/Staff/StaffMessages";
import StaffNotif from "./pages/dashboards/Staff/StaffNotif";
import StaffPaymentHistory from "./pages/dashboards/Staff/StaffPaymentHistory";
import StaffPetsProfile from "./pages/dashboards/Staff/StaffPetsProfile";
import StaffProfile from "./pages/dashboards/Staff/StaffProfile";
import StaffUserManagement from "./pages/dashboards/Staff/StaffUserManagement";
import StaffOwnerPets from "./pages/dashboards/Staff/StaffOwnerPets";
import StaffVetSchedule from "./pages/dashboards/Staff/StaffVetSchedule";
import StaffMedRec from "./pages/dashboards/Staff/StaffMedRec";

// VETERINARIAN IMPORTS
import VetCalendar from "./pages/dashboards/Veterinary/VetCalendar";
import VetDashboard from "./pages/dashboards/Veterinary/VetDashboard";
import VetInventory from "./pages/dashboards/Veterinary/VetInventory";
import VetMedRec from "./pages/dashboards/Veterinary/VetMedRec";
import VetMessages from "./pages/dashboards/Veterinary/VetMessages";
import VetNotif from "./pages/dashboards/Veterinary/VetNotif";
import VetPatients from "./pages/dashboards/Veterinary/VetPatients";
import VetProfile from "./pages/dashboards/Veterinary/VetProfile";
import VetSchedule from "./pages/dashboards/Veterinary/VetSchedule";

// PET OWNER IMPORTS
import PetOwnerAppointment from "./pages/dashboards/PetOwner/PetOwnerAppointment";
import PetOwnerDashboard from "./pages/dashboards/PetOwner/PetOwnerDashboard";
import PetOwnerMedRec from "./pages/dashboards/PetOwner/PetOwnerMedRec";
import PetOwnerMessages from "./pages/dashboards/PetOwner/PetOwnerMessages";
import PetOwnerMyPets from "./pages/dashboards/PetOwner/PetOwnerMyPets";
import PetOwnerNotif from "./pages/dashboards/PetOwner/PetOwnerNotif";
import PetOwnerPayHis from "./pages/dashboards/PetOwner/PetOwnerPayHis";
import PetOwnerProfile from "./pages/dashboards/PetOwner/PetOwnerProfile";

function App() {
  const [showTutorial, setShowTutorial] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role === "pet_owner" && !localStorage.getItem(PO_TUTORIAL_KEY);
  });

  useEffect(() => {
    initCSRF();
  }, []);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(PO_TUTORIAL_KEY);
      setShowTutorial(true);
    };
    window.addEventListener("startPetOwnerTutorial", handler);
    return () => window.removeEventListener("startPetOwnerTutorial", handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* DEV ROUTE */}
        <Route path="/dev" element={<DevNav />} />

        {/* PUBLIC / AUTH ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* SECURITY FLOW ROUTES */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/unlock-account/:token" element={<UnlockAccount />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* PET OWNER DASHBOARD ROUTES */}
        <Route path="/pet-owner" element={<PetOwnerDashboard />} />
        <Route
          path="/pet-owner-appointments"
          element={<PetOwnerAppointment />}
        />
        <Route path="/pet-owner-pets" element={<PetOwnerMyPets />} />
        <Route path="/pet-owner-messages" element={<PetOwnerMessages />} />
        <Route path="/pet-owner-records" element={<PetOwnerMedRec />} />
        <Route path="/pet-owner-payments" element={<PetOwnerPayHis />} />
        <Route path="/pet-owner-notifications" element={<PetOwnerNotif />} />
        <Route path="/pet-owner-profile" element={<PetOwnerProfile />} />

        {/* VETERINARIAN DASHBOARD ROUTES */}
        <Route path="/vet" element={<VetDashboard />} />
        <Route path="/vet-patients" element={<VetPatients />} />
        <Route path="/vet-calendar" element={<VetCalendar />} />
        <Route path="/vet-messages" element={<VetMessages />} />
        <Route path="/vet-medical-records" element={<VetMedRec />} />
        <Route path="/vet-inventory" element={<VetInventory />} />
        <Route path="/vet-notifications" element={<VetNotif />} />
        <Route path="/vet-profile" element={<VetProfile />} />
        <Route path="/vet-schedule" element={<VetSchedule />} />

        {/* STAFF ROUTES */}
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff-appointments" element={<StaffAppointment />} />
        <Route path="/staff-users" element={<StaffUserManagement />} />
        <Route path="/staff-users/:id/pets" element={<StaffOwnerPets />} />
        <Route path="/staff-pets" element={<StaffPetsProfile />} />
        <Route path="/staff-medical-records" element={<StaffMedRec />} />
        <Route path="/staff-messages" element={<StaffMessages />} />
        <Route path="/staff-inventory" element={<StaffInventory />} />
        <Route path="/staff-payments" element={<StaffPaymentHistory />} />
        <Route path="/staff-activity" element={<StaffActivityLog />} />
        <Route path="/staff-notifications" element={<StaffNotif />} />
        <Route path="/staff-profile" element={<StaffProfile />} />
        <Route path="/staff-vet-schedules" element={<StaffVetSchedule />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin-users" element={<AdminUserManagement />} />
        <Route path="/admin-users/:id/pets" element={<AdminOwnerPets />} />
        <Route path="/admin-messages" element={<AdminMessages />} />
        <Route path="/admin-notifications" element={<AdminNotif />} />
        <Route path="/admin-profile" element={<AdminProfile />} />
      </Routes>
      <BottomNavigation />
      {showTutorial && (
        <PetOwnerTutorial onDone={() => setShowTutorial(false)} />
      )}
    </BrowserRouter>
  );
}

export default App;
