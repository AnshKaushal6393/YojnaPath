const EDUCATION_LEVELS = [
  "none",
  "5th",
  "8th",
  "10th",
  "12th",
  "graduate",
  "postgraduate",
];

function getEducationRank(level) {
  if (!level) {
    return -1;
  }

  return EDUCATION_LEVELS.indexOf(level);
}

function matchScheme(profile, scheme) {
  const e = scheme?.eligibility ?? {};
  const profileOccupation = profile?.occupation ?? null;
  const profileBeneficiaryType = profile?.beneficiaryType ?? null;
  const profileCaste = profile?.caste ?? null;
  const profileGender = profile?.gender ?? null;
  const profileIncome = profile?.income ?? null;
  const profileAge = profile?.age ?? null;
  const profileLandAcres = profile?.landAcres ?? 0;
  const profileDisabilityPct = profile?.disabilityPct ?? 0;
  const profileEducation = profile?.education ?? null;
  const profileIsStudent = profile?.isStudent ?? false;
  const profileHasBankAccount = profile?.hasBankAccount ?? false;
  const profileHasAadhaar = profile?.hasAadhaar ?? false;
  const profileState = profile?.state ?? null;
  const schemeState = scheme?.state ?? null;

  const checks = [
    !e.occupation?.length || e.occupation.includes(profileOccupation),
    !e.beneficiaryType?.length || e.beneficiaryType.includes(profileBeneficiaryType),
    !e.caste?.length || e.caste.includes(profileCaste),
    !e.gender?.length || e.gender.includes(profileGender),
    e.maxAnnualIncome == null || profileIncome <= e.maxAnnualIncome,
    e.minAge == null || profileAge >= e.minAge,
    e.maxAge == null || profileAge <= e.maxAge,
    e.landOwned == null ||
      (
        profileLandAcres >= (e.landOwned.min ?? 0) &&
        profileLandAcres <= (e.landOwned.max ?? Infinity)
      ),
    e.minDisabilityPct == null || profileDisabilityPct >= e.minDisabilityPct,
    e.minEducation == null ||
      getEducationRank(profileEducation) >= getEducationRank(e.minEducation),
    e.mustBeStudent == null || profileIsStudent === e.mustBeStudent,
    e.mustHaveBankAccount == null || profileHasBankAccount === e.mustHaveBankAccount,
    e.mustHaveAadhaar == null || profileHasAadhaar === e.mustHaveAadhaar,
    !schemeState || schemeState === "central" || schemeState === profileState,
  ];

  return checks.every(Boolean);
}

module.exports = {
  EDUCATION_LEVELS,
  matchScheme,
};
