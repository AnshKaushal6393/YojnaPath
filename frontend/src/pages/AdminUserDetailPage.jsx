import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUserLiveMatches,
  fetchAdminUserMatches,
} from "../lib/adminApi";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  getUserDisplayPhoto,
  summarizeMatchStats,
} from "../lib/adminUi";
import { USER_TYPE_OPTIONS } from "../data/profileOptions.js";

function renderPhoto(photoUrl, label) {
  if (!photoUrl) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 text-xs text-slate-500">
        No photo
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={label}
      className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
    />
  );
}

function getUserTypeLabel(userType) {
  return USER_TYPE_OPTIONS.find((option) => option.key === userType)?.label || userType || "Unknown";
}

export default function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchAdminUser(userId),
    enabled: Boolean(userId),
  });
  const matchesQuery = useQuery({
    queryKey: ["admin-user-matches", userId],
    queryFn: () => fetchAdminUserMatches(userId),
    enabled: Boolean(userId),
  });
  const liveMatchesQuery = useQuery({
    queryKey: ["admin-user-live-matches", userId],
    queryFn: () => fetchAdminUserLiveMatches(userId),
    enabled: Boolean(userId),
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate("/admin/users", { replace: true });
    },
  });

  useEffect(() => {
    if (
      (userQuery.isSuccess && userQuery.data === null) ||
      (matchesQuery.isSuccess && matchesQuery.data === null) ||
      (liveMatchesQuery.isSuccess && liveMatchesQuery.data === null)
    ) {
      navigate("/admin/login", { replace: true });
    }
  }, [
    liveMatchesQuery.data,
    liveMatchesQuery.isSuccess,
    matchesQuery.data,
    matchesQuery.isSuccess,
    navigate,
    userQuery.data,
    userQuery.isSuccess,
  ]);

  function handleDeleteUser() {
    if (!userId || deleteUserMutation.isPending) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this user permanently? This removes every profile, match log, saved scheme, and uploaded image."
    );

    if (!shouldDelete) {
      return;
    }

    deleteUserMutation.mutate(userId);
  }

  const user = userQuery.data;
  const matches = matchesQuery.data?.matches || user?.recentMatches || [];
  const liveMatches = liveMatchesQuery.data;
  const displayPhotoUrl = getUserDisplayPhoto(user);
  const matchStats = summarizeMatchStats(user, matches);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/admin/users" className="text-sm text-emerald-300 transition hover:text-emerald-200">
            Back to users
          </Link>
          <h2 className="mt-3 text-3xl font-semibold text-white">User detail</h2>
        </div>
        <button
          type="button"
          onClick={handleDeleteUser}
          disabled={!userId || deleteUserMutation.isPending}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleteUserMutation.isPending ? "Deleting..." : "Delete user"}
        </button>
      </div>

      {userQuery.isLoading ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 text-sm text-slate-300">
          Loading user details...
        </div>
      ) : null}

      {userQuery.error || matchesQuery.error || liveMatchesQuery.error || deleteUserMutation.error ? (
        <div className="rounded-[24px] border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-100">
          {userQuery.error?.message ||
            matchesQuery.error?.message ||
            liveMatchesQuery.error?.message ||
            deleteUserMutation.error?.message ||
            "Could not load this user right now."}
        </div>
      ) : null}

      {user ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {renderPhoto(displayPhotoUrl, user.name || "User photo")}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">
                    Account
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{user.name || "Unknown user"}</h3>
                  <p className="mt-2 text-sm text-slate-300">{user.phone}</p>
                  <p className="mt-1 text-sm text-slate-400">Created {formatDate(user.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-white/5 px-3 py-1">Lang: {user.lang || "hi"}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      Photo type: {user.registration?.photoType || user.photoType || "none"}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      Profiles: {formatNumber(user.registration?.totalProfiles)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-slate-950/75 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Registration</p>
                  <p className="mt-3 text-sm text-slate-200">
                    Completed:{" "}
                    {user.registration?.registrationCompletedAt
                      ? formatDateTime(user.registration.registrationCompletedAt)
                      : "Pending"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Last login: {formatDateTime(user.lastLogin)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Onboarding: {user.registration?.onboardingDone ? "done" : "pending"}
                  </p>
                </div>
                <div className="rounded-[18px] bg-slate-950/75 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Primary profile</p>
                  <p className="mt-3 text-sm text-slate-200">
                    {user.primaryProfile?.profileName || "Unavailable"}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p>
                      {user.primaryProfile?.state || "NA"} / {getUserTypeLabel(user.primaryProfile?.userType)}
                    </p>
                    <p>Gender: {user.primaryProfile?.gender || "NA"}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Logged match runs</p>
                <p className="mt-4 text-4xl font-semibold text-cyan-300">
                  {formatNumber(matchStats.matchRuns)}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Schemes in logs</p>
                <p className="mt-4 text-4xl font-semibold text-emerald-300">
                  {formatNumber(matchStats.totalMatches)}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Near misses in logs</p>
                <p className="mt-4 text-4xl font-semibold text-amber-300">
                  {formatNumber(matchStats.totalNearMisses)}
                </p>
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Live Eligibility
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Current scheme snapshot</h3>
              <p className="mt-2 text-sm text-slate-400">
                Computed from the user&apos;s current primary profile, not from historical logs.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[18px] bg-slate-950/75 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Eligible now</p>
                  <p className="mt-4 text-4xl font-semibold text-emerald-300">
                    {formatNumber(liveMatches?.count || 0)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-slate-950/75 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Near misses now</p>
                  <p className="mt-4 text-4xl font-semibold text-amber-300">
                    {formatNumber(liveMatches?.nearMissCount || 0)}
                  </p>
                </div>
              </div>
              {!liveMatchesQuery.isLoading && liveMatches?.message ? (
                <div className="mt-4 rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                  {liveMatches.message}
                </div>
              ) : null}
              {liveMatchesQuery.isLoading ? (
                <div className="mt-4 rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                  Loading live eligibility...
                </div>
              ) : null}
              {liveMatches?.schemes?.length ? (
                <div className="mt-4 space-y-2">
                  {liveMatches.schemes.slice(0, 5).map((scheme) => (
                    <div
                      key={scheme.schemeId}
                      className="flex items-center justify-between rounded-[16px] bg-slate-900/70 px-4 py-3 text-sm"
                    >
                      <span className="text-slate-200">{scheme.name?.en || scheme.schemeId}</span>
                      <span className="text-slate-500">{scheme.schemeId}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
                Family Profiles
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">All linked profiles</h3>
              <div className="mt-6 space-y-4">
                {(user.profiles || []).length ? (
                  user.profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="rounded-[20px] border border-white/8 bg-slate-900/70 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {renderPhoto(profile.photoUrl, profile.profileName || "Profile photo")}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-white">
                              {profile.profileName || "Unnamed profile"}
                            </p>
                            {profile.isPrimary ? (
                              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                                Primary
                              </span>
                            ) : null}
                            {profile.relation ? (
                              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {profile.relation}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-300">
                            <p>State: {profile.state || "NA"}</p>
                            <p>Occupation: {profile.occupation || "unknown"}</p>
                            <p>Gender: {profile.gender || "NA"}</p>
                            <p>Age: {profile.age ?? "NA"}</p>
                            <p>Caste: {profile.caste || "NA"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    No profiles found for this user.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Match History
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Recent match logs</h3>
              <p className="mt-2 text-sm text-slate-400">
                This section shows only match runs saved in analytics logs for this user account.
              </p>
              <div className="mt-6 space-y-3">
                {matchesQuery.isLoading ? (
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    Loading match history...
                  </div>
                ) : null}
                {matches.length ? (
                  matches.slice(0, 12).map((match) => (
                    <div
                      key={match.id}
                      className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {match.occupation || "unknown"} {match.state ? `| ${match.state}` : ""}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {match.sessionType || "web"}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">{formatDateTime(match.date)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
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
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    No attributed match history for this user yet.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Saved Schemes
              </p>
              <div className="mt-5 space-y-2">
                {user.savedSchemes?.length ? (
                  user.savedSchemes.map((scheme) => (
                    <div
                      key={`${scheme.schemeId}-${scheme.savedAt}`}
                      className="flex items-center justify-between rounded-[16px] bg-slate-900/70 px-4 py-3 text-sm"
                    >
                      <span className="text-slate-200">{scheme.schemeId}</span>
                      <span className="text-slate-500">{formatDateTime(scheme.savedAt)}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    No saved schemes.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                Applications
              </p>
              <div className="mt-5 space-y-2">
                {user.applications?.length ? (
                  user.applications.map((application) => (
                    <div
                      key={`${application.schemeId}-${application.appliedAt}`}
                      className="flex items-center justify-between rounded-[16px] bg-slate-900/70 px-4 py-3 text-sm"
                    >
                      <span className="text-slate-200">{application.schemeId}</span>
                      <span className="text-slate-500">
                        {application.status} | {formatDate(application.appliedAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    No applications.
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </section>
  );
}
