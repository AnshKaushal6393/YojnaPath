const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { getMatchingSchemes, matchScheme } = require("../engine/matcher");
const { recordMatchAnalytics } = require("../services/analyticsService");
const { topSchemesCache } = require("../services/topSchemesCache");

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

  if (String(value).toLowerCase() === "true") {
    return true;
  }

  if (String(value).toLowerCase() === "false") {
    return false;
  }

  return null;
}

function buildMatchProfile(source = {}) {
  return {
    state: normalizeOptionalString(source.state)?.toUpperCase() ?? null,
    occupation: normalizeOptionalString(source.occupation),
    annual_income: normalizeInteger(source.annualIncome ?? source.annual_income ?? source.income, null),
    caste: normalizeOptionalString(source.caste)?.toLowerCase() ?? null,
    gender: normalizeOptionalString(source.gender)?.toLowerCase() ?? null,
    age: normalizeInteger(source.age, null),
    landAcres: normalizeNumber(source.landAcres ?? source.land_acres, 0),
    disabilityPct: normalizeInteger(source.disabilityPct ?? source.disability_pct, 0),
    isStudent: normalizeBoolean(source.isStudent ?? source.is_student, false),
  };
}

function validateMatchProfile(profile) {
  if (!profile.state) {
    return "state is required";
  }

  if (!profile.occupation) {
    return "occupation is required";
  }

  if (profile.annual_income != null && (Number.isNaN(profile.annual_income) || profile.annual_income < 0)) {
    return "income must be a non-negative integer";
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

  return null;
}

function getRequestProfile(req) {
  const queryProfile = req.method === "GET" ? req.query : {};
  return buildMatchProfile({
    ...queryProfile,
    ...(req.body || {}),
  });
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getDaysRemaining(closesAt, now = new Date()) {
  const diff = closesAt.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function normalizeUserType(userType) {
  return String(userType || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function hasMatchInputs(profile) {
  return Object.values(profile || {}).some((value) => value !== undefined && value !== null && value !== "");
}

function buildCacheKey(userType, profile) {
  return `${userType}:${JSON.stringify(profile)}`;
}

async function matchSchemes(req, res) {
  if (!isMongoReady()) {
    return res.status(503).json({ message: "MongoDB is unavailable" });
  }

  const startedAt = Date.now();
  const profile = getRequestProfile(req);
  const validationError = validateMatchProfile(profile);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const result = await getMatchingSchemes(profile);
  await recordMatchAnalytics();

  return res.json({
    ...result,
    processingTimeMs: Date.now() - startedAt,
  });
}

async function getSchemeById(req, res) {
  if (!isMongoReady()) {
    return res.status(503).json({ message: "MongoDB is unavailable" });
  }

  const schemeId = String(req.params.id || "").trim().toUpperCase();
  const scheme = await Scheme.findOne({ schemeId }).lean();

  if (!scheme) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json(scheme);
}

async function getUrgentSchemes(req, res) {
  if (!isMongoReady()) {
    return res.json([]);
  }

  const profile = getRequestProfile(req);
  const validationError = validateMatchProfile(profile);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const now = new Date();
  const deadlineThreshold = addDays(now, 7);
  const schemes = await Scheme.find({
    active: true,
    "deadline.closes": {
      $gte: now,
      $lte: deadlineThreshold,
    },
  }).lean();

  const urgentMatches = schemes
    .filter((scheme) => matchScheme(profile, scheme))
    .map((scheme) => ({
      ...scheme,
      daysRemaining: getDaysRemaining(new Date(scheme.deadline.closes), now),
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return res.json(urgentMatches);
}

async function getTopSchemesByUserType(req, res) {
  if (!isMongoReady()) {
    return res.status(503).json({ message: "MongoDB is unavailable" });
  }

  const userType = normalizeUserType(req.params.userType);
  const rawInput = {
    ...(req.method === "GET" ? req.query : {}),
    ...(req.body || {}),
  };
  const profile = getRequestProfile(req);

  if (!userType) {
    return res.status(400).json({ message: "Unsupported userType" });
  }

  if (!hasMatchInputs(rawInput)) {
    return res.status(400).json({
      message: "Real-time top schemes require current profile inputs",
    });
  }

  const validationError = validateMatchProfile(profile);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const cacheKey = buildCacheKey(userType, profile);
  const cached = await topSchemesCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const result = await getMatchingSchemes(profile, {
    limitMatches: 5,
    limitNearMisses: 0,
  });

  const payload = {
    userType,
    count: result.schemes.length,
    schemes: result.schemes,
  };

  await topSchemesCache.set(cacheKey, payload);
  return res.json(payload);
}

async function getAllSchemesLightweight(req, res) {
  if (!isMongoReady()) {
    return res.json([]);
  }

  const schemes = await Scheme.find(
    { active: true },
    {
      schemeId: 1,
      name: 1,
      categories: 1,
      state: 1,
    }
  ).lean();

  return res.json(schemes);
}

module.exports = {
  buildMatchProfile,
  buildCacheKey,
  getAllSchemesLightweight,
  getRequestProfile,
  hasMatchInputs,
  getSchemeById,
  getTopSchemesByUserType,
  getUrgentSchemes,
  matchSchemes,
  normalizeUserType,
  validateMatchProfile,
};
