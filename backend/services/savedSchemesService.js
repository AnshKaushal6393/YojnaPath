require("../config/env");

const { getPool } = require("../config/postgres");
const { Scheme } = require("../models/Scheme");

async function listSavedSchemeRows(userId) {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT scheme_id, saved_at, notes
      FROM saved_schemes
      WHERE user_id = $1
      ORDER BY saved_at DESC
    `,
    [userId]
  );

  return result.rows;
}

async function getSavedSchemesForUser(userId) {
  const savedRows = await listSavedSchemeRows(userId);
  const schemeIds = savedRows.map((row) => row.scheme_id);

  if (schemeIds.length === 0) {
    return [];
  }

  const schemes = await Scheme.find({ schemeId: { $in: schemeIds } }).lean();
  const schemeById = new Map(schemes.map((scheme) => [scheme.schemeId, scheme]));

  return savedRows.map((row) => {
    const scheme = schemeById.get(row.scheme_id);

    return {
      schemeId: row.scheme_id,
      savedAt: row.saved_at,
      notes: row.notes,
      active: scheme?.active ?? false,
      scheme: scheme ?? null,
    };
  });
}

async function saveSchemeForUser(userId, schemeId) {
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO saved_schemes (user_id, scheme_id, saved_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, scheme_id) DO NOTHING
    `,
    [userId, schemeId]
  );

  return {
    saved: true,
    schemeId,
  };
}

async function deleteSavedSchemeForUser(userId, schemeId) {
  const pool = getPool();
  const result = await pool.query(
    `
      DELETE FROM saved_schemes
      WHERE user_id = $1 AND scheme_id = $2
    `,
    [userId, schemeId]
  );

  return result.rowCount > 0;
}

module.exports = {
  deleteSavedSchemeForUser,
  getSavedSchemesForUser,
  saveSchemeForUser,
};
