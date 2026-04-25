const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");

const ALLOWED_REASONS = new Set([
  "wrong_url",
  "scheme_closed",
  "wrong_eligibility",
  "other",
]);

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

async function ensureSchemeIssueReportSchema() {
  await ensureDatabaseSchema();
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheme_issue_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scheme_id VARCHAR(50) NOT NULL,
      reason VARCHAR(40) NOT NULL,
      note TEXT,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      lang VARCHAR(5),
      user_agent TEXT,
      ip_address VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function submitSchemeIssueReport(schemeId, body = {}, context = {}) {
  if (!isMongoReady()) {
    return null;
  }

  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  const reason = normalizeOptionalString(body.reason)?.toLowerCase();
  const note = normalizeOptionalString(body.note);
  const lang = normalizeOptionalString(body.lang)?.toLowerCase() ?? null;

  if (!normalizedId) {
    const error = new Error("Scheme id is required");
    error.status = 400;
    throw error;
  }

  if (!ALLOWED_REASONS.has(reason)) {
    const error = new Error("A valid report reason is required");
    error.status = 400;
    throw error;
  }

  if (reason === "other" && !note) {
    const error = new Error("Please add a short note");
    error.status = 400;
    throw error;
  }

  const scheme = await Scheme.findOne({ schemeId: normalizedId, active: true });
  if (!scheme) {
    return null;
  }

  const existingTags = Array.isArray(scheme.tags) ? scheme.tags : [];
  if (!existingTags.includes("user-reported")) {
    scheme.tags = [...existingTags, "user-reported"];
    await scheme.save();
  }

  await ensureSchemeIssueReportSchema();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO scheme_issue_reports (
        scheme_id,
        reason,
        note,
        user_id,
        lang,
        user_agent,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      normalizedId,
      reason,
      note,
      context.userId || null,
      lang,
      normalizeOptionalString(context.userAgent),
      normalizeOptionalString(context.ipAddress),
    ]
  );

  return {
    message: "Issue reported successfully",
    schemeId: normalizedId,
    reason,
  };
}

module.exports = {
  submitSchemeIssueReport,
};
