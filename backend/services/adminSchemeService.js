require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { attachDeadlineInfo } = require("./deadlineTrackerService");

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeBoolean(value, fallback = null) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function normalizeNumber(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeInteger(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : fallback;
}

function compareValues(left, right, direction = "asc") {
  const leftValue = left ?? "";
  const rightValue = right ?? "";

  if (leftValue < rightValue) {
    return direction === "asc" ? -1 : 1;
  }

  if (leftValue > rightValue) {
    return direction === "asc" ? 1 : -1;
  }

  return 0;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeOptionalString(entry)).filter(Boolean);
  }

  const normalized = normalizeOptionalString(value);
  return normalized ? [normalized] : [];
}

function normalizeLocalizedText(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "string") {
    return {
      en: value.trim(),
      hi: value.trim(),
    };
  }

  if (typeof value !== "object") {
    return fallback;
  }

  const en = normalizeOptionalString(value.en || value.english || value.enText);
  const hi = normalizeOptionalString(value.hi || value.hindi || value.hiText);

  if (!en && !hi) {
    return fallback;
  }

  return {
    en: en || fallback?.en || "",
    hi: hi || fallback?.hi || "",
  };
}

function toPlainScheme(scheme) {
  if (!scheme) {
    return null;
  }

  const plain = typeof scheme.toObject === "function" ? scheme.toObject({ versionKey: false }) : scheme;

  return attachDeadlineInfo(plain);
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function isLikelyValidUrl(value) {
  const url = normalizeOptionalString(value);
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isEligibilityEmpty(eligibility = {}) {
  const fields = eligibility || {};
  const arrayFields = ["occupation", "beneficiaryType", "caste", "gender"];
  const scalarFields = [
    "maxAnnualIncome",
    "minAge",
    "maxAge",
    "minDisabilityPct",
    "minEducation",
    "mustBeStudent",
    "mustHaveBankAccount",
    "mustHaveAadhaar",
  ];

  const hasArrayValue = arrayFields.some((field) => Array.isArray(fields[field]) && fields[field].length > 0);
  const hasScalarValue = scalarFields.some((field) => fields[field] != null);
  const hasLandOwned = Boolean(fields.landOwned && (fields.landOwned.min != null || fields.landOwned.max != null));

  return !hasArrayValue && !hasScalarValue && !hasLandOwned;
}

function getReviewReasons(scheme) {
  const reasons = [];
  const nameHi = normalizeOptionalString(scheme?.name?.hi);
  const descriptionHi = normalizeOptionalString(scheme?.description?.hi);

  if (!nameHi || !descriptionHi) {
    reasons.push("missing_hindi");
  }

  if (!isLikelyValidUrl(scheme?.applyUrl) || scheme?.applyUrlStatus === "dead") {
    reasons.push("dead_url");
  }

  if (scheme?.applyUrlStatus === "fallback") {
    reasons.push("fallback_url");
  }

  const tags = Array.isArray(scheme?.tags) ? scheme.tags.map((tag) => normalizeOptionalString(tag)?.toLowerCase()).filter(Boolean) : [];
  if (tags.includes("user-reported") || tags.includes("reported")) {
    reasons.push("user_reported");
  }

  return reasons;
}

function getEnrichmentReasons(scheme) {
  const reasons = [];

  if (isEligibilityEmpty(scheme?.eligibility)) {
    reasons.push("empty_eligibility");
  }

  return reasons;
}

const RESOLVED_REVIEW_STATUSES = new Set(["fixed", "moved", "inactive"]);

function collectSchemePayload(body = {}, existing = null) {
  const source = existing?.toObject ? existing.toObject({ versionKey: false }) : (existing || {});
  const payload = {
    schemeId: normalizeOptionalString(body.schemeId || source.schemeId)?.toUpperCase(),
    name: source.name || null,
    description: source.description || null,
    ministry: normalizeOptionalString(body.ministry) ?? source.ministry,
    categories: source.categories || [],
    state: normalizeOptionalString(body.state)?.toUpperCase() ?? source.state,
    eligibility: source.eligibility || {},
    benefitAmount: source.benefitAmount ?? null,
    benefitType: normalizeOptionalString(body.benefitType) ?? source.benefitType,
    documents: source.documents || [],
    applyUrl: normalizeOptionalString(body.applyUrl) ?? source.applyUrl,
    applyMode: normalizeOptionalString(body.applyMode) ?? source.applyMode,
    officeAddress: source.officeAddress || null,
    deadline: source.deadline || {},
    tags: source.tags || [],
    active: typeof source.active === "boolean" ? source.active : true,
    verified: typeof source.verified === "boolean" ? source.verified : false,
    source: normalizeOptionalString(body.source) ?? source.source,
  };

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    payload.name = normalizeLocalizedText(body.name, source.name);
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    payload.description = normalizeLocalizedText(body.description, source.description);
  }

  if (Object.prototype.hasOwnProperty.call(body, "categories")) {
    payload.categories = normalizeStringArray(body.categories);
  }

  if (Object.prototype.hasOwnProperty.call(body, "documents")) {
    payload.documents = Array.isArray(body.documents)
      ? body.documents
          .map((doc) => normalizeLocalizedText(doc))
          .filter(Boolean)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(body, "officeAddress")) {
    payload.officeAddress = normalizeLocalizedText(body.officeAddress, source.officeAddress);
  }

  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    payload.tags = normalizeStringArray(body.tags);
  }

  if (Object.prototype.hasOwnProperty.call(body, "eligibility")) {
    const eligibility = body.eligibility && typeof body.eligibility === "object" ? body.eligibility : {};
    payload.eligibility = {
      occupation: normalizeStringArray(eligibility.occupation),
      beneficiaryType: normalizeStringArray(eligibility.beneficiaryType),
      caste: normalizeStringArray(eligibility.caste),
      gender: normalizeStringArray(eligibility.gender),
      maxAnnualIncome: Object.prototype.hasOwnProperty.call(eligibility, "maxAnnualIncome")
        ? normalizeInteger(eligibility.maxAnnualIncome, null)
        : source.eligibility?.maxAnnualIncome ?? null,
      minAge: Object.prototype.hasOwnProperty.call(eligibility, "minAge")
        ? normalizeInteger(eligibility.minAge, null)
        : source.eligibility?.minAge ?? null,
      maxAge: Object.prototype.hasOwnProperty.call(eligibility, "maxAge")
        ? normalizeInteger(eligibility.maxAge, null)
        : source.eligibility?.maxAge ?? null,
      landOwned: Object.prototype.hasOwnProperty.call(eligibility, "landOwned")
        ? eligibility.landOwned && typeof eligibility.landOwned === "object"
          ? {
              min: normalizeNumber(eligibility.landOwned.min, 0),
              max: normalizeNumber(eligibility.landOwned.max, 0),
            }
          : null
        : source.eligibility?.landOwned ?? null,
      minDisabilityPct: Object.prototype.hasOwnProperty.call(eligibility, "minDisabilityPct")
        ? normalizeInteger(eligibility.minDisabilityPct, null)
        : source.eligibility?.minDisabilityPct ?? null,
      minEducation: normalizeOptionalString(eligibility.minEducation) ?? source.eligibility?.minEducation ?? null,
      mustBeStudent: Object.prototype.hasOwnProperty.call(eligibility, "mustBeStudent")
        ? normalizeBoolean(eligibility.mustBeStudent, null)
        : source.eligibility?.mustBeStudent ?? null,
      mustHaveBankAccount: Object.prototype.hasOwnProperty.call(eligibility, "mustHaveBankAccount")
        ? normalizeBoolean(eligibility.mustHaveBankAccount, null)
        : source.eligibility?.mustHaveBankAccount ?? null,
      mustHaveAadhaar: Object.prototype.hasOwnProperty.call(eligibility, "mustHaveAadhaar")
        ? normalizeBoolean(eligibility.mustHaveAadhaar, null)
        : source.eligibility?.mustHaveAadhaar ?? null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(body, "deadline")) {
    const deadline = body.deadline && typeof body.deadline === "object" ? body.deadline : {};
    payload.deadline = {
      opens: Object.prototype.hasOwnProperty.call(deadline, "opens")
        ? normalizeOptionalString(deadline.opens)
        : source.deadline?.opens ?? null,
      closes: Object.prototype.hasOwnProperty.call(deadline, "closes")
        ? normalizeOptionalString(deadline.closes)
        : source.deadline?.closes ?? null,
      recurring: Object.prototype.hasOwnProperty.call(deadline, "recurring")
        ? normalizeBoolean(deadline.recurring, false)
        : Boolean(source.deadline?.recurring),
      recurringMonth: Object.prototype.hasOwnProperty.call(deadline, "recurringMonth")
        ? normalizeInteger(deadline.recurringMonth, null)
        : source.deadline?.recurringMonth ?? null,
      recurringDay: Object.prototype.hasOwnProperty.call(deadline, "recurringDay")
        ? normalizeInteger(deadline.recurringDay, null)
        : source.deadline?.recurringDay ?? null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(body, "benefitAmount")) {
    payload.benefitAmount = normalizeNumber(body.benefitAmount, null);
  }

  if (Object.prototype.hasOwnProperty.call(body, "active")) {
    payload.active = normalizeBoolean(body.active, true);
  }

  if (Object.prototype.hasOwnProperty.call(body, "verified")) {
    payload.verified = normalizeBoolean(body.verified, false);
  }

  return payload;
}

async function getMatchCountsBySchemeIds(schemeIds = []) {
  if (schemeIds.length === 0) {
    return new Map();
  }

  await ensureDatabaseSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT scheme_id, COUNT(*)::INT AS count
      FROM match_logs
      CROSS JOIN LATERAL UNNEST(COALESCE(scheme_ids, ARRAY[]::TEXT[])) AS scheme_id
      WHERE scheme_id = ANY($1::TEXT[])
      GROUP BY scheme_id
    `,
    [schemeIds]
  );

  return new Map(result.rows.map((row) => [row.scheme_id, Number(row.count || 0)]));
}

async function appendSchemeEditLog({ schemeId, action, oldData = null, newData = null, note = null }) {
  await ensureDatabaseSchema();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO scheme_edit_log (scheme_id, action, old_data, new_data, note)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
    `,
    [
      schemeId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      note,
    ]
  );
}

async function ensureSchemeReviewSchema() {
  await ensureDatabaseSchema();
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheme_review_actions (
      scheme_id VARCHAR(50) PRIMARY KEY,
      status VARCHAR(20) NOT NULL,
      note TEXT,
      reviewed_by VARCHAR(120),
      reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getSchemeReviewMap(schemeIds = []) {
  if (schemeIds.length === 0) {
    return new Map();
  }

  await ensureSchemeReviewSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT scheme_id, status, note, reviewed_by, reviewed_at
      FROM scheme_review_actions
      WHERE scheme_id = ANY($1::TEXT[])
    `,
    [schemeIds]
  );

  return new Map(
    result.rows.map((row) => [
      row.scheme_id,
      {
        status: row.status,
        note: row.note || null,
        reviewedBy: row.reviewed_by || null,
        reviewedAt: row.reviewed_at,
      },
    ])
  );
}

async function recordSchemeReviewAction(schemeId, body = {}, reviewer = null) {
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  const status = normalizeOptionalString(body.status)?.toLowerCase();
  const note = normalizeOptionalString(body.note);

  if (!normalizedId || !status) {
    return null;
  }

  await ensureSchemeReviewSchema();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO scheme_review_actions (scheme_id, status, note, reviewed_by, reviewed_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (scheme_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        note = EXCLUDED.note,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = NOW()
    `,
    [normalizedId, status, note, reviewer ? String(reviewer).slice(0, 120) : null]
  );

  return {
    schemeId: normalizedId,
    status,
    note,
    reviewedBy: reviewer ? String(reviewer).slice(0, 120) : null,
  };
}

function resolveReviewReasons(scheme, reviewAction = null) {
  const reasons = getReviewReasons(scheme);
  if (reviewAction && RESOLVED_REVIEW_STATUSES.has(String(reviewAction.status || "").toLowerCase())) {
    return reasons.filter((reason) => reason !== "dead_url");
  }

  return reasons;
}

async function setAdminSchemeReviewAction(schemeId, body = {}, actor = null) {
  if (!isMongoReady()) {
    return null;
  }

  await ensureDatabaseSchema();
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return null;
  }

  const existing = await Scheme.findOne({ schemeId: normalizedId }).lean();
  if (!existing) {
    return null;
  }

  let baseScheme = existing;
  const replacementUrl = normalizeOptionalString(body.applyUrl);
  if (replacementUrl && isLikelyValidUrl(replacementUrl) && replacementUrl !== existing.applyUrl) {
    const updated = await updateAdminScheme(normalizedId, { applyUrl: replacementUrl }, actor);
    if (updated) {
      baseScheme = updated;
    }
  }

  const reviewAction = await recordSchemeReviewAction(normalizedId, body, actor);
  const matchCounts = await getMatchCountsBySchemeIds([normalizedId]);

  return {
    ...attachDeadlineInfo(baseScheme),
    matchCount: matchCounts.get(normalizedId) || 0,
    reviewAction,
    reviewReasons: resolveReviewReasons(baseScheme, reviewAction),
    enrichmentReasons: getEnrichmentReasons(baseScheme),
  };
}

async function listAdminSchemes(options = {}) {
  if (!isMongoReady()) {
    return { page: 1, limit: 0, total: 0, totalPages: 0, schemes: [] };
  }

  await ensureDatabaseSchema();

  const page = Math.max(Number(options.page || 1), 1);
  const maxLimit = Math.max(Number(options.maxLimit || 100), 1);
  const limit = Math.min(Math.max(Number(options.limit || 25), 1), maxLimit);
  const sortBy = normalizeOptionalString(options.sortBy) || "updatedAt";
  const sortDir = normalizeOptionalString(options.sortDir)?.toLowerCase() === "asc" ? "asc" : "desc";
  const query = {};

  if (options.active != null && options.active !== "") {
    const active = normalizeBoolean(options.active, null);
    if (active != null) {
      query.active = active;
    }
  }

  if (options.state) {
    query.state = normalizeOptionalString(options.state)?.toUpperCase();
  }

  if (options.category) {
    query.categories = normalizeOptionalString(options.category);
  }

  if (options.search) {
    const search = normalizeOptionalString(options.search);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { schemeId: new RegExp(escaped, "i") },
      { "name.en": new RegExp(escaped, "i") },
      { "name.hi": new RegExp(escaped, "i") },
      { ministry: new RegExp(escaped, "i") },
      { tags: new RegExp(escaped, "i") },
    ];
  }

  const schemes = await Scheme.find(query).sort({ updatedAt: -1, schemeId: 1 }).lean();
  const total = schemes.length;
  const matchCounts = await getMatchCountsBySchemeIds(schemes.map((scheme) => scheme.schemeId));
  const reviewActionMap = await getSchemeReviewMap(schemes.map((scheme) => scheme.schemeId));
  const normalizedSchemes = schemes.map((scheme) => ({
    ...attachDeadlineInfo(scheme),
    matchCount: matchCounts.get(scheme.schemeId) || 0,
    reviewAction: reviewActionMap.get(scheme.schemeId) || null,
    reviewReasons: resolveReviewReasons(scheme, reviewActionMap.get(scheme.schemeId) || null),
    enrichmentReasons: getEnrichmentReasons(scheme),
  }));

  normalizedSchemes.sort((left, right) => {
    if (sortBy === "matchCount") {
      const diff = Number(left.matchCount || 0) - Number(right.matchCount || 0);
      if (diff !== 0) {
        return sortDir === "asc" ? diff : -diff;
      }
    }

    if (sortBy === "name") {
      const nameDiff = compareValues(left.name?.en || "", right.name?.en || "", sortDir);
      if (nameDiff !== 0) {
        return nameDiff;
      }
    }

    return compareValues(left.updatedAt || "", right.updatedAt || "", sortDir);
  });

  const offset = (page - 1) * limit;
  const pagedSchemes = normalizedSchemes.slice(offset, offset + limit);

  return {
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    sortBy,
    sortDir,
    schemes: pagedSchemes,
  };
}

