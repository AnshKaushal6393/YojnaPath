require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { Scheme } = require("../models/Scheme");

const APPLICATION_STATUSES = ["applied", "pending", "approved", "rejected"];
let applicationsSchemaReadyPromise;

async function ensureApplicationsSchema() {
  if (!applicationsSchemaReadyPromise) {
    applicationsSchemaReadyPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query("ALTER TABLE applications ALTER COLUMN scheme_id TYPE VARCHAR(180)");
    })().catch((error) => {
      applicationsSchemaReadyPromise = null;
      throw error;
    });
  }

  return applicationsSchemaReadyPromise;
}

function formatApplicationRow(row, scheme) {
  return {
    schemeId: row.scheme_id,
    appliedAt: row.applied_at,
    status: row.status,
    notes: row.notes,
    remindAt: row.remind_at,
    scheme: scheme
      ? {
          schemeId: scheme.schemeId,
          name: scheme.name,
          benefitAmount: scheme.benefitAmount,
          benefitType: scheme.benefitType,
          active: scheme.active,
        }
      : null,
  };
}

async function getApplicationsForUser(userId) {
  await ensureApplicationsSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT scheme_id, applied_at, status, notes, remind_at
      FROM applications
      WHERE user_id = $1
      ORDER BY applied_at DESC
    `,
    [userId]
  );

  const rows = result.rows;
  const schemeIds = rows.map((row) => row.scheme_id);

  if (schemeIds.length === 0) {
    return [];
  }

  const schemes = await Scheme.find({ schemeId: { $in: schemeIds } }).lean();
  const schemeById = new Map(schemes.map((scheme) => [scheme.schemeId, scheme]));

  return rows.map((row) => formatApplicationRow(row, schemeById.get(row.scheme_id) ?? null));
}

async function upsertApplicationForUser(userId, application) {
  await ensureApplicationsSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO applications (
        user_id,
        scheme_id,
        applied_at,
        status,
        notes,
        remind_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, scheme_id) DO UPDATE SET
        applied_at = EXCLUDED.applied_at,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        remind_at = EXCLUDED.remind_at
      RETURNING scheme_id, applied_at, status, notes, remind_at
    `,
    [
      userId,
      application.schemeId,
      application.appliedAt,
      application.status,
      application.notes,
      application.remindAt,
    ]
  );

  const scheme = await Scheme.findOne({ schemeId: application.schemeId }).lean();
  return formatApplicationRow(result.rows[0], scheme);
}

async function updateApplicationForUser(userId, schemeId, updates) {
  const pool = getPool();
  const fields = [];
  const values = [];
  let index = 1;

  if (updates.status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(updates.status);
  }

  if (updates.notes !== undefined) {
    fields.push(`notes = $${index++}`);
    values.push(updates.notes);
  }

  if (updates.remindAt !== undefined) {
    fields.push(`remind_at = $${index++}`);
    values.push(updates.remindAt);
  }

  if (fields.length === 0) {
    return null;
  }

  await ensureApplicationsSchema();
  values.push(userId, schemeId);
  const result = await pool.query(
    `
      UPDATE applications
      SET ${fields.join(", ")}
      WHERE user_id = $${index++} AND scheme_id = $${index}
      RETURNING scheme_id, applied_at, status, notes, remind_at
    `,
    values
  );

  if (result.rowCount === 0) {
    return null;
  }

  const scheme = await Scheme.findOne({ schemeId }).lean();
  return formatApplicationRow(result.rows[0], scheme);
}

module.exports = {
  APPLICATION_STATUSES,
  getApplicationsForUser,
  upsertApplicationForUser,
  updateApplicationForUser,
};
