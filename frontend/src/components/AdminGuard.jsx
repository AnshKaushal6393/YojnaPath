import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { clearAdminToken, getAdminToken } from "../lib/adminAuthStorage";
import { fetchCurrentAdmin } from "../lib/adminApi";

export default function AdminGuard() {
  const token = getAdminToken();
  const adminQuery = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchCurrentAdmin,
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!token) {
    return <Navigate to="/admin/login" replace />;
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
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