async function getAdminSchemeById(schemeId) {
  if (!isMongoReady()) {
    return null;
  }

  await ensureDatabaseSchema();
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return null;
  }

  const scheme = await Scheme.findOne({ schemeId: normalizedId }).lean();
  if (!scheme) {
    return null;
  }

  const [matchCounts] = await Promise.all([getMatchCountsBySchemeIds([scheme.schemeId])]);
  const reviewActionMap = await getSchemeReviewMap([scheme.schemeId]);
  const reviewAction = reviewActionMap.get(scheme.schemeId) || null;

  return {
    ...attachDeadlineInfo(scheme),
    matchCount: matchCounts.get(scheme.schemeId) || 0,
    reviewAction,
    reviewReasons: resolveReviewReasons(scheme, reviewAction),
    enrichmentReasons: getEnrichmentReasons(scheme),
  };
}

async function createAdminScheme(body = {}, actor = null) {
  if (!isMongoReady()) {
    return null;
  }

  await ensureDatabaseSchema();
  const payload = collectSchemePayload(body);
  const created = await Scheme.create(payload);
  const plain = created.toObject({ versionKey: false });
  await appendSchemeEditLog({
    schemeId: plain.schemeId,
    action: "create",
    newData: plain,
    note: normalizeOptionalString(body.auditNote) || (actor ? `created by ${actor}` : null),
  });

  return {
    ...attachDeadlineInfo(plain),
    matchCount: 0,
    reviewReasons: getReviewReasons(plain),
    enrichmentReasons: getEnrichmentReasons(plain),
  };
}

