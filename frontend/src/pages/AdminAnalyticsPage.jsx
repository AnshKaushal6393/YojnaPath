import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
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
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  sharedAxisTick,
  sharedChartPanelClass,
  sharedGridStroke,
  sharedPieColors,
  sharedTooltipProps,
} from "../components/rechartsTheme";

const TAB_OPTIONS = [
  { key: "overview", label: "Overview" },
  { key: "funnel", label: "Funnel" },
  { key: "nearmiss", label: "Near-miss" },
  { key: "state", label: "By state" },
  { key: "usertype", label: "By user type" },
  { key: "photo", label: "Photo stats" },
];

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, hint, tone = "text-white" }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ChartPanel({ eyebrow, title, action, children }) {
  return (
    <div className={sharedChartPanelClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
          <p className="mt-2 text-sm font-semibold text-white">{title}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
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

function formatChartLabel(value) {
  return String(value || "Unknown")
    .replace(/[_\s]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function EmptyPanel({ text }) {
  return <p className="text-sm leading-6 text-slate-400">{text}</p>;
}

function StateBars({ data }) {
  const maxValue = Math.max(...data.map((item) => Number(item.count || 0)), 0);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = maxValue > 0 ? (Number(item.count || 0) / maxValue) * 100 : 0;
        return (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-300">{formatChartLabel(item.key)}</span>
              <span className="font-semibold text-white">{formatNumber(item.count)}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-900/80">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400"
                style={{ width: `${Math.max(width, item.count ? 8 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

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
  const schemesPayload = schemesQuery.data || {};
  const photo = photoQuery.data || {};
  const kiosk = kioskQuery.data || {};

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

  const matchSeries = overview.matchesByDay || [];
  const stateData = overview.states || [];
  const userTypeData = overview.userTypes || [];
  const nearMissData = nearMiss.criteria || [];
  const photoData = photo.breakdown || [];
  const funnelStages = funnel.stages || [];
  const topSchemes = (schemesPayload.schemes || []).slice(0, 8);
  const kioskWorkers = kiosk.sessionsByWorker || [];

  const lastUpdated = [
    overview.generatedAt,
    funnel.generatedAt,
    nearMiss.generatedAt,
    schemesPayload.generatedAt,
    photo.generatedAt,
    kiosk.generatedAt,
  ]
    .filter(Boolean)
    .sort()
    .pop();

  const overviewStats = useMemo(() => {
    const matchTotal = matchSeries.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
    const peakMatch = matchSeries.reduce(
      (best, entry) => (Number(entry.count || 0) > best.count ? { day: entry.day, count: Number(entry.count || 0) } : best),
      { day: "-", count: 0 }
    );
    const photoTotal = photoData.reduce((sum, item) => sum + Number(item.count || 0), 0);

    return {
      matchTotal,
      peakMatch,
      photoTotal,
      totalMatches: Number(overview.totals?.matches || 0),
      totalNearMisses: Number(overview.totals?.nearMisses || 0),
      analyzedProfiles: Number(nearMiss.analyzedProfiles || 0),
      totalApplications: Number(schemesPayload.totalApplications || 0),
    };
  }, [matchSeries, nearMiss.analyzedProfiles, overview.totals?.matches, overview.totals?.nearMisses, photoData, schemesPayload.totalApplications]);

  const matchChartData = matchSeries.map((entry) => ({
    label: entry.day,
    value: Number(entry.count || 0),
  }));

  const nearMissChartData = nearMissData.slice(0, 8).map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));

  const stateChartData = stateData.slice(0, 10).map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));

  const userTypeChartData = userTypeData.slice(0, 10).map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));

  const photoChartData = photoData.map((item) => ({
    label: item.label,
    value: Number(item.count || 0),
  }));

  const schemeChartData = topSchemes.map((scheme) => ({
    label: scheme.name,
    value: Number(scheme.applications || 0),
  }));

  const funnelChartData = funnelStages.map((stage) => ({
    label: stage.label,
    value: Number(stage.count || 0),
  }));

  const kioskChartData = kioskWorkers.slice(0, 8).map((item) => ({
    label: formatChartLabel(item.key),
    value: Number(item.count || 0),
  }));

  function renderOverviewTab() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total matches" value={formatNumber(overviewStats.totalMatches)} tone="text-cyan-300" />
          <MetricCard label="Near misses" value={formatNumber(overviewStats.totalNearMisses)} tone="text-rose-300" />
          <MetricCard label="Analyzed profiles" value={formatNumber(overviewStats.analyzedProfiles)} tone="text-amber-300" />
          <MetricCard label="Applications" value={formatNumber(overviewStats.totalApplications)} tone="text-emerald-300" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <ChartPanel eyebrow="Match trend" title="Daily matches">
            {matchChartData.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="30-day total" value={formatNumber(overviewStats.matchTotal)} />
                  <MetricCard label="Peak day" value={overviewStats.peakMatch.day} hint={`${formatNumber(overviewStats.peakMatch.count)} matches`} tone="text-emerald-300" />
                  <MetricCard label="Photo uploads" value={formatNumber(overviewStats.photoTotal)} tone="text-amber-300" />
                </div>
                <div className="mt-5 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={matchChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} vertical={false} />
                      <XAxis dataKey="label" tick={sharedAxisTick} interval={4} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Matches" />} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <EmptyPanel text="No daily match history yet." />
            )}
          </ChartPanel>

          <ChartPanel eyebrow="Operational mix" title="State and user-type leaders">
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Top states</p>
                {stateData.length ? <StateBars data={stateData.slice(0, 5)} /> : <EmptyPanel text="No state analytics yet." />}
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Top user types</p>
                {userTypeData.length ? <StateBars data={userTypeData.slice(0, 5)} /> : <EmptyPanel text="No user-type analytics yet." />}
              </div>
            </div>
          </ChartPanel>
        </div>
      </div>
    );
  }

  function renderFunnelTab() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <ChartPanel eyebrow="Funnel" title="Registration progression">
          {funnelChartData.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Stages" value={formatNumber(funnelStages.length)} />
                <MetricCard label="Entrants" value={formatNumber(funnelChartData[0]?.value || 0)} tone="text-cyan-300" />
                <MetricCard
                  label="Final stage"
                  value={formatNumber(funnelChartData[funnelChartData.length - 1]?.value || 0)}
                  tone="text-emerald-300"
                />
              </div>
              <div className="mt-5 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Users" />} />
                    <Funnel dataKey="value" data={funnelChartData} isAnimationActive>
                      <LabelList position="right" dataKey="label" fill="#e2e8f0" stroke="none" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyPanel text="No funnel data yet." />
          )}
        </ChartPanel>

        <ChartPanel eyebrow="Retention" title="Stage-by-stage dropoff">
          {funnelStages.length ? (
            <div className="space-y-3">
              {funnelStages.map((stage, index) => {
                const count = Number(stage.count || 0);
                const previousCount = index === 0 ? count : Number(funnelStages[index - 1]?.count || 0);
                const retention = index === 0 || previousCount <= 0 ? 100 : (count / previousCount) * 100;

                return (
                  <div key={stage.key || stage.label || index} className="rounded-[18px] border border-white/8 bg-slate-950/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{stage.label}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {index === 0 ? "Starting stage" : `${formatPercent(retention)} retained from previous stage`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatNumber(count)}</p>
                        <p className="text-xs text-slate-400">users</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyPanel text="No funnel breakdown yet." />
          )}
        </ChartPanel>
      </div>
    );
  }

  function renderNearMissTab() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <ChartPanel eyebrow="Near-miss" title="Most common blockers">
          {nearMissChartData.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Profiles checked" value={formatNumber(nearMiss.analyzedProfiles)} />
                <MetricCard label="Total near misses" value={formatNumber(nearMiss.totalNearMisses)} tone="text-rose-300" />
                <MetricCard
                  label="Top blocker"
                  value={formatNumber(nearMissChartData[0]?.value || 0)}
                  hint={nearMissChartData[0]?.label || "None"}
                  tone="text-amber-300"
                />
              </div>
              <div className="mt-5 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nearMissChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={120} tick={sharedAxisTick} />
                    <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Blockers" />} />
                    <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyPanel text="No near-miss breakdown yet." />
          )}
        </ChartPanel>

        <ChartPanel eyebrow="Scheme pressure" title="Schemes with the most near misses">
          {Array.isArray(nearMiss.schemes) && nearMiss.schemes.length ? (
            <div className="space-y-3">
              {nearMiss.schemes.slice(0, 8).map((scheme) => (
                <div key={scheme.schemeId} className="rounded-[18px] border border-white/8 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{scheme.name || scheme.schemeId}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{scheme.schemeId}</p>
                    </div>
                    <Badge variant="warning">{formatNumber(scheme.nearMisses)} near misses</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="No scheme-level near-miss list yet." />
          )}
        </ChartPanel>
      </div>
    );
  }

  function renderStateTab() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartPanel eyebrow="State distribution" title="Matches by state">
          {stateChartData.length ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={92} tick={sharedAxisTick} />
                  <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Matches" />} />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="No state data yet." />
          )}
        </ChartPanel>

        <ChartPanel eyebrow="State breakdown" title="Top states at a glance">
          {stateData.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Tracked states" value={formatNumber(stateData.length)} />
                <MetricCard
                  label="Top state"
                  value={formatChartLabel(stateData[0]?.key)}
                  hint={`${formatNumber(stateData[0]?.count || 0)} matches`}
                  tone="text-emerald-300"
                />
              </div>
              <div className="mt-5">
                <StateBars data={stateData.slice(0, 8)} />
              </div>
            </>
          ) : (
            <EmptyPanel text="No state summary yet." />
          )}
        </ChartPanel>
      </div>
    );
  }

  function renderUserTypeTab() {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <ChartPanel eyebrow="User type" title="Match volume by user type">
          {userTypeChartData.length ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userTypeChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={sharedAxisTick} />
                  <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Matches" />} />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel text="No user-type data yet." />
          )}
        </ChartPanel>

        <ChartPanel eyebrow="Cross-signal" title="Kiosk workers and top schemes">
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Kiosk worker sessions</p>
              {kioskChartData.length ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kioskChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={92} tick={sharedAxisTick} />
                      <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Sessions" />} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel text="No kiosk sessions yet." />
              )}
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Top schemes by applications</p>
              {schemeChartData.length ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schemeChartData} layout="vertical" margin={{ top: 10, right: 8, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={100} tick={sharedAxisTick} />
                      <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Applications" />} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel text="No scheme application ranking yet." />
              )}
            </div>
          </div>
        </ChartPanel>
      </div>
    );
  }

  function renderPhotoTab() {
    return (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ChartPanel eyebrow="Photo stats" title="Profile photo breakdown">
          {photoChartData.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Total photos" value={formatNumber(photo.total || 0)} />
                <MetricCard label="Methods tracked" value={formatNumber(photoData.length)} />
                <MetricCard
                  label="Top source"
                  value={photoChartData[0]?.label || "-"}
                  hint={`${formatNumber(photoChartData[0]?.value || 0)} profiles`}
                  tone="text-amber-300"
                />
              </div>
              <div className="mt-5 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={photoChartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={118}
                      paddingAngle={3}
                    >
                      {photoChartData.map((entry, index) => (
                        <Cell key={entry.label} fill={sharedPieColors[index % sharedPieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...sharedTooltipProps} content={<RechartsTooltip label="Profiles" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyPanel text="No photo data yet." />
          )}
        </ChartPanel>

        <ChartPanel eyebrow="Distribution" title="Photo source detail">
          {photoData.length ? (
            <div className="space-y-3">
              {photoData.map((item) => (
                <div key={item.key} className="rounded-[18px] border border-white/8 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatPercent(item.pct || 0)} of all profile photos</p>
                    </div>
                    <Badge variant="info">{formatNumber(item.count)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="No photo source list yet." />
          )}
        </ChartPanel>
      </div>
    );
  }

  function renderActiveTab() {
    if (activeTab === "funnel") return renderFunnelTab();
    if (activeTab === "nearmiss") return renderNearMissTab();
    if (activeTab === "state") return renderStateTab();
    if (activeTab === "usertype") return renderUserTypeTab();
    if (activeTab === "photo") return renderPhotoTab();
    return renderOverviewTab();
  }

  return (
    <Card className="rounded-[22px] p-0 sm:rounded-[28px]">
      <CardHeader className="gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Analytics routes</p>
            <CardTitle className="mt-3 text-2xl sm:text-3xl">Analytics</CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              Overview, funnel, near-miss, state, user-type, and photo analytics in one responsive admin surface.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Live data</Badge>
            <Badge variant="default">{lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : "Updated unknown"}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            Loading analytics...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[20px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error.message || "Could not load analytics right now."}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {TAB_OPTIONS.map((tab) => (
            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        {!isLoading && !error ? renderActiveTab() : null}
      </CardContent>
    </Card>
  );
}
