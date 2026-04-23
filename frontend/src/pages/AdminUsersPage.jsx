import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { downloadAdminUsersExport, fetchAdminUsers } from "../lib/adminApi";
import { formatDateTime, formatNumber, getUserDisplayPhoto } from "../lib/adminUi";
import { USER_TYPE_OPTIONS } from "../data/profileOptions";

function getUserTypeLabel(userType) {
  if (!userType) return "Unknown";

  const normalized = userType.toString().toLowerCase().trim();
  const legacyMap = {
    shopkeeper: "business",
    artisan: "business",
    daily_wage: "worker",
    retired: "senior",
    disabled: "disability",
    migrant_worker: "worker",
  };
  const mapped = legacyMap[normalized] || normalized;
  const match = USER_TYPE_OPTIONS.find((option) => option.key === mapped);

  return match?.label || mapped.charAt(0).toUpperCase() + mapped.slice(1) || "Unknown";
}

function createEmptyFilters() {
  return {
    page: 1,
    limit: 10,
    state: "",
    userType: "",
    search: "",
    hasPhoto: "",
    sortBy: "createdAt",
    sortDir: "desc",
  };
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(createEmptyFilters);
  const [isExporting, setIsExporting] = useState(false);
  const usersQuery = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => fetchAdminUsers(filters),
  });

  useEffect(() => {
    if (usersQuery.isSuccess && usersQuery.data === null) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, usersQuery.data, usersQuery.isSuccess]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  function handleSortChange(sortBy) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDir: current.sortBy === sortBy && current.sortDir === "asc" ? "desc" : "asc",
      page: 1,
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

  const usersPayload = usersQuery.data;
  const users = usersPayload?.users || [];
  const totalPages = usersPayload?.totalPages || 0;

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
            User Routes
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Admin user explorer</h2>
          <p className="mt-2 text-sm text-slate-300">
            Search, filter, export, and open full user detail pages.
          </p>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Export users CSV"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => handleFilterChange("search", event.target.value)}
          placeholder="Search by name, phone, or profile name"
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50"
        />
        <input
          type="text"
          value={filters.state}
          onChange={(event) => handleFilterChange("state", event.target.value.toUpperCase())}
          placeholder="Filter by state"
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

      {usersQuery.error ? (
        <div className="mt-6 rounded-[20px] border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          {usersQuery.error.message || "Could not load users right now."}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse bg-slate-950/60">
            <thead className="bg-white/10 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Photo</th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortChange("name")}
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    User
                    <span className="text-[10px] text-slate-500">
                      {filters.sortBy === "name" ? (filters.sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortChange("state")}
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    State / Type
                    <span className="text-[10px] text-slate-500">
                      {filters.sortBy === "state" ? (filters.sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortChange("matchRuns")}
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    Match stats
                    <span className="text-[10px] text-slate-500">
                      {filters.sortBy === "matchRuns" ? (filters.sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortChange("lastLogin")}
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    Last login
                    <span className="text-[10px] text-slate-500">
                      {filters.sortBy === "lastLogin" ? (filters.sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {usersQuery.isLoading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-sm text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : null}
              {!usersQuery.isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-sm text-slate-400">
                    No users match the current filters.
                  </td>
                </tr>
              ) : null}
              {users.map((user) => {
                const thumbnail = getUserDisplayPhoto(user);
                const userType = getUserTypeLabel(user.primaryProfile?.userType || user.primaryProfile?.occupation);

                return (
                  <tr
                    key={user.id}
                    className="cursor-pointer transition hover:bg-white/5"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
                        {thumbnail ? (
                          <img src={thumbnail} alt={user.name || "User photo"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                            No photo
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block text-sm font-semibold text-white">{user.name || "Unknown"}</span>
                      <span className="mt-1 block text-xs text-slate-400">{user.phone}</span>
                      {user.primaryProfile?.profileName ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          Profile: {user.primaryProfile.profileName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      <span className="block">{user.primaryProfile?.state || "NA"}</span>
                      <span className="mt-1 block">{userType}</span>
                      <span className="mt-2 inline-flex rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
                        {user.onboardingDone ? "Onboarding complete" : "Onboarding pending"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                          {formatNumber(user.stats?.matchRuns)} runs
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                          {formatNumber(user.stats?.totalMatches)} schemes
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                          {formatNumber(user.stats?.totalNearMisses)} near misses
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      <span className="block">{formatDateTime(user.lastLogin)}</span>
                      <span className="mt-2 block text-xs text-slate-500">
                        {user.registrationCompletedAt ? "Registered" : "Registration pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Showing {formatNumber(usersPayload?.total || 0)} users. Page {formatNumber(filters.page)} of{" "}
          {formatNumber(totalPages || 1)}
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
              handleFilterChange("page", totalPages ? Math.min(filters.page + 1, totalPages) : filters.page + 1)
            }
            disabled={Boolean(totalPages) && filters.page >= totalPages}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
