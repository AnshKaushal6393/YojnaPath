import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchCurrentAdmin } from "../lib/adminApi";
import { clearAdminToken } from "../lib/adminAuthStorage";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import BrandLogo from "../components/BrandLogo";

const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/schemes", label: "Schemes" },
  { to: "/admin/settings", label: "Settings" },
];

function getNavClassName({ isActive }) {
  return `inline-flex min-h-11 items-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
    isActive
      ? "border border-emerald-400/20 bg-emerald-400/15 text-emerald-100"
      : "border border-transparent bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
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
    <main className="admin-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto w-full max-w-400">
        <Card className="mb-6 overflow-hidden px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <BrandLogo variant="light" alt="YojnaPath Admin" compact className="mb-3" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  YojnaPath Admin
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-white md:text-[30px]">Control center</h1>
                  <Badge variant="success" className="uppercase tracking-[0.18em]">
                    Live dashboard
                  </Badge>
                </div>
                <p className="mt-3 break-all text-sm text-slate-300 sm:break-normal">
                  {adminQuery.data?.email ? `Signed in as ${adminQuery.data.email}` : "Managing platform operations"}
                </p>
              </div>

              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 xl:w-auto xl:min-w-[260px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Session</p>
                <p className="mt-2 truncate text-sm text-white">
                  {adminQuery.data?.email || "Admin account"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={getNavClassName}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="w-full rounded-2xl lg:w-auto"
              >
                Log out
              </Button>
            </div>
          </div>
        </Card>

        <Outlet />
      </div>
    </main>
  );
}
