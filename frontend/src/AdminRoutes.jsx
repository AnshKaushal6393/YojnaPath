import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { isAdminAuthenticated } from "./lib/adminAuthStorage";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminShell = lazy(() => import("./pages/AdminShell"));
const AdminSchemesPage = lazy(() => import("./pages/AdminSchemesPage"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));

function AdminProtectedRoute() {
  return isAdminAuthenticated() ? <Outlet /> : <Navigate to="/admin/login" replace />;
}

function AdminPublicRoute() {
  return isAdminAuthenticated() ? <Navigate to="/admin" replace /> : <Outlet />;
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
      </Routes>
    </Suspense>
  );
}
