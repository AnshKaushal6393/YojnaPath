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
  getProfileDisplayPhoto,
  getUserDisplayPhoto,
  summarizeMatchStats,
} from "../lib/adminUi";
import { USER_TYPE_OPTIONS } from "../data/profileOptions.js";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

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

function PhotoFrame({ src, alt, size = "lg" }) {
  const sizeClass = size === "sm" ? "h-16 w-16 rounded-2xl" : "h-28 w-28 rounded-[28px] sm:h-32 sm:w-32";

  return (
    <div className={`${sizeClass} overflow-hidden border border-white/10 bg-slate-950/80`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-500">
          No photo
        </div>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p>
      ) : null}
      <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
    </div>
  );
}

function StatCard({ label, value, tone = "default", helper }) {
  const valueClassName =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "cyan"
          ? "text-cyan-300"
          : "text-white";

  return (
    <Card className="rounded-[24px]">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className={`mt-3 text-3xl font-semibold ${valueClassName}`}>{value}</p>
        {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-[20px] border border-white/8 bg-slate-950/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-sm font-medium text-slate-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({ message }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-slate-950/60 px-4 py-4 text-sm text-slate-400">
      {message}
    </div>
  );
}

function ProfileCard({ user, profile }) {
  const fields = [
    { label: "State", value: profile.state || "NA" },
    { label: "User type", value: getUserTypeLabel(profile.userType || profile.occupation) },
    { label: "Gender", value: profile.gender || "NA" },
    { label: "Age", value: profile.age ?? "NA" },
    { label: "Caste", value: profile.caste || "NA" },
    { label: "Annual income", value: profile.annualIncome != null ? `Rs ${formatNumber(profile.annualIncome)}` : "NA" },
    { label: "Land acres", value: profile.landAcres != null ? formatNumber(profile.landAcres) : "NA" },
    { label: "Disability %", value: profile.disabilityPct != null ? `${formatNumber(profile.disabilityPct)}%` : "NA" },
  ];

  return (
    <Card className="rounded-[24px]">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <PhotoFrame
            src={getProfileDisplayPhoto(user, profile)}
            alt={profile.profileName || "Profile photo"}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-white">{profile.profileName || "Unnamed profile"}</p>
              {profile.isPrimary ? <Badge variant="success">Primary</Badge> : null}
              {profile.relation ? <Badge variant="default">{profile.relation}</Badge> : null}
              {profile.isStudent ? <Badge variant="info">Student</Badge> : null}
              {profile.isMigrant ? <Badge variant="warning">Migrant</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Updated {formatDateTime(profile.updatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label} className="rounded-[18px] bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{field.label}</p>
              <p className="mt-2 text-sm text-slate-100">{field.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchTimeline({ matches, isLoading, fallbackMessage }) {
  if (isLoading) {
    return <EmptyPanel message="Loading match history..." />;
  }

  if (!matches.length) {
    return <EmptyPanel message={fallbackMessage} />;
  }

  return (
    <div className="space-y-4">
      {matches.slice(0, 12).map((match) => (
        <div key={match.id} className="relative pl-6 sm:pl-8">
          <div className="absolute left-[11px] top-3 h-full w-px bg-white/10 sm:left-[15px]" />
          <div className="absolute left-0 top-2 h-6 w-6 rounded-full border border-emerald-400/30 bg-emerald-400/15 sm:left-1 sm:h-7 sm:w-7" />
          <Card className="rounded-[22px]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {getUserTypeLabel(match.userType || match.occupation)}
                    {match.state ? ` in ${match.state}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="default">{match.sessionType || "web"}</Badge>
                    {match.lang ? <Badge variant="default">{match.lang}</Badge> : null}
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {formatDateTime(match.date)}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Matches</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-200">{formatNumber(match.matchCount)}</p>
                </div>
                <div className="rounded-[18px] bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Near misses</p>
                  <p className="mt-2 text-lg font-semibold text-amber-200">{formatNumber(match.nearMissCount)}</p>
                </div>
                <div className="rounded-[18px] bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Schemes</p>
                  <p className="mt-2 text-lg font-semibold text-cyan-200">
                    {formatNumber(match.schemeIds?.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

function SchemeTable({ rows, type }) {
  if (!rows.length) {
    return <EmptyPanel message={type === "saved" ? "No saved schemes." : "No applications."} />;
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <Card key={`${row.schemeId}-${row.savedAt || row.appliedAt}`} className="rounded-[22px]">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-white">{row.schemeId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {type === "saved" ? (
                  <Badge variant="default">{formatDateTime(row.savedAt)}</Badge>
                ) : (
                  <>
                    <Badge variant="default">{row.status || "pending"}</Badge>
                    <Badge variant="default">{formatDate(row.appliedAt)}</Badge>
                  </>
                )}
              </div>
              {row.notes ? <p className="mt-3 text-sm text-slate-400">{row.notes}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[24px] border border-white/10 lg:block">
        <Table className="bg-slate-950/60">
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent">
              <TableHead>Scheme</TableHead>
              <TableHead>{type === "saved" ? "Saved at" : "Applied at"}</TableHead>
              <TableHead>{type === "saved" ? "Notes" : "Status"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.schemeId}-${row.savedAt || row.appliedAt}`}>
                <TableCell className="font-medium text-white">{row.schemeId}</TableCell>
                <TableCell className="text-slate-300">
                  {type === "saved" ? formatDateTime(row.savedAt) : formatDate(row.appliedAt)}
                </TableCell>
                <TableCell className="text-slate-300">
                  {type === "saved" ? row.notes || "No notes" : row.status || "pending"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
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
  const matchSummary = user?.matchSummary || {};
  const visibleProfile = user?.displayProfile || user?.primaryProfile || null;
  const hasRecentMatchLogs = Boolean(user?.recentMatches?.length);
  const hasMatchSummary = Boolean(
    matchSummary.matchRuns || matchSummary.totalMatches || matchSummary.totalNearMisses
  );
  const matchSourceLabel = hasRecentMatchLogs
    ? "recent match rows"
    : hasMatchSummary
      ? "summary fallback"
      : "no match data";

  const accountFields = [
    { label: "Phone", value: user?.phone || "Unknown" },
    { label: "Language", value: user?.lang || "hi" },
    { label: "Created", value: formatDate(user?.createdAt) },
    { label: "Last login", value: formatDateTime(user?.lastLogin) },
    {
      label: "Registration",
      value: user?.registration?.registrationCompletedAt
        ? formatDateTime(user.registration.registrationCompletedAt)
        : "Pending",
    },
    { label: "Photo type", value: user?.registration?.photoType || user?.photoType || "none" },
  ];

  const primaryProfileFields = visibleProfile
    ? [
        { label: "Profile", value: visibleProfile.profileName || "Unavailable" },
        { label: "Relation", value: visibleProfile.relation || "Self" },
        { label: "State", value: visibleProfile.state || "NA" },
        { label: "User type", value: getUserTypeLabel(visibleProfile.userType || visibleProfile.occupation) },
        { label: "Gender", value: visibleProfile.gender || "NA" },
        { label: "Age", value: visibleProfile.age ?? "NA" },
        { label: "Caste", value: visibleProfile.caste || "NA" },
        {
          label: "Annual income",
          value: visibleProfile.annualIncome != null ? `Rs ${formatNumber(visibleProfile.annualIncome)}` : "NA",
        },
        {
          label: "Disability %",
          value: visibleProfile.disabilityPct != null ? `${formatNumber(visibleProfile.disabilityPct)}%` : "NA",
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/admin/users" className="text-sm text-emerald-300 transition hover:text-emerald-200">
            Back to users
          </Link>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">User detail</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Large profile photo, account details, all profile fields, match history timeline, and scheme activity in
            one responsive admin view.
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={handleDeleteUser}
          disabled={!userId || deleteUserMutation.isPending}
          className="w-full lg:w-auto"
        >
          {deleteUserMutation.isPending ? "Deleting..." : "Delete user"}
        </Button>
      </div>

      {userQuery.isLoading ? <EmptyPanel message="Loading user details..." /> : null}

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
          <Card className="rounded-[28px] overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="border-b border-white/10 p-5 sm:p-6 xl:border-r xl:border-b-0 xl:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <PhotoFrame src={displayPhotoUrl} alt={user.name || "User photo"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                          {user.name || "Unknown user"}
                        </h3>
                        <Badge variant={user.onboardingDone ? "success" : "warning"}>
                          {user.onboardingDone ? "Onboarding complete" : "Onboarding pending"}
                        </Badge>
                      </div>
                      <p className="mt-2 break-all text-sm text-slate-300 sm:break-normal">{user.phone}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="default">Profiles {formatNumber(user.registration?.totalProfiles)}</Badge>
                        <Badge variant="default">Saved {formatNumber(user.savedSchemes?.length)}</Badge>
                        <Badge variant="default">Applications {formatNumber(user.applications?.length)}</Badge>
                        {user.matchSummary?.lastMatchAt ? (
                          <Badge variant="info">Last match {formatDateTime(user.matchSummary.lastMatchAt)}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <SectionHeading
                      eyebrow="Account"
                      title="Identity and session data"
                      description="The account block keeps the operator context visible without burying the core details."
                    />
                    <div className="mt-5">
                      <InfoGrid items={accountFields} />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 xl:p-8">
                  <SectionHeading
                    eyebrow="Primary Profile"
                    title="Eligibility input snapshot"
                    description="This is the current profile used to interpret the user’s eligibility and live matching state."
                  />
                  <div className="mt-5">
                    {primaryProfileFields.length ? (
                      <InfoGrid items={primaryProfileFields} />
                    ) : (
                      <EmptyPanel message="No primary profile details are available for this user." />
                    )}
                  </div>
                  {user.primaryProfile?.id &&
                  visibleProfile?.id &&
                  user.primaryProfile.id !== visibleProfile.id ? (
                    <div className="mt-4 rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      The most complete display profile differs from the stored primary profile.
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Match runs" value={formatNumber(matchStats.matchRuns)} tone="cyan" />
            <StatCard label="Matched schemes" value={formatNumber(matchStats.totalMatches)} tone="emerald" />
            <StatCard label="Near misses" value={formatNumber(matchStats.totalNearMisses)} tone="amber" />
            <StatCard
              label="Eligible now"
              value={formatNumber(liveMatches?.count || 0)}
              tone="emerald"
              helper={liveMatches?.profileReady === false ? liveMatches.message || "Profile incomplete" : "Live snapshot"}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <Card className="rounded-[28px]">
              <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
                <SectionHeading
                  eyebrow="Match History"
                  title="Recent match timeline"
                  description="Timeline view of the user’s logged match runs, ordered newest first."
                />
                <CardDescription className="mt-2">
                  Source: {matchSourceLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                {hasMatchSummary && !hasRecentMatchLogs ? (
                  <div className="mb-5 rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Aggregated totals exist, but individual match rows were not found for this user.
                  </div>
                ) : null}
                <MatchTimeline
                  matches={matches}
                  isLoading={matchesQuery.isLoading}
                  fallbackMessage="No logged match runs were found for this user yet."
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[28px]">
                <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
                  <SectionHeading
                    eyebrow="Live Eligibility"
                    title="Current scheme snapshot"
                    description="Computed from the current profile, not from the historical log."
                  />
                </CardHeader>
                <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[20px] bg-slate-950/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Eligible now</p>
                      <p className="mt-2 text-3xl font-semibold text-emerald-300">
                        {formatNumber(liveMatches?.count || 0)}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-slate-950/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Near misses now</p>
                      <p className="mt-2 text-3xl font-semibold text-amber-300">
                        {formatNumber(liveMatches?.nearMissCount || 0)}
                      </p>
                    </div>
                  </div>

                  {liveMatchesQuery.isLoading ? (
                    <div className="mt-4">
                      <EmptyPanel message="Loading live eligibility..." />
                    </div>
                  ) : null}

                  {!liveMatchesQuery.isLoading && liveMatches?.message ? (
                    <div className="mt-4 rounded-[18px] bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                      {liveMatches.message}
                    </div>
                  ) : null}

                  {liveMatches?.schemes?.length ? (
                    <div className="mt-4 space-y-3">
                      {liveMatches.schemes.slice(0, 6).map((scheme) => (
                        <div
                          key={scheme.schemeId}
                          className="rounded-[18px] border border-white/8 bg-slate-950/60 px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-white">{scheme.name?.en || scheme.schemeId}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {scheme.schemeId}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-[28px]">
                <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
                  <SectionHeading
                    eyebrow="Summary"
                    title="Stored match totals"
                    description="Useful when historical rows are missing but aggregate counters exist."
                  />
                </CardHeader>
                <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-[20px] bg-slate-950/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Runs</p>
                      <p className="mt-2 text-2xl font-semibold text-cyan-300">
                        {formatNumber(matchSummary.matchRuns)}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-slate-950/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Matches</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-300">
                        {formatNumber(matchSummary.totalMatches)}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-slate-950/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Near misses</p>
                      <p className="mt-2 text-2xl font-semibold text-amber-300">
                        {formatNumber(matchSummary.totalNearMisses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card className="rounded-[28px]">
            <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
              <SectionHeading
                eyebrow="Family Profiles"
                title="All linked profiles"
                description="Every saved family member profile is shown with the same field structure for quick admin review."
              />
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
              {(user.profiles || []).length ? (
                <div className="grid gap-4">
                  {user.profiles.map((profile) => (
                    <ProfileCard key={profile.id} user={user} profile={profile} />
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No profiles found for this user." />
              )}
            </CardContent>
          </Card>

          <section className="grid gap-6 2xl:grid-cols-2">
            <Card className="rounded-[28px]">
              <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
                <SectionHeading
                  eyebrow="Saved Schemes"
                  title="Bookmarked schemes"
                  description="Schemes the user chose to save for later review."
                />
              </CardHeader>
              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <SchemeTable rows={user.savedSchemes || []} type="saved" />
              </CardContent>
            </Card>

            <Card className="rounded-[28px]">
              <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
                <SectionHeading
                  eyebrow="Applications"
                  title="Application records"
                  description="Submission status and timestamps for schemes the user applied to."
                />
              </CardHeader>
              <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                <SchemeTable rows={user.applications || []} type="application" />
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </section>
  );
}
