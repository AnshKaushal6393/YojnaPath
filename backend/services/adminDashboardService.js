require("../config/env");

const { isMongoReady } = require("../config/mongo");
const { getPool, ensureDatabaseSchema } = require("../config/postgres");
const { Scheme } = require("../models/Scheme");

function isMissingRelationError(error) {
  return error?.code === "42P01";
}

async function getAdminOverview() {
  await ensureDatabaseSchema();

  const pool = getPool();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::INT FROM admins) AS admins_count,
      (SELECT COUNT(*)::INT FROM users) AS users_count,
      (SELECT COUNT(*)::INT FROM profiles) AS profiles_count,
      (SELECT COUNT(*)::INT FROM applications) AS applications_count,
      (SELECT COUNT(*)::INT FROM saved_schemes) AS saved_schemes_count
  `);

  const row = result.rows[0] || {};
  let schemesCount = null;

  if (isMongoReady()) {
    try {
      schemesCount = await Scheme.countDocuments({});
    } catch (error) {
      schemesCount = null;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mongoConnected: isMongoReady(),
    counts: {
      admins: row.admins_count || 0,
      users: row.users_count || 0,
      profiles: row.profiles_count || 0,
      applications: row.applications_count || 0,
      savedSchemes: row.saved_schemes_count || 0,
      schemes: schemesCount,
    },
  };
}

async function getAdminStats() {
  await ensureDatabaseSchema();

  const pool = getPool();
  const usersPromise = pool.query("SELECT COUNT(*)::INT AS count FROM users");
  const matchesPromise = pool
    .query(
      `
        SELECT
          COUNT(*)::INT AS count,
          COALESCE(SUM(near_miss_count), 0)::INT AS near_miss_sum
        FROM match_logs
      `
    )
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return { rows: [{ count: 0, near_miss_sum: 0 }] };
      }

      throw error;
    });
  const todayPromise = pool
    .query(
      `
        SELECT COUNT(*)::INT AS count
        FROM match_logs
        WHERE created_at >= CURRENT_DATE
      `
    )
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return { rows: [{ count: 0 }] };
      }

      throw error;
    });
  const topSchemePromise = pool
    .query(
      `
        SELECT scheme_id, COUNT(*)::INT AS count
        FROM match_logs
        CROSS JOIN LATERAL UNNEST(COALESCE(scheme_ids, ARRAY[]::TEXT[])) AS scheme_id
        WHERE created_at >= CURRENT_DATE
        GROUP BY scheme_id
        ORDER BY count DESC, scheme_id ASC
        LIMIT 1
      `
    )
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return { rows: [] };
      }

      throw error;
    });
  const photoStatsPromise = pool.query(`
    SELECT photo_type, COUNT(*)::INT AS count
    FROM users
    GROUP BY photo_type
    ORDER BY photo_type ASC
  `);
  const activeSchemesPromise = isMongoReady()
    ? Scheme.countDocuments({ active: true }).catch(() => 0)
    : Promise.resolve(0);

  const [users, matches, activeSchemes, today, topScheme, photoStats] = await Promise.all([
    usersPromise,
    matchesPromise,
    activeSchemesPromise,
    todayPromise,
    topSchemePromise,
    photoStatsPromise,
  ]);

  return {
    totalUsers: users.rows[0]?.count || 0,
    totalMatches: matches.rows[0]?.count || 0,
    totalNearMisses: matches.rows[0]?.near_miss_sum || 0,
    activeSchemes,
    activeToday: today.rows[0]?.count || 0,
    topSchemeToday: topScheme.rows[0]?.scheme_id || "N/A",
    photoStats: photoStats.rows,
  };
}

module.exports = {
  getAdminOverview,
  getAdminStats,
};
