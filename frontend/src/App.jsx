import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminShell from "./pages/AdminShell";
import AdminSchemesPage from "./pages/AdminSchemesPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import HomePage from "./pages/HomePage";
import ImpactPage from "./pages/ImpactPage";
import KioskPage from "./pages/KioskPage";
import CalendarPage from "./pages/CalendarPage";
import Login from "./pages/Login";
import OnboardPage from "./pages/OnboardPage";
import ProfilePage from "./pages/ProfilePage";
import Register from "./pages/Register";
import ResultsPage from "./pages/ResultsPage";
import NotFoundPage from "./pages/NotFoundPage";
import SavedPage from "./pages/SavedPage";
import SchemeDetailPage from "./pages/SchemeDetailPage";
import TrackerPage from "./pages/TrackerPage";
import VerifyOTP from "./pages/VerifyOTP";
import { isAdminAuthenticated } from "./lib/adminAuthStorage";
import { isAuthenticated } from "./utils/auth";

function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicAuthRoute() {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Outlet />;
}

function AdminProtectedRoute() {
  return isAdminAuthenticated() ? <Outlet /> : <Navigate to="/admin/login" replace />;
}

function AdminPublicRoute() {
  return isAdminAuthenticated() ? <Navigate to="/admin" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AdminPublicRoute />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Route>

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
          <Route path="schemes" element={<AdminSchemesPage />} />
        </Route>
      </Route>

      <Route element={<PublicAuthRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyOTP />} />
      </Route>

      <Route path="/impact" element={<ImpactPage />} />
      <Route path="/kiosk" element={<KioskPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/schemes/:schemeId" element={<SchemeDetailPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
