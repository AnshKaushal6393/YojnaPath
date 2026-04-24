import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AdminGuard from "./components/AdminGuard";
import AdminShell from "./pages/AdminShell";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminSchemesPage = lazy(() => import("./pages/AdminSchemesPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));

export default function AdminRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm">
            Loading admin area...
          </div>
        </div>
      }
      >
      <Routes>
        <Route element={<AdminGuard />}>
          <Route element={<AdminShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="schemes" element={<AdminSchemesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