async function updateAdminScheme(schemeId, body = {}, actor = null) {
  if (!isMongoReady()) {
    return null;
  }

  await ensureDatabaseSchema();
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return null;
  }

  const existing = await Scheme.findOne({ schemeId: normalizedId });
  if (!existing) {
    return null;
  }

  const previous = existing.toObject({ versionKey: false });
  const payload = collectSchemePayload(body, existing);
  Object.assign(existing, payload);
  await existing.save();

  const updated = existing.toObject({ versionKey: false });
  await appendSchemeEditLog({
    schemeId: updated.schemeId,
    action: "update",
    oldData: previous,
    newData: updated,
    note: normalizeOptionalString(body.auditNote) || (actor ? `updated by ${actor}` : null),
  });

  return {
    ...attachDeadlineInfo(updated),
    matchCount: (await getMatchCountsBySchemeIds([updated.schemeId])).get(updated.schemeId) || 0,
    reviewReasons: getReviewReasons(updated),
    enrichmentReasons: getEnrichmentReasons(updated),
  };
}

async function deleteAdminScheme(schemeId, actor = null) {
  if (!isMongoReady()) {
    return null;
  }

  await ensureDatabaseSchema();
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return null;
  }

  const existing = await Scheme.findOne({ schemeId: normalizedId });
  if (!existing) {
    return null;
  }

  const previous = existing.toObject({ versionKey: false });
  existing.active = false;
  await existing.save();
  const updated = existing.toObject({ versionKey: false });

  await appendSchemeEditLog({
    schemeId: updated.schemeId,
    action: "delete",
    oldData: previous,
    newData: updated,
    note: actor ? `soft deleted by ${actor}` : null,
  });

  return {
    ...attachDeadlineInfo(updated),
    matchCount: (await getMatchCountsBySchemeIds([updated.schemeId])).get(updated.schemeId) || 0,
    reviewReasons: getReviewReasons(updated),
    enrichmentReasons: getEnrichmentReasons(updated),
  };
}

