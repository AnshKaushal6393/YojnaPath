import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { clearAdminToken, getAdminToken } from "./lib/adminAuthStorage";
import { fetchCurrentAdmin } from "./lib/adminApi";
import AdminShell from "./pages/AdminShell";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminSchemesPage = lazy(() => import("./pages/AdminSchemesPage"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));

function AdminAccessGate({ requireAuth }) {
  const token = getAdminToken();
  const adminQuery = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchCurrentAdmin,
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!token) {
    return requireAuth ? <Navigate to="/admin/login" replace /> : <Outlet />;
  }

  if (adminQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm">
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!adminQuery.data) {
    clearAdminToken();
    return requireAuth ? <Navigate to="/admin/login" replace /> : <Outlet />;
  }

  return requireAuth ? <Outlet /> : <Navigate to="/admin" replace />;
}

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
        <Route element={<AdminAccessGate requireAuth />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="schemes" element={<AdminSchemesPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
