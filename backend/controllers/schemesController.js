const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { getMatchingSchemes, matchScheme } = require("../engine/matcher");
const { recordMatchAnalytics } = require("../services/analyticsService");
const {
  attachDeadlineInfo,
  getUrgentSchemeIds,
  getUrgentSchemesFromList,
  isSchemeOpenForApplications,
} = require("../services/deadlineTrackerService");
const { topSchemesCache } = require("../services/topSchemesCache");
const { submitSchemeIssueReport } = require("../services/schemeReportService");
const { explainSchemeInHindi } = require("../services/schemeExplainService");

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

function normalizePositiveInteger(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function normalizeLanguage(value) {
  const normalized = normalizeOptionalString(value)?.toLowerCase() ?? null;
  return normalized ? normalized.slice(0, 5) : null;
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

function normalizeUserTypeValue(value) {
  const normalized = normalizeOptionalString(value)?.toLowerCase() ?? null;
  return normalized ? normalized.replace(/[-\s]+/g, "_") : null;
}

function resolveMatchOccupation(source = {}) {
  return (
    normalizeOptionalString(source.occupation) ||
    normalizeUserTypeValue(source.userType ?? source.user_type)
  );
}

function buildMatchProfile(source = {}) {
  return {
    state: normalizeOptionalString(source.state)?.toUpperCase() ?? null,
    userType: normalizeUserTypeValue(source.userType ?? source.user_type),
    occupation: resolveMatchOccupation(source),
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
    return "occupation or userType is required";
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

function buildVisibleSchemeQuery() {
  return {
    active: true,
  };
}

function hasMatchInputs(profile) {
  return Object.values(profile || {}).some((value) => value !== undefined && value !== null && value !== "");
}

function buildCacheKey(profile) {
  return JSON.stringify(profile);
}

async function matchSchemes(req, res) {
  if (!isMongoReady()) {
    return res.status(503).json({ message: "MongoDB is unavailable" });
  }

  const startedAt = Date.now();
  const profile = getRequestProfile(req);
  const limitMatches = normalizePositiveInteger(
    req.body?.limitMatches ?? req.query?.limitMatches,
    50
  );
  const limitNearMisses = normalizePositiveInteger(
    req.body?.limitNearMisses ?? req.query?.limitNearMisses,
    10
  );
  const nearMissGap = normalizePositiveInteger(
    req.body?.nearMissGap ?? req.query?.nearMissGap,
    1
  );
  const validationError = validateMatchProfile(profile);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const result = await getMatchingSchemes(profile, {
    limitMatches,
    limitNearMisses,
    nearMissGap,
  });
  await recordMatchAnalytics({
    userId: req.user?.id || null,
    sessionType: "web",
    state: profile.state,
    occupation: profile.occupation,
    matchCount: result.count,
    nearMissCount: result.nearMissCount,
    schemeIds: result.schemes.map((scheme) => scheme.schemeId),
    lang: normalizeLanguage(req.body?.lang ?? req.query?.lang),
  });

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
  const scheme = await Scheme.findOne({
    ...buildVisibleSchemeQuery(),
    schemeId,
  }).lean();

  if (!scheme || !isSchemeOpenForApplications(scheme)) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json(attachDeadlineInfo(scheme));
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
  const cachedUrgentIds = await getUrgentSchemeIds(now);
  const cachedSchemes = cachedUrgentIds.length
    ? await Scheme.find({
        schemeId: { $in: cachedUrgentIds },
        active: true,
      }).lean()
    : [];

  const sourceSchemes =
    cachedSchemes.length > 0
      ? cachedSchemes
      : await Scheme.find({
          active: true,
        }).lean();

  const urgentMatches = getUrgentSchemesFromList(sourceSchemes, now)
    .filter((scheme) => matchScheme(profile, scheme))
    .map((scheme) => ({
      ...scheme,
      daysRemaining: scheme.effectiveDeadline?.daysRemaining ?? null,
    }));

  return res.json(urgentMatches);
}

async function getTopSchemes(req, res) {
  if (!isMongoReady()) {
    return res.status(503).json({ message: "MongoDB is unavailable" });
  }

  const rawInput = {
    ...(req.method === "GET" ? req.query : {}),
    ...(req.body || {}),
  };
  const profile = getRequestProfile(req);

  if (!hasMatchInputs(rawInput)) {
    return res.status(400).json({
      message: "Real-time top schemes require current profile inputs",
    });
  }

  const validationError = validateMatchProfile(profile);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const cacheKey = buildCacheKey(profile);
  const cached = await topSchemesCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const result = await getMatchingSchemes(profile, {
    limitMatches: 5,
    limitNearMisses: 0,
  });

  const payload = {
    userType: profile.userType || profile.occupation || null,
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
    buildVisibleSchemeQuery(),
    {
      schemeId: 1,
      name: 1,
      categories: 1,
      state: 1,
    }
  ).lean();

  return res.json(schemes.filter((scheme) => isSchemeOpenForApplications(scheme)).map((scheme) => attachDeadlineInfo(scheme)));
}

async function reportSchemeIssue(req, res) {
  try {
    const result = await submitSchemeIssueReport(req.params?.id, req.body || {}, {
      userId: req.user?.id || null,
      lang: normalizeLanguage(req.body?.lang ?? req.query?.lang),
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
    });

    if (!result) {
      return res.status(404).json({ message: "Scheme not found" });
    }

    return res.status(201).json(result);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ message: error?.message || "Could not report issue" });
  }
}

async function explainScheme(req, res) {
  try {
    const result = await explainSchemeInHindi(req.params?.id);

    if (!result) {
      return res.status(404).json({ message: "Scheme not found" });
    }

    return res.json(result);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ message: error?.message || "Could not explain scheme" });
  }
}

module.exports = {
  buildMatchProfile,
  buildCacheKey,
  getAllSchemesLightweight,
  getRequestProfile,
  hasMatchInputs,
  getSchemeById,
  getTopSchemes,
  getUrgentSchemes,
  matchSchemes,
  explainScheme,
  reportSchemeIssue,
  validateMatchProfile,
};
