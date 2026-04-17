import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  deleteAdminUser,
  downloadAdminUsersExport,
  fetchAdminActivity,
  fetchAdminDashboard,
  fetchAdminFunnel,
  fetchAdminStats,
  fetchAdminUser,
  fetchAdminUserMatches,
  fetchAdminUsers,
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

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function createEmptyFilters() {
  return {
    page: 1,
    limit: 8,
    state: "",
    userType: "",
    search: "",
    hasPhoto: "",
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(createEmptyFilters);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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
  const usersQuery = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => fetchAdminUsers(filters),
  });
  const selectedUserQuery = useQuery({
    queryKey: ["admin-user", selectedUserId],
    queryFn: () => fetchAdminUser(selectedUserId),
    enabled: Boolean(selectedUserId),
  });
  const selectedUserMatchesQuery = useQuery({
    queryKey: ["admin-user-matches", selectedUserId],
    queryFn: () => fetchAdminUserMatches(selectedUserId),
    enabled: Boolean(selectedUserId),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: (_, deletedUserId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
      queryClient.removeQueries({ queryKey: ["admin-user", deletedUserId] });
      queryClient.removeQueries({ queryKey: ["admin-user-matches", deletedUserId] });
      setSelectedUserId((currentId) => (currentId === deletedUserId ? "" : currentId));
    },
  });

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  async function handleExport() {
    setIsExporting(true);

    try {
      const blob = await downloadAdminUsersExport();
      if (!blob) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-users-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  function handleDeleteUser() {
    if (!selectedUserId || deleteUserMutation.isPending) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this user permanently? This removes the profile, match history, saved schemes, and uploaded photo."
    );

    if (!shouldDelete) {
      return;
    }

    deleteUserMutation.mutate(selectedUserId);
  }

  const admin = dashboardQuery.data?.admin;
  const overview = dashboardQuery.data?.overview;
  const stats = statsQuery.data;
  const activity = activityQuery.data?.events || [];
  const funnelStages = funnelQuery.data?.stages || [];
  const funnelMaxCount = funnelQuery.data?.maxCount || 0;
  const usersPayload = usersQuery.data;
  const users = usersPayload?.users || [];
  const selectedUser = selectedUserQuery.data;
  const selectedUserMatches = selectedUserMatchesQuery.data?.matches || [];
  const criticalError =
    dashboardQuery.error || statsQuery.error || usersQuery.error || deleteUserMutation.error;
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
  const totalUserPages = usersPayload?.totalPages || 0;

  useEffect(() => {
    if (
      (dashboardQuery.isSuccess && dashboardQuery.data === null) ||
      (statsQuery.isSuccess && statsQuery.data === null) ||
      (activityQuery.isSuccess && activityQuery.data === null) ||
      (funnelQuery.isSuccess && funnelQuery.data === null) ||
      (usersQuery.isSuccess && usersQuery.data === null) ||
      (selectedUserId && selectedUserQuery.isSuccess && selectedUserQuery.data === null)
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
    selectedUserId,
    selectedUserQuery.data,
    selectedUserQuery.isSuccess,
    statsQuery.data,
    statsQuery.isSuccess,
    usersQuery.data,
    usersQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!selectedUserId && users.length) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export users CSV"}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
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
                  `/api/admin/activity`, `/api/admin/funnel`, and the new admin user routes.
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

            <section className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
                      User Routes
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Admin user explorer</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Filter all users, inspect registrations, and jump into match history.
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                    Showing {formatNumber(usersPayload?.total || 0)} users
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    type="search"
                    value={filters.search}
                    onChange={(event) => handleFilterChange("search", event.target.value)}
                    placeholder="Search by name, phone, district"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50"
                  />
                  <input
                    type="text"
                    value={filters.state}
                    onChange={(event) => handleFilterChange("state", event.target.value.toUpperCase())}
                    placeholder="State code"
                    maxLength={10}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50"
                  />
                  <select
                    value={filters.userType}
                    onChange={(event) => handleFilterChange("userType", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
                  >
                    <option value="">All user types</option>
                    <option value="farmer">farmer</option>
                    <option value="business">business</option>
                    <option value="women">women</option>
                    <option value="student">student</option>
                    <option value="worker">worker</option>
                    <option value="health">health</option>
                    <option value="housing">housing</option>
                    <option value="senior">senior</option>
                    <option value="disability">disability</option>
                    <option value="shopkeeper">shopkeeper</option>
                    <option value="artisan">artisan</option>
                    <option value="daily_wage">daily_wage</option>
                    <option value="retired">retired</option>
                    <option value="disabled">disabled</option>
                    <option value="migrant_worker">migrant_worker</option>
                  </select>
                  <select
                    value={filters.hasPhoto}
                    onChange={(event) => handleFilterChange("hasPhoto", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
                  >
                    <option value="">All photos</option>
                    <option value="true">Has photo</option>
                    <option value="false">No photo</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => setFilters(createEmptyFilters())}
                  >
                    Reset filters
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                  <div className="grid grid-cols-[1.35fr_0.8fr_0.9fr_0.7fr] gap-3 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    <span>User</span>
                    <span>State / Type</span>
                    <span>Match count</span>
                    <span>Photo</span>
                  </div>
                  <div className="divide-y divide-white/6 bg-slate-950/60">
                    {usersQuery.isLoading ? (
                      <div className="px-4 py-6 text-sm text-slate-400">Loading users...</div>
                    ) : null}
                    {!usersQuery.isLoading && users.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-400">
                        No users match the current filters.
                      </div>
                    ) : null}
                    {users.map((user) => {
                      const isActive = user.id === selectedUserId;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className={`grid w-full grid-cols-[1.35fr_0.8fr_0.9fr_0.7fr] gap-3 px-4 py-4 text-left transition ${
                            isActive ? "bg-emerald-400/10" : "hover:bg-white/5"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-white">
                              {user.name || "Unknown"}
                            </span>
                            <span className="mt-1 block text-xs text-slate-400">{user.phone}</span>
                          </span>
                          <span className="text-sm text-slate-300">
                            {user.primaryProfile?.state || "NA"} /{" "}
                            {user.primaryProfile?.occupation || "unknown"}
                          </span>
                          <span className="text-sm text-slate-300">
                            {formatNumber(user.stats?.totalMatches)}
                          </span>
                          <span className="text-sm text-slate-300">
                            {user.photoUrl ? "Yes" : "No"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    Page {formatNumber(filters.page)} of {formatNumber(totalUserPages || 1)}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleFilterChange("page", Math.max(filters.page - 1, 1))}
                      disabled={filters.page <= 1}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleFilterChange(
                          "page",
                          totalUserPages ? Math.min(filters.page + 1, totalUserPages) : filters.page + 1
                        )
                      }
                      disabled={Boolean(totalUserPages) && filters.page >= totalUserPages}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">
                      User Detail
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Selected account</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteUser}
                    disabled={!selectedUserId || deleteUserMutation.isPending}
                    className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleteUserMutation.isPending ? "Deleting..." : "Delete user"}
                  </button>
                </div>

                {!selectedUserId ? (
                  <div className="mt-6 rounded-[18px] bg-slate-900/70 px-4 py-4 text-sm text-slate-400">
                    Pick a user from the list to view details.
                  </div>
                ) : null}

                {selectedUserQuery.isLoading ? (
                  <div className="mt-6 rounded-[18px] bg-slate-900/70 px-4 py-4 text-sm text-slate-400">
                    Loading selected user...
                  </div>
                ) : null}

                {selectedUser ? (
                  <>
                    <div className="mt-6 rounded-[24px] bg-slate-900/70 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{selectedUser.name}</h3>
                          <p className="mt-1 text-sm text-slate-300">{selectedUser.phone}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            Created {formatDate(selectedUser.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Lang: {selectedUser.lang || "hi"}
                          </span>
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Photo: {selectedUser.registration?.hasPhoto ? "yes" : "no"}
                          </span>
                          <span className="rounded-full bg-white/5 px-3 py-1">
                            Profiles: {formatNumber(selectedUser.registration?.totalProfiles)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Registration
                          </p>
                          <p className="mt-3 text-sm text-slate-200">
                            Completed:{" "}
                            {selectedUser.registration?.registrationCompletedAt
                              ? formatDateTime(selectedUser.registration.registrationCompletedAt)
                              : "Pending"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            Last login: {formatDateTime(selectedUser.lastLogin)}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            Onboarding: {selectedUser.registration?.onboardingDone ? "done" : "pending"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Primary profile
                          </p>
                          <p className="mt-3 text-sm text-slate-200">
                            {selectedUser.primaryProfile?.profileName || "Unavailable"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {selectedUser.primaryProfile?.state || "NA"} /{" "}
                            {selectedUser.primaryProfile?.occupation || "unknown"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            District: {selectedUser.primaryProfile?.district || "NA"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[18px] bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Match runs
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-cyan-300">
                          {formatNumber(selectedUser.matchSummary?.matchRuns)}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Schemes matched
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-emerald-300">
                          {formatNumber(selectedUser.matchSummary?.totalMatches)}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Saved schemes
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-amber-300">
                          {formatNumber(selectedUser.savedSchemes?.length)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <div className="rounded-[20px] bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-white">Recent matches</p>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {selectedUserMatchesQuery.isFetching ? "Refreshing" : "Latest log"}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {selectedUserMatches.length ? (
                            selectedUserMatches.slice(0, 6).map((match) => (
                              <div
                                key={match.id}
                                className="rounded-[16px] border border-white/8 bg-slate-950/70 px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-semibold text-white">
                                    {match.occupation || "unknown"} {match.state ? `| ${match.state}` : ""}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {formatDateTime(match.date)}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                                  <span className="rounded-full bg-white/5 px-3 py-1">
                                    Matches: {formatNumber(match.matchCount)}
                                  </span>
                                  <span className="rounded-full bg-white/5 px-3 py-1">
                                    Near misses: {formatNumber(match.nearMissCount)}
                                  </span>
                                  <span className="rounded-full bg-white/5 px-3 py-1">
                                    Schemes: {formatNumber(match.schemeIds?.length)}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[16px] bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                              No match history for this user yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[20px] bg-slate-900/70 p-4">
                        <p className="text-sm font-semibold text-white">Saved schemes</p>
                        <div className="mt-4 space-y-2">
                          {selectedUser.savedSchemes?.length ? (
                            selectedUser.savedSchemes.slice(0, 6).map((scheme) => (
                              <div
                                key={`${scheme.schemeId}-${scheme.savedAt}`}
                                className="flex items-center justify-between rounded-[16px] bg-slate-950/70 px-4 py-3 text-sm"
                              >
                                <span className="text-slate-200">{scheme.schemeId}</span>
                                <span className="text-slate-500">{formatDateTime(scheme.savedAt)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[16px] bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                              No saved schemes.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
