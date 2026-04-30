require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");

const ALLOWED_REPORT_TYPES = new Set(["operations", "acquisition", "scheme-quality"]);

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeDateInput(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeDate(value) {
  return value.toISOString().slice(0, 10);
}

function createDateRange(startDateInput, endDateInput) {
  const endDate = normalizeDateInput(endDateInput) || new Date();
  endDate.setUTCHours(0, 0, 0, 0);

  const startDate = normalizeDateInput(startDateInput) || new Date(endDate);
  if (!startDateInput) {
    startDate.setUTCDate(endDate.getUTCDate() - 29);
  }
  startDate.setUTCHours(0, 0, 0, 0);

  if (startDate > endDate) {
    const error = new Error("Start date must be before end date");
    error.status = 400;
    throw error;
  }

  const exclusiveEndDate = new Date(endDate);
  exclusiveEndDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    startDate,
    endDate,
    exclusiveEndDate,
    startLabel: serializeDate(startDate),
    endLabel: serializeDate(endDate),
  };
}

function buildDateLabel(range) {
  return `${range.startLabel} to ${range.endLabel}`;
}

function normalizeSchemeSnapshot(scheme) {
  if (!scheme) {
    return null;
  }

  return {
    schemeId: normalizeOptionalString(scheme.schemeId)?.toUpperCase() || null,
    state: normalizeOptionalString(scheme.state) || null,
    active: scheme.active !== false,
    createdAt: scheme.createdAt ? new Date(scheme.createdAt).toISOString() : null,
    updatedAt: scheme.updatedAt ? new Date(scheme.updatedAt).toISOString() : null,
    name: scheme.name || null,
    description: scheme.description || null,
    applyUrl: normalizeOptionalString(scheme.applyUrl) || null,
    eligibility: scheme.eligibility || {},
    tags: Array.isArray(scheme.tags) ? scheme.tags : [],
  };
}