async function getAdminSchemeHistory(schemeId, limit = 3) {
  await ensureDatabaseSchema();
  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return [];
  }

  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, action, note, created_at
      FROM scheme_edit_log
      WHERE scheme_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [normalizedId, Math.max(Number(limit || 3), 1)]
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    note: row.note || null,
    createdAt: row.created_at,
  }));
}

async function setAdminSchemesActive(schemeIds = [], active, actor = null) {
  if (!isMongoReady()) {
    return [];
  }

  await ensureDatabaseSchema();
  const normalizedIds = [...new Set((schemeIds || []).map((id) => normalizeOptionalString(id)?.toUpperCase()).filter(Boolean))];

  if (!normalizedIds.length || typeof active !== "boolean") {
    return [];
  }

  const schemes = await Scheme.find({ schemeId: { $in: normalizedIds } });
  const updatedSchemes = [];

  for (const scheme of schemes) {
    const previous = scheme.toObject({ versionKey: false });
    scheme.active = active;
    await scheme.save();
    const updated = scheme.toObject({ versionKey: false });
    await appendSchemeEditLog({
      schemeId: updated.schemeId,
      action: active ? "activate" : "deactivate",
      oldData: previous,
      newData: updated,
      note: actor ? `${active ? "activated" : "deactivated"} by ${actor}` : null,
    });
    updatedSchemes.push({
      ...attachDeadlineInfo(updated),
      matchCount: 0,
      reviewReasons: getReviewReasons(updated),
      enrichmentReasons: getEnrichmentReasons(updated),
    });
  }

  return updatedSchemes;
}

