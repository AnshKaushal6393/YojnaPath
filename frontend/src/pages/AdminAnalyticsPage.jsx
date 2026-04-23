import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchAdminAnalyticsFunnel,
  fetchAdminAnalyticsKiosk,
  fetchAdminAnalyticsNearMiss,
  fetchAdminAnalyticsOverview,
  fetchAdminAnalyticsPhoto,
  fetchAdminAnalyticsSchemes,
} from "../lib/adminApi";
import { formatDateTime, formatNumber, formatPercent } from "../lib/adminUi";
import {
  sharedAxisTick,
  sharedChartPanelClass,
  sharedGridStroke,
  sharedPieColors,
  sharedTooltipProps,
} from "../components/rechartsTheme";

function Section({ eyebrow, title, subtitle, children, accent = false, badge = null }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-slate-950/25">
      {accent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400" />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
        {badge ? (
          <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {badge}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
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

function formatChartLabel(value) {
  return String(value || "Unknown")
    .replace(/[_\s]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function RechartsTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 shadow-xl">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">
        {formatNumber(payload[0]?.value)}
        {suffix}
      </p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [showAllMatchDays, setShowAllMatchDays] = useState(false);
  const [showAllNearMisses, setShowAllNearMisses] = useState(false);
  const [showAllPhotoBreakdown, setShowAllPhotoBreakdown] = useState(false);
  const [showAllFunnelStages, setShowAllFunnelStages] = useState(false);
  const [showAllKioskWorkers, setShowAllKioskWorkers] = useState(false);
  const [showAllTopSchemes, setShowAllTopSchemes] = useState(false);

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
  const visibleMatchSeries = showAllMatchDays ? matchSeries : matchSeries.slice(0, 7);
  const matchTotal = matchSeries.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
  const matchDays = matchSeries.length;
  const matchAverage = matchDays ? matchTotal / matchDays : 0;
  const matchPeak = matchSeries.reduce(
    (best, entry) => {
      const count = Number(entry.count || 0);
      return count > best.count ? { day: entry.day, count } : best;
    },
    { day: "-", count: 0 },
  );
  const topNearMissCriteria = nearMiss.criteria || [];
  const topSchemes = (schemes || []).slice(0, 8);
  const photoBreakdown = photo.breakdown || [];
  const kioskWorkers = kiosk.sessionsByWorker || [];
  const visibleNearMissCriteria = showAllNearMisses ? topNearMissCriteria : topNearMissCriteria.slice(0, 5);
  const visiblePhotoBreakdown = showAllPhotoBreakdown ? photoBreakdown : photoBreakdown.slice(0, 4);
  const visibleFunnelStages = showAllFunnelStages ? funnel.stages || [] : (funnel.stages || []).slice(0, 4);
  const visibleKioskWorkers = showAllKioskWorkers ? kioskWorkers : kioskWorkers.slice(0, 4);
  const visibleTopSchemes = showAllTopSchemes ? topSchemes : topSchemes.slice(0, 4);
  const photoTotal = photoBreakdown.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const dominantPhoto = photoBreakdown.reduce(
    (best, item) => {
      const count = Number(item.count || 0);
      return count > best.count ? { label: item.label, count } : best;
    },
    { label: "-", count: 0 },
  );
  const funnelStages = funnel.stages || [];
  const funnelTotal = funnelStages.reduce((sum, stage) => sum + Number(stage.count || 0), 0);
  const funnelPeak = funnelStages.reduce(
    (best, stage) => {
      const count = Number(stage.count || 0);
      return count > best.count ? { label: stage.label, count } : best;
    },
    { label: "-", count: 0 },
  );
  const matchChartData = visibleMatchSeries.map((entry) => ({
    label: entry.day,
    value: Number(entry.count || 0),
  }));
  const nearMissChartData = visibleNearMissCriteria.map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));
  const photoChartData = visiblePhotoBreakdown.map((item) => ({
    label: item.label,
    value: Number(item.count || 0),
  }));
  const funnelChartData = visibleFunnelStages.map((stage) => ({
    label: stage.label,
    value: Number(stage.count || 0),
  }));
  const kioskWorkerChartData = visibleKioskWorkers.map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));
  const schemeChartData = visibleTopSchemes.map((scheme) => ({
    label: scheme.name,
    value: Number(scheme.applications || 0),
  }));
  const lastUpdated = [
    overview.generatedAt,
    funnel.generatedAt,
    nearMiss.generatedAt,
    schemesQuery.data?.generatedAt,
    photo.generatedAt,
    kiosk.generatedAt,
  ]
    .filter(Boolean)
    .sort()
    .pop();

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
        accent
        badge="Live data"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium uppercase tracking-[0.18em] text-slate-300">
            Auto refreshed
          </span>
          <span>{lastUpdated ? `Last updated ${formatDateTime(lastUpdated)}` : "Last updated: unknown"}</span>
        </div>

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Matches by day</p>
                <p className="mt-2 text-sm text-slate-400">A compact view of the daily trend, with the strongest day highlighted.</p>
              </div>
              {matchSeries.length > 7 ? (
                <button
                  type="button"
                  onClick={() => setShowAllMatchDays((value) => !value)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  {showAllMatchDays ? "Show less" : "Show all"}
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">7-day total</p>
                <p className="mt-2 text-2xl font-bold text-white">{formatNumber(matchTotal)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Average/day</p>
                <p className="mt-2 text-2xl font-bold text-cyan-300">{formatNumber(matchAverage)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Peak day</p>
                <p className="mt-2 truncate text-lg font-bold text-emerald-300">{matchPeak.day}</p>
                <p className="text-xs text-slate-400">{formatNumber(matchPeak.count)} matches</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {matchChartData.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={matchChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<RechartsTooltip label="Matches" />} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No daily match history yet. Start a few match runs to see the curve.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top near-miss blockers</p>
                <p className="mt-2 text-sm text-slate-400">The most common blockers users are hitting before a full match.</p>
              </div>
              {topNearMissCriteria.length > 5 ? (
                <button
                  type="button"
                  onClick={() => setShowAllNearMisses((value) => !value)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  {showAllNearMisses ? "Show less" : "Show all"}
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Analyzed profiles</p>
                <p className="mt-2 text-2xl font-bold text-white">{formatNumber(nearMiss.analyzedProfiles)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Top blocker</p>
                <p className="mt-2 text-2xl font-bold text-rose-300">{formatNumber(topNearMissCriteria[0]?.count)}</p>
                <p className="text-xs text-slate-400">
                  {topNearMissCriteria[0]?.key ? topNearMissCriteria[0].key.replace(/_/g, " ") : "No blocker yet"}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {nearMissChartData.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nearMissChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={96} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <Tooltip content={<RechartsTooltip label="Blockers" />} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No near-miss breakdown yet. Once users start missing by one rule, this list will fill in.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Photo breakdown</p>
                <p className="mt-2 text-sm text-slate-400">A compact view of how users are adding profile photos.</p>
              </div>
              {photoBreakdown.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllPhotoBreakdown((value) => !value)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  {showAllPhotoBreakdown ? "Show less" : "Show all"}
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total photos</p>
                <p className="mt-2 text-2xl font-bold text-white">{formatNumber(photoTotal)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Most used</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{formatNumber(dominantPhoto.count)}</p>
                <p className="text-xs text-slate-400">{dominantPhoto.label}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {photoChartData.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={photoChartData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {photoChartData.map((entry, index) => (
                          <Cell
                            key={entry.label}
                            fill={["#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"][index % 6]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<RechartsTooltip label="Photos" />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No photo stats yet. Registration activity will populate this breakdown.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <div className="space-y-6">
        <Section
          eyebrow="Operational Analytics"
          title="Funnel and kiosk analytics"
          subtitle="The funnel shows progression, while kiosk analytics show operator usage and PDF exports."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Funnel stages" value={formatNumber(funnelStages.length)} tone="text-cyan-300" />
            <Metric label="Stage total" value={formatNumber(funnelTotal)} tone="text-emerald-300" />
            <Metric label="Peak stage" value={formatNumber(funnelPeak.count)} hint={funnelPeak.label} tone="text-amber-300" />
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registration funnel</p>
                  <p className="mt-2 text-sm text-slate-400">A compact stage-by-stage view of registration progress.</p>
                </div>
                {funnelStages.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllFunnelStages((value) => !value)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    {showAllFunnelStages ? "Show less" : "Show all"}
                  </button>
                ) : null}
              </div>
              {funnelChartData.length ? (
                <div className="mt-5 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={46} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<RechartsTooltip label="Stages" />} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No funnel data yet. This fills up as users move through registration.</p>
              )}
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kiosk usage</p>
                  <p className="mt-2 text-sm text-slate-400">Sessions, downloads, and the operators using the kiosk most often.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Metric label="Sessions" value={formatNumber(kiosk.totalSessions)} tone="text-cyan-300" />
                <Metric label="PDF downloads" value={formatNumber(kiosk.totalPdfDownloads)} tone="text-amber-300" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">Sessions per worker</p>
                    {kioskWorkers.length > 4 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllKioskWorkers((value) => !value)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        {showAllKioskWorkers ? "Show less" : "Show all"}
                      </button>
                    ) : null}
                </div>
                {kioskWorkerChartData.length ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kioskWorkerChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={92} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                        <Tooltip content={<RechartsTooltip label="Sessions" />} />
                        <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-slate-400">No kiosk usage yet. Once kiosk sessions start, this will show which workers are active.</p>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-white">Top schemes by applications</p>
                    {topSchemes.length > 4 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllTopSchemes((value) => !value)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        {showAllTopSchemes ? "Show less" : "Show all"}
                      </button>
                    ) : null}
                  </div>
                {schemeChartData.length ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schemeChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={96} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                        <Tooltip content={<RechartsTooltip label="Applications" />} />
                        <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-slate-400">No scheme analytics yet. Applications will populate this list.</p>}
              </div>
            </div>
          </div>
          </div>
        </Section>
      </div>
    </section>
  );
}
