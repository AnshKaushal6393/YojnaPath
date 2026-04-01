import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ImpactPage from "./pages/ImpactPage";
import KioskPage from "./pages/KioskPage";
import CalendarPage from "./pages/CalendarPage";
import Login from "./pages/Login";
import OnboardPage from "./pages/OnboardPage";
import ProfilePage from "./pages/ProfilePage";
import Register from "./pages/Register";
import ResultsPage from "./pages/ResultsPage";
import SavedPage from "./pages/SavedPage";
import SchemeDetailPage from "./pages/SchemeDetailPage";
import TrackerPage from "./pages/TrackerPage";
import VerifyOTP from "./pages/VerifyOTP";
import { isAuthenticated } from "./utils/auth";

function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicAuthRoute() {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
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

      <Route path="*" element={<Navigate to={isAuthenticated() ? "/" : "/login"} replace />} />
    </Routes>
  );
}