function isLikelyValidUrl(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
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

function getSnapshotFlags(scheme) {
  if (!scheme) {
    return [];
  }

  const reasons = [];
  const nameHi = normalizeOptionalString(scheme?.name?.hi);
  const descriptionHi = normalizeOptionalString(scheme?.description?.hi);
  const tags = Array.isArray(scheme?.tags) ? scheme.tags.map((tag) => normalizeOptionalString(tag)?.toLowerCase()).filter(Boolean) : [];

  if (!nameHi || !descriptionHi) {
    reasons.push("missing_hindi");
  }

  if (!isLikelyValidUrl(scheme?.applyUrl) || scheme?.applyUrlStatus === "dead") {
    reasons.push("dead_url");
  }

  if (scheme?.applyUrlStatus === "fallback") {
    reasons.push("fallback_url");
  }

  if (isEligibilityEmpty(scheme?.eligibility)) {
    reasons.push("empty_eligibility");
  }

  if (tags.includes("user-reported") || tags.includes("reported")) {
    reasons.push("user_reported");
  }

  return reasons;
}

async function ensureHistoricalSchemeBaselines(currentSchemes = []) {
  if (!currentSchemes.length) {
    return;
  }

  await ensureDatabaseSchema();
  const pool = getPool();
  const schemeIds = currentSchemes
    .map((scheme) => normalizeOptionalString(scheme.schemeId)?.toUpperCase())
    .filter(Boolean);

  if (!schemeIds.length) {
    return;
  }

  const existingLogs = await pool.query(
    `
      SELECT DISTINCT scheme_id
      FROM scheme_edit_log
      WHERE scheme_id = ANY($1::TEXT[])
    `,
    [schemeIds]
  );

  const loggedIds = new Set(existingLogs.rows.map((row) => normalizeOptionalString(row.scheme_id)?.toUpperCase()));
  const missingSchemes = currentSchemes
    .map(normalizeSchemeSnapshot)
    .filter((scheme) => scheme?.schemeId && !loggedIds.has(scheme.schemeId));

  if (!missingSchemes.length) {
    return;
  }

  for (const scheme of missingSchemes) {
    await pool.query(
      `
        INSERT INTO scheme_edit_log (scheme_id, action, old_data, new_data, note, created_at)
        VALUES ($1, 'create', NULL, $2::jsonb, $3, $4)
      `,
      [
        scheme.schemeId,
        JSON.stringify(scheme),
        "backfilled baseline snapshot for historical reporting",
        scheme.createdAt || new Date().toISOString(),
      ]
    );
  }
}

async function getSchemeSnapshotsAt(range) {
  if (!isMongoReady()) {
    return new Map();
  }

  await ensureDatabaseSchema();
  const pool = getPool();
  const [currentSchemes] = await Promise.all([
    Scheme.find({})
      .select({
        schemeId: 1,
        state: 1,
        active: 1,
        name: 1,
        description: 1,
        applyUrl: 1,
        eligibility: 1,
        tags: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean(),
  ]);

  await ensureHistoricalSchemeBaselines(currentSchemes);
  const editLogs = await pool.query(
    `
      SELECT scheme_id, action, old_data, new_data, created_at
      FROM scheme_edit_log
      WHERE created_at < $1
      ORDER BY created_at ASC, id ASC
    `,
    [range.exclusiveEndDate.toISOString()]
  );

  const snapshots = new Map();

  for (const row of editLogs.rows) {
    const schemeId = normalizeOptionalString(row.scheme_id)?.toUpperCase();
    const nextData = normalizeSchemeSnapshot(row.new_data);

    if (!schemeId || !nextData) {
      continue;
    }

    snapshots.set(schemeId, nextData);
  }

  for (const scheme of currentSchemes) {
    const normalized = normalizeSchemeSnapshot(scheme);
    if (!normalized?.schemeId) {
      continue;
    }

    if (snapshots.has(normalized.schemeId)) {
      continue;
    }

    const createdAt = normalized.createdAt ? new Date(normalized.createdAt) : null;
    if (!createdAt || createdAt < range.exclusiveEndDate) {
      snapshots.set(normalized.schemeId, normalized);
    }
  }

  return snapshots;
}

async function buildOperationsReport(range) {
  await ensureDatabaseSchema();
  const pool = getPool();
  const [usersResult, applicationsResult, savedSchemesResult, activityResult] = await Promise.all([
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM users
        WHERE created_at >= $1 AND created_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM applications
        WHERE applied_at >= $1 AND applied_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM saved_schemes
        WHERE saved_at >= $1 AND saved_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT
          id,
          session_type,
          occupation,
          state,
          match_count,
          near_miss_count,
          created_at
        FROM match_logs
        WHERE created_at >= $1 AND created_at < $2
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
  ]);

  return {
    title: "Operations Report",
    highlights: [
      { label: "New users", value: String(usersResult.rows[0]?.count || 0) },
      { label: "Applications", value: String(applicationsResult.rows[0]?.count || 0) },
      { label: "Saved schemes", value: String(savedSchemesResult.rows[0]?.count || 0) },
      { label: "Activity rows", value: String(activityResult.rows.length) },
    ],
    tableHeaders: ["Session", "Occupation", "State", "Matches", "Time"],
    tableRows: activityResult.rows.map((row) => [
      row.session_type || "web",
      row.occupation || "unknown",
      row.state || "NA",
      String(row.match_count || 0),
      new Date(row.created_at).toISOString(),
    ]),
  };
}

async function buildAcquisitionReport(range) {
  await ensureDatabaseSchema();
  const pool = getPool();
  const [usersResult, profilesResult, photoResult, matchLogsResult] = await Promise.all([
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM users
        WHERE created_at >= $1 AND created_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM users
        WHERE onboarding_done = TRUE
          AND registration_completed_at >= $1
          AND registration_completed_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM users
        WHERE photo_type IS NOT NULL
          AND photo_type <> 'none'
          AND created_at >= $1
          AND created_at < $2
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT
          TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
          COUNT(*)::INT AS count
        FROM match_logs
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY created_at::date
        ORDER BY created_at::date ASC
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
  ]);

  const totalUsers = Number(usersResult.rows[0]?.count || 0);
  const completedProfiles = Number(profilesResult.rows[0]?.count || 0);
  const withPhoto = Number(photoResult.rows[0]?.count || 0);

  return {
    title: "User Acquisition Report",
    highlights: [
      { label: "New users", value: String(totalUsers) },
      { label: "Profiles completed", value: String(completedProfiles) },
      { label: "Photo completed", value: String(withPhoto) },
      {
        label: "Profile completion rate",
        value: totalUsers > 0 ? `${Math.round((completedProfiles / totalUsers) * 100)}%` : "0%",
      },
    ],
    tableHeaders: ["Day", "Match runs"],
    tableRows: matchLogsResult.rows.map((row) => [row.day, String(row.count || 0)]),
  };
}

async function buildSchemeQualityReport(range) {
  await ensureDatabaseSchema();
  const pool = getPool();
  const [applicationsResult, matchLogsResult, schemeSnapshots] = await Promise.all([
    pool.query(
      `
        SELECT scheme_id, COUNT(*)::INT AS count
        FROM applications
        WHERE applied_at >= $1 AND applied_at < $2
        GROUP BY scheme_id
        ORDER BY count DESC, scheme_id ASC
        LIMIT 20
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    pool.query(
      `
        SELECT scheme_id, COUNT(*)::INT AS count
        FROM match_logs
        CROSS JOIN LATERAL UNNEST(COALESCE(scheme_ids, ARRAY[]::TEXT[])) AS scheme_id
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY scheme_id
        ORDER BY count DESC, scheme_id ASC
        LIMIT 20
      `,
      [range.startDate.toISOString(), range.exclusiveEndDate.toISOString()]
    ),
    getSchemeSnapshotsAt(range),
  ]);

  const topMatches = matchLogsResult.rows;
  const topApplications = applicationsResult.rows;
  const ids = [...new Set([...topMatches.map((row) => row.scheme_id), ...topApplications.map((row) => row.scheme_id)])];
  const activeSnapshots = [...schemeSnapshots.values()].filter((scheme) => scheme.active !== false);
  const flaggedSnapshots = activeSnapshots.filter((scheme) => getSnapshotFlags(scheme).length > 0);

  return {
    title: "Scheme Quality Report",
    highlights: [
      { label: "Top matched schemes", value: String(topMatches.length) },
      { label: "Top applied schemes", value: String(topApplications.length) },
      { label: "Active schemes", value: String(activeSnapshots.length) },
      { label: "Flagged schemes", value: String(flaggedSnapshots.length) },
    ],
    tableHeaders: ["Scheme", "State", "Matches", "Applications"],
    tableRows: ids.map((schemeId) => {
      const scheme = schemeSnapshots.get(schemeId);
      const matches = topMatches.find((row) => row.scheme_id === schemeId)?.count || 0;
      const applications = topApplications.find((row) => row.scheme_id === schemeId)?.count || 0;
      return [schemeId, scheme?.state || "NA", String(matches), String(applications)];
    }),
  };
}

const REPORT_BUILDERS = {
  operations: buildOperationsReport,
  acquisition: buildAcquisitionReport,
  "scheme-quality": buildSchemeQualityReport,
};

async function getAdminReport({ reportType, startDate, endDate }) {
  const normalizedType = normalizeOptionalString(reportType);
  if (!ALLOWED_REPORT_TYPES.has(normalizedType)) {
    const error = new Error("Invalid report type");
    error.status = 400;
    throw error;
  }

  const range = createDateRange(startDate, endDate);
  const payload = await REPORT_BUILDERS[normalizedType](range);

  return {
    type: normalizedType,
    title: payload.title,
    dateLabel: buildDateLabel(range),
    startDate: range.startLabel,
    endDate: range.endLabel,
    generatedAt: new Date().toISOString(),
    highlights: payload.highlights,
    tableHeaders: payload.tableHeaders,
    tableRows: payload.tableRows,
  };
}

module.exports = {
  getAdminReport,
};
