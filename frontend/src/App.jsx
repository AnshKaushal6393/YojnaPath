import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminRoutes from "./AdminRoutes";
import { isAuthenticated } from "./utils/auth";

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
        <Route path="/admin/*" element={<AdminRoutes />} />

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
