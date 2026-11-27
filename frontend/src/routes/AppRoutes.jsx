import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Auth
import Login from "../pages/auth/Login";
import RegisterOwner from "../pages/auth/RegisterOwner";
import ForgotPassword from "../pages/auth/ForgotPassword";

// Owner
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import Trucks from "../pages/owner/Trucks";
import Drivers from "../pages/owner/Drivers";
import Trips from "../pages/owner/Trips";
import Expenses from "../pages/owner/Expenses";
import Reports from "../pages/owner/Reports";

// Driver
import DriverDashboard from "../pages/driver/DriverDashboard";

// Admin
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import OwnerManagement from "../pages/admin/OwnerManagement";
import AllTripsView from "../pages/admin/AllTripsView";
import AdminReports from "../pages/admin/AdminReports";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterOwner />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Owner Routes */}
      <Route element={<ProtectedRoute allowedRoles={["OWNER"]} />}>
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/trucks" element={<Trucks />} />
        <Route path="/owner/drivers" element={<Drivers />} />
        <Route path="/owner/trips" element={<Trips />} />
        <Route path="/owner/expenses" element={<Expenses />} />
        <Route path="/owner/reports" element={<Reports />} />
      </Route>

      {/* Driver Routes */}
      <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/owners" element={<OwnerManagement />} />
        <Route path="/admin/trips" element={<AllTripsView />} />
        <Route path="/admin/reports" element={<AdminReports />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<div className="p-10 text-center">404 - Not Found</div>} />
    </Routes>
  );
};

export default AppRoutes;
