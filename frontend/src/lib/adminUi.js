export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

export function formatDateTime(value) {
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

export function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

export function getPhotoCompletion(stats) {
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

export function getPhotoBreakdown(stats) {
  return (stats?.photoStats || []).map((row) => ({
    label: row.photo_type === "none" ? "No photo" : row.photo_type,
    count: Number(row.count || 0),
  }));
}

export function getUserDisplayPhoto(user) {
  if (!user) {
    return "";
  }

  if (user.displayPhotoUrl) {
    return user.displayPhotoUrl;
  }

  if (user.photoUrl) {
    return user.photoUrl;
  }

  if (user.primaryProfile?.photoUrl) {
    return user.primaryProfile.photoUrl;
  }

  const firstProfilePhoto = (user.profiles || []).find((profile) => profile.photoUrl)?.photoUrl;
  return firstProfilePhoto || "";
}

export function getProfileDisplayPhoto(user, profile) {
  if (!profile) {
    return "";
  }

  if (profile.photoUrl) {
    return profile.photoUrl;
  }

  if (profile.isPrimary) {
    return user?.photoUrl || "";
  }

  return "";
}

export function summarizeMatchStats(user, matches = []) {
  const summary = user?.matchSummary || {};
  const matchRuns = Number(summary.matchRuns || 0);
  const totalMatches = Number(summary.totalMatches || 0);
  const totalNearMisses = Number(summary.totalNearMisses || 0);

  if (matchRuns > 0 || totalMatches > 0 || totalNearMisses > 0) {
    return {
      matchRuns,
      totalMatches,
      totalNearMisses,
    };
  }

  return {
    matchRuns: matches.length,
    totalMatches: matches.reduce((sum, match) => sum + Number(match.matchCount || 0), 0),
    totalNearMisses: matches.reduce((sum, match) => sum + Number(match.nearMissCount || 0), 0),
  };
}
