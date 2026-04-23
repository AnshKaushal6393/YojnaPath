import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchCurrentAdmin } from "../lib/adminApi";
import { clearAdminToken } from "../lib/adminAuthStorage";

function getNavClassName({ isActive }) {
  return `rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition ${
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
    <main className="admin-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-8 rounded-[30px] border border-white/10 bg-white/[0.06] px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                YojnaPath Admin
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white md:text-[30px]">Control center</h1>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Live dashboard
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {adminQuery.data?.email ? `Signed in as ${adminQuery.data.email}` : "Managing platform operations"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <NavLink to="/admin" end className={getNavClassName}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/users" className={getNavClassName}>
                Users
              </NavLink>
              <NavLink to="/admin/analytics" className={getNavClassName}>
                Analytics
              </NavLink>
              <NavLink to="/admin/schemes" className={getNavClassName}>
                Schemes
              </NavLink>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </main>
  );
}
