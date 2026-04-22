import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminActivity,
  fetchAdminDashboard,
  fetchAdminFunnel,
  fetchAdminStats,
} from "../lib/adminApi";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  getPhotoCompletion,
} from "../lib/adminUi";

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

  const overview = dashboardQuery.data?.overview;
  const stats = statsQuery.data;
  const activity = activityQuery.data?.events || [];
  const funnelStages = funnelQuery.data?.stages || [];
  const funnelMaxCount = funnelQuery.data?.maxCount || 0;
  const criticalError = dashboardQuery.error || statsQuery.error;
  const photoCompletion =
    stats?.photoCompletionPct != null ? Number(stats.photoCompletionPct) : getPhotoCompletion(stats);
  const avgMatchesPerUser =
    stats?.avgMatchesPerUser != null
      ? Number(stats.avgMatchesPerUser)
      : stats?.totalUsers > 0
        ? Number(stats.totalMatches || 0) / Number(stats.totalUsers || 1)
        : 0;

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

  const metricCards = [
    {
      label: "Total users",
      value: formatNumber(stats?.totalUsers),
      accent: "text-emerald-300",
      visible: true,
    },
    {
      label: "Total matches",
      value: formatNumber(stats?.totalMatches),
      accent: "text-cyan-300",
      visible: Number(stats?.totalMatches || 0) > 0,
    },
    {
      label: "Avg matches / user",
      value: avgMatchesPerUser.toFixed(1),
      accent: "text-amber-300",
      visible: Number(stats?.totalMatches || 0) > 0,
    },
    {
      label: "Near misses",
      value: formatNumber(stats?.totalNearMisses),
      accent: "text-rose-300",
      visible: Number(stats?.totalNearMisses || 0) > 0,
    },
    {
      label: "Active schemes",
      value: formatNumber(stats?.activeSchemes),
      accent: "text-fuchsia-300",
      visible: true,
    },
    {
      label: "Matches today",
      value: formatNumber(stats?.activeToday),
      accent: "text-sky-300",
      visible: Number(stats?.activeToday || 0) > 0,
    },
    {
      label: "Photo completion",
      value: formatPercent(photoCompletion),
      accent: "text-lime-300",
      visible: Number(stats?.totalUsers || 0) > 0,
    },
  ].filter((card) => card.visible);

  return (
    <>
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

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Registration Funnel
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">User progression</h2>
              <p className="mt-2 text-sm text-slate-400">
                Track where users continue and where they drop off after login.
              </p>
              <div className="mt-6 space-y-4">
                {funnelStages.length ? (
                  funnelStages.map((stage, index) => {
                    const width = funnelMaxCount
                      ? Math.max((Number(stage.count || 0) / funnelMaxCount) * 100, 8)
                      : 0;
                    const previousCount =
                      index === 0 ? Number(stage.count || 0) : Number(funnelStages[index - 1]?.count || 0);
                    const conversion =
                      index === 0 || previousCount <= 0
                        ? 100
                        : (Number(stage.count || 0) / previousCount) * 100;

                    return (
                      <div key={stage.key} className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-slate-300">{stage.label}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-white">
                              {formatNumber(stage.count)}
                            </span>
                            <p className="text-xs text-slate-400">{formatPercent(conversion)} retained</p>
                          </div>
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
                            {`User type: ${event.occupation || "Unknown user type"}${
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
    </>
  );
}
