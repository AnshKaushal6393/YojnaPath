import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminActivity,
  fetchAdminDashboard,
  fetchAdminFunnel,
  fetchAdminStats,
} from "../lib/adminApi";
import { clearAdminToken } from "../lib/adminAuthStorage";

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function getPhotoCompletion(stats) {
  const photoRows = stats?.photoStats || [];
  const total = photoRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const completed = photoRows
    .filter((row) => row.photo_type && row.photo_type !== "none")
    .reduce((sum, row) => sum + Number(row.count || 0), 0);

  if (!total) {
    return 0;
  }

  return (completed / total) * 100;
}

function getPhotoBreakdown(stats) {
  return (stats?.photoStats || []).map((row) => ({
    label: row.photo_type === "none" ? "No photo" : row.photo_type,
    count: Number(row.count || 0),
  }));
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
  });
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
  });
  const activityQuery = useQuery({
    queryKey: ["admin-activity"],
    queryFn: fetchAdminActivity,
    refetchInterval: 30000,
  });
  const funnelQuery = useQuery({
    queryKey: ["admin-funnel"],
    queryFn: fetchAdminFunnel,
  });

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  const admin = dashboardQuery.data?.admin;
  const overview = dashboardQuery.data?.overview;
  const stats = statsQuery.data;
  const activity = activityQuery.data?.events || [];
  const funnelStages = funnelQuery.data?.stages || [];
  const funnelMaxCount = funnelQuery.data?.maxCount || 0;
  const criticalError = dashboardQuery.error || statsQuery.error;
  const photoCompletion =
    stats?.photoCompletionPct != null ? Number(stats.photoCompletionPct) : getPhotoCompletion(stats);
  const photoBreakdown = getPhotoBreakdown(stats);
  const avgMatchesPerUser =
    stats?.avgMatchesPerUser != null
      ? Number(stats.avgMatchesPerUser)
      : stats?.totalUsers > 0
        ? Number(stats.totalMatches || 0) / Number(stats.totalUsers || 1)
        : 0;
  const metricCards = [
    {
      label: "Total users",
      value: formatNumber(stats?.totalUsers),
      accent: "text-emerald-300",
    },
    {
      label: "Total matches",
      value: formatNumber(stats?.totalMatches),
      accent: "text-cyan-300",
    },
    {
      label: "Avg matches / user",
      value: avgMatchesPerUser.toFixed(1),
      accent: "text-amber-300",
    },
    {
      label: "Near misses",
      value: formatNumber(stats?.totalNearMisses),
      accent: "text-rose-300",
    },
    {
      label: "Active schemes",
      value: formatNumber(stats?.activeSchemes),
      accent: "text-fuchsia-300",
    },
    {
      label: "Matches today",
      value: formatNumber(stats?.activeToday),
      accent: "text-sky-300",
    },
  ];

  useEffect(() => {
    if (
      (dashboardQuery.isSuccess && dashboardQuery.data === null) ||
      (statsQuery.isSuccess && statsQuery.data === null) ||
      (activityQuery.isSuccess && activityQuery.data === null) ||
      (funnelQuery.isSuccess && funnelQuery.data === null)
    ) {
      navigate("/admin/login", { replace: true });
    }
  }, [
    activityQuery.data,
    activityQuery.isSuccess,
    dashboardQuery.data,
    dashboardQuery.isSuccess,
    funnelQuery.data,
    funnelQuery.isSuccess,
    navigate,
    statsQuery.data,
    statsQuery.isSuccess,
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              YojnaPath Admin
            </p>
            <h1 className="text-3xl font-bold text-white">Live dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">
              {admin?.email ? `Signed in as ${admin.email}` : "Loading admin session..."}
            </p>
            {overview ? (
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                {`Refreshed ${formatDateTime(overview.generatedAt)} | Mongo ${
                  overview.mongoConnected ? "connected" : "offline"
                }`}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>

        {dashboardQuery.isLoading || statsQuery.isLoading ? (
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Loading dashboard stats...
          </section>
        ) : null}

        {criticalError ? (
          <section className="rounded-[28px] border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-100">
            {criticalError.message || "Could not load admin dashboard right now."}
          </section>
        ) : null}

        {stats ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {card.label}
                  </p>
                  <p className={`mt-4 text-4xl font-bold ${card.accent}`}>{card.value}</p>
                  {card.label === "Total users" && overview ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Profiles: {formatNumber(overview.counts?.profiles)}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Today
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Dashboard pulse</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-slate-900/70 p-5">
                    <p className="text-sm text-slate-400">Top scheme today</p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {stats.topSchemeToday || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-slate-900/70 p-5">
                    <p className="text-sm text-slate-400">Photo completion</p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {formatPercent(photoCompletion)}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-300">
                  This screen now pulls from `/api/admin/dashboard`, `/api/admin/stats`,
                  `/api/admin/activity`, and `/api/admin/funnel`.
                </p>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Photo Breakdown
                </p>
                <div className="mt-5 space-y-3">
                  {photoBreakdown.length ? (
                    photoBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-[18px] bg-slate-900/70 px-4 py-3"
                      >
                        <span className="text-sm capitalize text-slate-300">{item.label}</span>
                        <span className="text-sm font-semibold text-white">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                      No photo stats yet.
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Registration Funnel
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">User progression</h2>
                <div className="mt-6 space-y-4">
                  {funnelStages.length ? (
                    funnelStages.map((stage) => {
                      const width = funnelMaxCount
                        ? Math.max((Number(stage.count || 0) / funnelMaxCount) * 100, 8)
                        : 0;

                      return (
                        <div key={stage.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-300">{stage.label}</span>
                            <span className="text-sm font-semibold text-white">
                              {formatNumber(stage.count)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-900/70">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                      No funnel data yet.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Activity Feed
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Latest match events</h2>
                <div className="mt-6 space-y-3">
                  {activity.length ? (
                    activity.slice(0, 8).map((event) => (
                      <div
                        key={event.id}
                        className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold capitalize text-white">
                              {event.sessionType} match
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {`${event.occupation || "Unknown occupation"}${
                                event.state ? ` | ${event.state}` : ""
                              }`}
                            </p>
                          </div>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Matches: {formatNumber(event.matchCount)}
                          </span>
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Near misses: {formatNumber(event.nearMissCount)}
                          </span>
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Scheme refs: {formatNumber(event.schemeIds?.length)}
                          </span>
                          {event.lang ? (
                            <span className="rounded-full bg-white/5 px-3 py-1">
                              Lang: {event.lang}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                      No match activity yet.
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
