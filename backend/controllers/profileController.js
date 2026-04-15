const {
  ALLOWED_CASTES,
  ALLOWED_GENDERS,
  ALLOWED_OCCUPATIONS,
  deleteProfileByUserId,
  getProfileByUserId,
  listProfilesByUserId,
  upsertProfile,
} = require("../services/profileService");

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeInteger(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : Number.NaN;
}

function normalizeNumber(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null || value === "") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function validatePhotoUrl(photoUrl) {
  const value = String(photoUrl ?? "").trim();
  if (!value) {
    return true;
  }

  if (!value.startsWith("data:image/")) {
    return false;
  }

  return value.length <= 2_000_000;
}

function buildProfilePayload(body) {
  const annualIncomeRaw = body?.annualIncome ?? body?.annual_income;
  const landAcresRaw = body?.landAcres ?? body?.land_acres;
  const disabilityPctRaw = body?.disabilityPct ?? body?.disability_pct;
  const isStudentRaw = body?.isStudent ?? body?.is_student;
  const isMigrantRaw = body?.isMigrant ?? body?.is_migrant;

  return {
    profileName: normalizeOptionalString(body?.profileName ?? body?.profile_name),
    relation: normalizeOptionalString(body?.relation),
    state: normalizeOptionalString(body?.state)?.toUpperCase() ?? null,
    occupation: normalizeOptionalString(body?.occupation),
    annualIncome: normalizeInteger(annualIncomeRaw, 0),
    caste: normalizeOptionalString(body?.caste)?.toLowerCase() ?? null,
    gender: normalizeOptionalString(body?.gender)?.toLowerCase() ?? null,
    age: normalizeInteger(body?.age, null),
    landAcres: normalizeNumber(landAcresRaw, 0),
    disabilityPct: normalizeInteger(disabilityPctRaw, 0),
    isStudent: normalizeBoolean(isStudentRaw, false),
    isMigrant: normalizeBoolean(isMigrantRaw, false),
    district: normalizeOptionalString(body?.district),
    lang: normalizeOptionalString(body?.lang)?.toLowerCase() ?? null,
    photoUrl: normalizeOptionalString(body?.photoUrl ?? body?.photo_url),
  };
}

function hasEligibilityInputs(profile) {
  return Boolean(
    profile.state ||
      profile.occupation ||
      profile.annualIncome > 0 ||
      profile.caste ||
      profile.gender ||
      profile.age != null ||
      profile.landAcres > 0 ||
      profile.disabilityPct > 0 ||
      profile.isStudent ||
      profile.isMigrant ||
      profile.district
  );
}

function validateProfilePayload(profile) {
  const shouldValidateEligibility = hasEligibilityInputs(profile);

  if (shouldValidateEligibility && !profile.state) {
    return "state is required";
  }

  if (
    shouldValidateEligibility &&
    (!profile.occupation || !ALLOWED_OCCUPATIONS.includes(profile.occupation))
  ) {
    return "occupation must be one of the supported user types";
  }

  if (Number.isNaN(profile.annualIncome) || profile.annualIncome < 0) {
    return "annualIncome must be a non-negative integer";
  }

  if (profile.caste && !ALLOWED_CASTES.includes(profile.caste)) {
    return "caste must be one of sc, st, obc, or general";
  }

  if (profile.gender && !ALLOWED_GENDERS.includes(profile.gender)) {
    return "gender must be male, female, or other";
  }

  if (profile.age != null && (Number.isNaN(profile.age) || profile.age < 0)) {
    return "age must be a non-negative integer";
  }

  if (Number.isNaN(profile.landAcres) || profile.landAcres < 0) {
    return "landAcres must be a non-negative number";
  }

  if (
    Number.isNaN(profile.disabilityPct) ||
    profile.disabilityPct < 0 ||
    profile.disabilityPct > 100
  ) {
    return "disabilityPct must be between 0 and 100";
  }

  if (typeof profile.isStudent !== "boolean") {
    return "isStudent must be a boolean";
  }

  if (typeof profile.isMigrant !== "boolean") {
    return "isMigrant must be a boolean";
  }

  if (profile.district && profile.district.length > 80) {
    return "district must be at most 80 characters";
  }

  if (profile.lang && !["hi", "en"].includes(profile.lang)) {
    return "lang must be hi or en";
  }

  if (profile.profileName && profile.profileName.length > 120) {
    return "profileName must be at most 120 characters";
  }

  if (profile.relation && profile.relation.length > 40) {
    return "relation must be at most 40 characters";
  }

  if (!validatePhotoUrl(profile.photoUrl)) {
    return "photoUrl must be a valid image under 2 MB";
  }

  return null;
}

async function listProfiles(req, res) {
  const userId = req.user.id;
  const profiles = await listProfilesByUserId(userId);
  return res.json({ profiles });
}

async function getProfile(req, res) {
  const userId = req.user.id;
  const profileId = normalizeOptionalString(req.query?.profileId);
  const profile = await getProfileByUserId(userId, profileId);

  if (!profile) {
    return res.json({ userId });
  }

  return res.json(profile);
}

async function saveProfile(req, res) {
  const userId = req.user.id;
  const profileId = normalizeOptionalString(req.body?.profileId ?? req.body?.profile_id);
  const profile = buildProfilePayload(req.body);
  const validationError = validateProfilePayload(profile);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const savedProfile = await upsertProfile(userId, profileId, profile);
    return res.json(savedProfile);
  } catch (error) {
    if (error.message === "photoUrl is required for family members") {
      return res.status(400).json({ message: error.message });
    }

    throw error;
  }
}

async function deleteProfile(req, res) {
  const userId = req.user.id;
  const profileId = normalizeOptionalString(req.params?.profileId);

  if (!profileId) {
    return res.status(400).json({ message: "profileId is required" });
  }

  try {
    const profiles = await deleteProfileByUserId(userId, profileId);
    return res.json({ profiles });
  } catch (error) {
    if (
      error.message === "Profile not found" ||
      error.message === "You must keep at least one family profile."
    ) {
      return res.status(400).json({ message: error.message });
    }

    throw error;
  }
}

module.exports = {
  buildProfilePayload,
  deleteProfile,
  getProfile,
  listProfiles,
  saveProfile,
  validateProfilePayload,
};
