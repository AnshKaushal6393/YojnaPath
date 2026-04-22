require("../config/env");

const { isMongoReady } = require("../config/mongo");
const { ensureFunnelSchema } = require("./funnelService");
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

  const totalUsers = users.rows[0]?.count || 0;
  const totalMatches = matches.rows[0]?.count || 0;
  const photoRows = photoStats.rows || [];
  const totalPhotoRows = photoRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const completedPhotoRows = photoRows
    .filter((row) => row.photo_type && row.photo_type !== "none")
    .reduce((sum, row) => sum + Number(row.count || 0), 0);

  return {
    totalUsers,
    totalMatches,
    totalNearMisses: matches.rows[0]?.near_miss_sum || 0,
    activeSchemes,
    activeToday: today.rows[0]?.count || 0,
    avgMatchesPerUser: totalUsers > 0 ? totalMatches / totalUsers : 0,
    photoCompletionPct: totalPhotoRows > 0 ? (completedPhotoRows / totalPhotoRows) * 100 : 0,
    topSchemeToday: topScheme.rows[0]?.scheme_id || "N/A",
    photoStats: photoRows,
  };
}

async function getAdminActivity(limit = 50) {
  await ensureDatabaseSchema();

  const pool = getPool();

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          session_type,
          state,
          occupation,
          match_count,
          near_miss_count,
          scheme_ids,
          lang,
          created_at
        FROM match_logs
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      sessionType: row.session_type || "web",
      state: row.state || null,
      occupation: row.occupation || null,
      userType: row.occupation || null,
      matchCount: Number(row.match_count || 0),
      nearMissCount: Number(row.near_miss_count || 0),
      schemeIds: Array.isArray(row.scheme_ids) ? row.scheme_ids : [],
      lang: row.lang || null,
      createdAt: row.created_at,
    }));
  } catch (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }
}

async function getAdminFunnel() {
  await ensureDatabaseSchema();
  await ensureFunnelSchema();

  const pool = getPool();
  const userSummaryPromise = pool.query(`
    SELECT
      COUNT(*)::INT AS phone_entered,
      COUNT(*)::INT AS otp_verified,
      COUNT(*) FILTER (
        WHERE photo_type IS NOT NULL AND photo_type <> 'none'
      )::INT AS photo_taken,
      COUNT(*) FILTER (
        WHERE onboarding_done = TRUE OR registration_completed_at IS NOT NULL
      )::INT AS profile_filled
    FROM users
  `);
  const firstMatchPromise = pool
    .query(`
      SELECT COUNT(DISTINCT user_id)::INT AS first_match_run
      FROM match_logs
      WHERE user_id IS NOT NULL
    `)
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return { rows: [{ first_match_run: 0 }] };
      }

      throw error;
    });
  const eventSummaryPromise = pool
    .query(`
      SELECT
        COUNT(DISTINCT phone) FILTER (WHERE stage = 'phone_entered')::INT AS phone_entered,
        COUNT(DISTINCT COALESCE(user_id::TEXT, phone)) FILTER (WHERE stage = 'otp_verified')::INT AS otp_verified,
        COUNT(DISTINCT COALESCE(user_id::TEXT, phone)) FILTER (WHERE stage = 'photo_taken')::INT AS photo_taken,
        COUNT(DISTINCT COALESCE(user_id::TEXT, phone)) FILTER (WHERE stage = 'profile_filled')::INT AS profile_filled,
        COUNT(DISTINCT COALESCE(user_id::TEXT, phone)) FILTER (WHERE stage = 'first_match_run')::INT AS first_match_run
      FROM user_funnel_events
    `)
    .catch((error) => {
      if (isMissingRelationError(error)) {
        return {
          rows: [
            {
              phone_entered: 0,
              otp_verified: 0,
              photo_taken: 0,
              profile_filled: 0,
              first_match_run: 0,
            },
          ],
        };
      }

      throw error;
    });

  const [userSummary, firstMatch, eventSummary] = await Promise.all([
    userSummaryPromise,
    firstMatchPromise,
    eventSummaryPromise,
  ]);
  const summary = userSummary.rows[0] || {};
  const events = eventSummary.rows[0] || {};
  const stages = [
    {
      key: "phoneEntered",
      label: "Identifier entered",
      count: Math.max(events.phone_entered || 0, summary.phone_entered || 0),
    },
    {
      key: "otpVerified",
      label: "OTP verified",
      count: Math.max(events.otp_verified || 0, summary.otp_verified || 0),
    },
    {
      key: "photoTaken",
      label: "Photo taken",
      count: Math.max(events.photo_taken || 0, summary.photo_taken || 0),
    },
    {
      key: "profileFilled",
      label: "Profile filled",
      count: Math.max(events.profile_filled || 0, summary.profile_filled || 0),
    },
    {
      key: "firstMatchRun",
      label: "First match run",
      count: Math.max(events.first_match_run || 0, firstMatch.rows[0]?.first_match_run || 0),
    },
  ];

  return {
    stages,
    maxCount: Math.max(...stages.map((stage) => stage.count), 0),
  };
}

module.exports = {
  getAdminActivity,
  getAdminFunnel,
  getAdminOverview,
  getAdminStats,
};
