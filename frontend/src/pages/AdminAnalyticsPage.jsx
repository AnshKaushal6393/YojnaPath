import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminAnalyticsFunnel,
  fetchAdminAnalyticsKiosk,
  fetchAdminAnalyticsNearMiss,
  fetchAdminAnalyticsOverview,
  fetchAdminAnalyticsPhoto,
  fetchAdminAnalyticsSchemes,
} from "../lib/adminApi";
import { formatDateTime, formatNumber, formatPercent } from "../lib/adminUi";

function Section({ eyebrow, title, subtitle, children }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-slate-950/25">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Metric({ label, value, hint, tone = "text-emerald-300" }) {
  return (
    <article className="rounded-[22px] border border-white/8 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/30">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 text-4xl font-bold ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </article>
  );
}

function emptyStateHint(label, value) {
  if (Number(value || 0) > 0) {
    return null;
  }

  if (label === "Total matches") {
    return "No match logs yet.";
  }

  if (label === "Near misses") {
    return "No near-miss logs yet.";
  }

  if (label === "Analyzed profiles") {
    return "Profiles are ready, but no match analysis has surfaced yet.";
  }

  if (label === "Schemes ranked") {
    return "Active schemes are available, but no ranking data has been generated.";
  }

  return null;
}

function BarRow({ label, count, width, suffix = "" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="break-words text-slate-300">{label}</span>
        <span className="font-semibold text-white">
          {formatNumber(count)}
          {suffix}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-900/80">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400"
          style={{ width: `${Math.max(width, 6)}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: fetchAdminAnalyticsOverview,
  });
  const funnelQuery = useQuery({
    queryKey: ["admin-analytics-funnel"],
    queryFn: fetchAdminAnalyticsFunnel,
  });
  const nearMissQuery = useQuery({
    queryKey: ["admin-analytics-nearmiss"],
    queryFn: fetchAdminAnalyticsNearMiss,
  });
  const schemesQuery = useQuery({
    queryKey: ["admin-analytics-schemes"],
    queryFn: fetchAdminAnalyticsSchemes,
  });
  const photoQuery = useQuery({
    queryKey: ["admin-analytics-photo"],
    queryFn: fetchAdminAnalyticsPhoto,
  });
  const kioskQuery = useQuery({
    queryKey: ["admin-analytics-kiosk"],
    queryFn: fetchAdminAnalyticsKiosk,
  });

  useEffect(() => {
    if (
      (overviewQuery.isSuccess && overviewQuery.data === null) ||
      (funnelQuery.isSuccess && funnelQuery.data === null) ||
      (nearMissQuery.isSuccess && nearMissQuery.data === null) ||
      (schemesQuery.isSuccess && schemesQuery.data === null) ||
      (photoQuery.isSuccess && photoQuery.data === null) ||
      (kioskQuery.isSuccess && kioskQuery.data === null)
    ) {
      navigate("/admin/login", { replace: true });
    }
  }, [
    funnelQuery.data,
    funnelQuery.isSuccess,
    kioskQuery.data,
    kioskQuery.isSuccess,
    navigate,
    nearMissQuery.data,
    nearMissQuery.isSuccess,
    overviewQuery.data,
    overviewQuery.isSuccess,
    photoQuery.data,
    photoQuery.isSuccess,
    schemesQuery.data,
    schemesQuery.isSuccess,
  ]);

  const overview = overviewQuery.data || {};
  const funnel = funnelQuery.data || {};
  const nearMiss = nearMissQuery.data || {};
  const schemes = schemesQuery.data?.schemes || [];
  const photo = photoQuery.data || {};
  const kiosk = kioskQuery.data || {};

  const matchSeries = overview.matchesByDay || [];
  const maxDailyMatches = Math.max(...matchSeries.map((entry) => Number(entry.count || 0)), 0);
  const topNearMissCriteria = nearMiss.criteria || [];
  const topSchemes = (schemes || []).slice(0, 8);
  const photoBreakdown = photo.breakdown || [];
  const kioskWorkers = kiosk.sessionsByWorker || [];

  const isLoading =
    overviewQuery.isLoading ||
    funnelQuery.isLoading ||
    nearMissQuery.isLoading ||
    schemesQuery.isLoading ||
    photoQuery.isLoading ||
    kioskQuery.isLoading;
  const error =
    overviewQuery.error ||
    funnelQuery.error ||
    nearMissQuery.error ||
    schemesQuery.error ||
    photoQuery.error ||
    kioskQuery.error;

  return (
    <section className="space-y-6 pb-6">
      {isLoading ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 text-sm text-slate-300">
          Loading analytics...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[30px] border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-100">
          {error.message || "Could not load analytics right now."}
        </div>
      ) : null}

      <Section
        eyebrow="Analytics Routes"
        title="Platform analytics"
        subtitle="Live snapshots from matches, funnel progress, near misses, schemes, photos, and kiosk usage. Zero values usually mean the data has not been generated yet, not that the route is broken."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Total matches"
            value={formatNumber(overview.totals?.matches)}
            hint={emptyStateHint("Total matches", overview.totals?.matches)}
            tone="text-cyan-300"
          />
          <Metric
            label="Near misses"
            value={formatNumber(overview.totals?.nearMisses)}
            hint={emptyStateHint("Near misses", overview.totals?.nearMisses)}
            tone="text-rose-300"
          />
          <Metric
            label="Analyzed profiles"
            value={formatNumber(nearMiss.analyzedProfiles)}
            hint={emptyStateHint("Analyzed profiles", nearMiss.analyzedProfiles)}
            tone="text-amber-300"
          />
          <Metric
            label="Schemes ranked"
            value={formatNumber(schemes.length)}
            hint={emptyStateHint("Schemes ranked", schemes.length)}
            tone="text-emerald-300"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Matches by day</p>
            <div className="mt-5 space-y-4">
              {matchSeries.length ? (
                matchSeries.map((entry) => (
                  <BarRow
                    key={entry.day}
                    label={entry.day}
                    count={entry.count}
                    width={maxDailyMatches ? (Number(entry.count || 0) / maxDailyMatches) * 100 : 0}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400">No daily match history yet. Start a few match runs to see the curve.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top near-miss blockers</p>
            <div className="mt-5 space-y-4">
              {topNearMissCriteria.length ? (
                topNearMissCriteria.map((item) => (
                  <BarRow
                    key={item.key}
                    label={item.key.replace(/_/g, " ")}
                    count={item.count}
                    width={topNearMissCriteria[0]?.count ? (Number(item.count || 0) / Number(topNearMissCriteria[0].count || 1)) * 100 : 0}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400">No near-miss breakdown yet. Once users start missing by one rule, this list will fill in.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Photo breakdown</p>
            <div className="mt-5 space-y-4">
              {photoBreakdown.length ? (
                photoBreakdown.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-300">{item.label}</span>
                      <span className="text-sm font-semibold text-white">
                        {formatNumber(item.count)} {formatPercent(item.pct)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No photo stats yet. Registration activity will populate this breakdown.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Section
          eyebrow="3.4 Analytics Routes"
          title="Funnel and kiosk analytics"
          subtitle="The funnel shows progression, while kiosk analytics show operator usage and PDF exports."
        >
          <div className="grid gap-4 md:grid-cols-2">
              {funnel.stages?.map((stage) => (
                <div key={stage.key} className="rounded-[22px] border border-white/8 bg-slate-950/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{stage.label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">{formatNumber(stage.count)}</p>
                </div>
              ))}
            </div>
            {!funnel.stages?.length ? (
              <p className="mt-4 text-sm text-slate-400">No funnel data yet. This fills up as users move through registration.</p>
            ) : null}

          <div className="mt-6 rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kiosk usage</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Metric label="Sessions" value={formatNumber(kiosk.totalSessions)} tone="text-cyan-300" />
              <Metric label="PDF downloads" value={formatNumber(kiosk.totalPdfDownloads)} tone="text-amber-300" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Sessions per worker</p>
                {kioskWorkers.length ? kioskWorkers.map((item) => (
                  <BarRow key={item.key} label={item.key} count={item.count} width={kioskWorkers[0]?.count ? (Number(item.count || 0) / Number(kioskWorkers[0].count || 1)) * 100 : 0} />
                )) : <p className="text-sm text-slate-400">No kiosk usage yet. Once kiosk sessions start, this will show which workers are active.</p>}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Top schemes by applications</p>
                {topSchemes.length ? topSchemes.map((scheme) => (
                  <div key={scheme.schemeId} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="truncate text-sm text-slate-200">{scheme.name}</span>
                      <span className="text-sm font-semibold text-white">{formatNumber(scheme.applications)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Matches: {formatNumber(scheme.matches)} | Near misses: {formatNumber(scheme.nearMisses)} | Apply clicked rate: {formatPercent(scheme.applyClickedRate)}
                    </p>
                  </div>
                )) : <p className="text-sm text-slate-400">No scheme analytics yet. Applications will populate this list.</p>}
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Route Summary"
          title="What each route is for"
          subtitle="Useful when you want a quick reference while the analytics page is open."
        >
          <div className="space-y-3">
            {[
              ["GET /admin/analytics/overview", "Match counts by day, user types, states, languages"],
              ["GET /admin/analytics/funnel", "Registration funnel drop-off at each step"],
              ["GET /admin/analytics/nearmiss", "Top blocker criteria and the schemes they affect most"],
              ["GET /admin/analytics/schemes", "Per-scheme stats: match count, near-miss count, apply-clicked rate"],
              ["GET /admin/analytics/photo", "Photo type breakdown: camera/upload/generated/none"],
              ["GET /admin/analytics/kiosk", "Kiosk session stats, PDF downloads, and user types served"],
            ].map(([route, desc]) => (
              <div key={route} className="rounded-[20px] border border-white/8 bg-slate-950/70 px-4 py-4">
                <p className="text-sm font-semibold text-emerald-100">{route}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </section>
  );
}
