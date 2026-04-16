export function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function findOwnerProfile(members = [], accountOwnerName = "") {
  const normalizedOwnerName = normalizeComparisonName(accountOwnerName);
  if (!normalizedOwnerName) {
    return null;
  }

  return (
    members.find((member) => normalizeComparisonName(member.profileName) === normalizedOwnerName) ||
    null
  );
}

export function getOwnerProfileState(members = [], accountOwnerName = "", activeProfileId = "") {
  const ownerProfile = findOwnerProfile(members, accountOwnerName);
  const accountOwnerProfileId = ownerProfile?.id || "";
  const accountOwnerHasProfile = Boolean(ownerProfile);
  const isOwnerProfile = Boolean(
    accountOwnerProfileId
      ? activeProfileId === accountOwnerProfileId
      : normalizeComparisonName(accountOwnerName)
  );

  return {
    ownerProfile,
    accountOwnerProfileId,
    accountOwnerHasProfile,
    isOwnerProfile,
  };
}