async function getAdminSchemeFlags() {
  if (!isMongoReady()) {
    return { schemes: [], enrichmentSchemes: [] };
  }

  await ensureDatabaseSchema();
  const schemes = await Scheme.find({ active: true }).sort({ updatedAt: -1, schemeId: 1 }).lean();
  const reviewActionMap = await getSchemeReviewMap(schemes.map((scheme) => scheme.schemeId));

  const normalizedSchemes = schemes.map((scheme) => ({
    ...attachDeadlineInfo(scheme),
    reviewAction: reviewActionMap.get(scheme.schemeId) || null,
    reviewReasons: resolveReviewReasons(scheme, reviewActionMap.get(scheme.schemeId) || null),
    enrichmentReasons: getEnrichmentReasons(scheme),
  }));

  return {
    schemes: normalizedSchemes.filter((scheme) => scheme.reviewReasons.length > 0),
    enrichmentSchemes: normalizedSchemes.filter((scheme) => scheme.enrichmentReasons.length > 0),
  };
}

async function exportAdminSchemesCsv() {
  if (!isMongoReady()) {
    return "schemeId,nameEn,nameHi,state,categories,active,verified,matchCount,updatedAt\n";
  }

  await ensureDatabaseSchema();
  const schemes = await Scheme.find({ active: true }).sort({ schemeId: 1 }).lean();
  const matchCounts = await getMatchCountsBySchemeIds(schemes.map((scheme) => scheme.schemeId));

  const rows = [
    [
      "schemeId",
      "nameEn",
      "nameHi",
      "state",
      "categories",
      "active",
      "verified",
      "matchCount",
      "updatedAt",
    ],
    ...schemes.map((scheme) => [
      scheme.schemeId,
      scheme.name?.en || "",
      scheme.name?.hi || "",
      scheme.state || "",
      Array.isArray(scheme.categories) ? scheme.categories.join("|") : "",
      String(Boolean(scheme.active)),
      String(Boolean(scheme.verified)),
      String(matchCounts.get(scheme.schemeId) || 0),
      scheme.updatedAt || "",
    ]),
  ];

  return rows
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

module.exports = {
  appendSchemeEditLog,
  collectSchemePayload,
  createAdminScheme,
  deleteAdminScheme,
  exportAdminSchemesCsv,
  getAdminSchemeById,
  getAdminSchemeHistory,
  getAdminSchemeFlags,
  getEnrichmentReasons,
  listAdminSchemes,
  setAdminSchemesActive,
  setAdminSchemeReviewAction,
  updateAdminScheme,
};
