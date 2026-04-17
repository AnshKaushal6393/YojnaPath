import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchCurrentAdmin } from "../lib/adminApi";
import { clearAdminToken } from "../lib/adminAuthStorage";

function getNavClassName({ isActive }) {
  return `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? "bg-emerald-400/15 text-emerald-100"
      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
  }`;
}

export default function AdminShell() {
  const navigate = useNavigate();
  const adminQuery = useQuery({
    queryKey: ["admin-current"],
    queryFn: fetchCurrentAdmin,
  });

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[30px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              YojnaPath Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Control center</h1>
            <p className="mt-2 text-sm text-slate-300">
              {adminQuery.data?.email ? `Signed in as ${adminQuery.data.email}` : "Managing platform operations"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <NavLink to="/admin" end className={getNavClassName}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={getNavClassName}>
              Users
            </NavLink>
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>

        <Outlet />
      </div>
    </main>
  );
}
