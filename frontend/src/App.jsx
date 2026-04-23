import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { isAdminAuthenticated } from "./lib/adminAuthStorage";
import { isAuthenticated } from "./utils/auth";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminShell = lazy(() => import("./pages/AdminShell"));
const AdminSchemesPage = lazy(() => import("./pages/AdminSchemesPage"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ImpactPage = lazy(() => import("./pages/ImpactPage"));
const KioskPage = lazy(() => import("./pages/KioskPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Login = lazy(() => import("./pages/Login"));
const OnboardPage = lazy(() => import("./pages/OnboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Register = lazy(() => import("./pages/Register"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const SavedPage = lazy(() => import("./pages/SavedPage"));
const SchemeDetailPage = lazy(() => import("./pages/SchemeDetailPage"));
const TrackerPage = lazy(() => import("./pages/TrackerPage"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));

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
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm">
            Loading page...
          </div>
        </div>
      }
    >
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
    </Suspense>
  );
}
