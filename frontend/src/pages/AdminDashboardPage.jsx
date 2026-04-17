import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchCurrentAdmin } from "../lib/adminApi";
import { clearAdminToken } from "../lib/adminAuthStorage";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const adminQuery = useQuery({
    queryKey: ["current-admin"],
    queryFn: fetchCurrentAdmin,
  });

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              YojnaPath Admin
            </p>
            <h1 className="text-3xl font-bold text-white">Control panel</h1>
            <p className="mt-2 text-sm text-slate-300">
              {adminQuery.data?.email
                ? `Signed in as ${adminQuery.data.email}`
                : "Loading admin session..."}
            </p>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Users
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">View and manage users</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Next step: add searchable user listing, profile inspection, and delete controls.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Schemes
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">Manage schemes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Next step: create scheme table, edit form, and active/deactivate controls.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Operations
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">Kiosks and analytics</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Next step: add kiosk controls, impact stats, and export tools.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
