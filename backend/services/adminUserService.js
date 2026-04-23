require("../config/env");

const { isMongoReady } = require("../config/mongo");
const { getMatchingSchemes } = require("../engine/matcher");
const { configureCloudinary } = require("../config/cloudinary");
const { ensureDatabaseSchema, getPool } = require("../config/postgres");

function normalizePage(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBooleanFilter(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

function normalizeSortField(value) {
  const normalized = String(value || "").trim();
  return normalized || "createdAt";
}

function normalizeSortDirection(value, fallback = "desc") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "asc" || normalized === "desc") {
    return normalized;
  }

  return fallback;
}

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function escapeCsv(value) {
  if (value == null) {
    return "";
  }

  const normalized = String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
}

function extractCloudinaryPublicId(url) {
  const value = String(url || "").trim();

  if (!/^https:\/\/res\.cloudinary\.com\/.+/i.test(value)) {
    return null;
  }

  const uploadMarker = "/upload/";
  const uploadIndex = value.indexOf(uploadMarker);
  if (uploadIndex === -1) {
    return null;
  }

  let assetPath = value.slice(uploadIndex + uploadMarker.length);
  assetPath = assetPath.replace(/^v\d+\//, "");
  assetPath = assetPath.split("?")[0];
  assetPath = assetPath.replace(/\.[a-z0-9]+$/i, "");

  return assetPath || null;
}

function mapMatchRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.created_at,
    sessionType: row.session_type || "web",
    state: row.state || null,
    occupation: row.occupation || null,
    userType: row.occupation || null,
    matchCount: Number(row.match_count || 0),
    nearMissCount: Number(row.near_miss_count || 0),
    schemeIds: Array.isArray(row.scheme_ids) ? row.scheme_ids : [],
    lang: row.lang || null,
  };
}

function mapProfileRow(row) {
  const displayPhotoUrl = row.photo_url || row.account_photo_url || null;

  return {
    id: row.id,
    userId: row.user_id,
    profileName: row.profile_name,
    relation: row.relation,
    photoUrl: row.photo_url || null,
    displayPhotoUrl,
    isPrimary: row.is_primary,
    gender: row.gender || null,
    caste: row.caste || null,
    occupation: row.occupation || null,
    userType: row.occupation || null,
    state: row.state || null,
    annualIncome: row.annual_income == null ? null : Number(row.annual_income),
    district: row.district || null,
    age: row.age == null ? null : Number(row.age),
    landAcres: row.land_acres == null ? null : Number(row.land_acres),
    disabilityPct: row.disability_pct == null ? null : Number(row.disability_pct),
    isStudent: Boolean(row.is_student),
    isMigrant: Boolean(row.is_migrant),
    updatedAt: row.updated_at,
    displayProfile: {
      profileName: row.profile_name,
      relation: row.relation,
      photoUrl: displayPhotoUrl,
      gender: row.gender || null,
      caste: row.caste || null,
      occupation: row.occupation || null,
      userType: row.occupation || null,
      state: row.state || null,
      annualIncome: row.annual_income == null ? null : Number(row.annual_income),
      district: row.district || null,
      age: row.age == null ? null : Number(row.age),
      landAcres: row.land_acres == null ? null : Number(row.land_acres),
      disabilityPct: row.disability_pct == null ? null : Number(row.disability_pct),
      isStudent: Boolean(row.is_student),
      isMigrant: Boolean(row.is_migrant),
    },
  };
}

function getProfileCompletenessScore(profile) {
  if (!profile) {
    return -1;
  }

  return (
    (profile.isPrimary ? 1000 : 0) +
    (profile.state ? 100 : 0) +
    (profile.occupation ? 100 : 0) +
    (profile.photoUrl ? 10 : 0) +
    (profile.gender ? 5 : 0) +
    (profile.caste ? 5 : 0) +
    (profile.age != null ? 2 : 0)
  );
}

function pickDisplayProfile(profiles = []) {
  return [...profiles].sort((left, right) => {
    const scoreDifference = getProfileCompletenessScore(right) - getProfileCompletenessScore(left);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  })[0] || null;
}

function getPreferredPhotoUrl(user, profiles = []) {
  return (
    user?.photo_url ||
    profiles.find((profile) => profile.displayPhotoUrl)?.displayPhotoUrl ||
    profiles.find((profile) => profile.photoUrl)?.photoUrl ||
    null
  );
}

async function listAdminUsers(options = {}) {
  await ensureDatabaseSchema();

  const page = normalizePage(options.page, 1);
  const maxLimit = normalizePage(options.maxLimit, 100);
  const limit = Math.min(normalizePage(options.limit, 50), maxLimit);
  const offset = (page - 1) * limit;
  const state = normalizeOptionalString(options.state)?.toUpperCase() || null;
  const userType = normalizeOptionalString(options.userType)?.toLowerCase() || null;
  const search = normalizeOptionalString(options.search) || null;
  const hasPhoto = normalizeBooleanFilter(options.hasPhoto);
  const sortBy = normalizeSortField(options.sortBy);
  const sortDir = normalizeSortDirection(options.sortDir);

  const sortConfig = {
    createdAt: { column: "u.created_at", defaultDir: "desc" },
    lastLogin: { column: "u.last_login", defaultDir: "desc" },
    name: { column: "COALESCE(u.name, rp.profile_name, '')", defaultDir: "asc" },
    state: { column: "COALESCE(rp.state, '')", defaultDir: "asc" },
    userType: { column: "COALESCE(rp.occupation, '')", defaultDir: "asc" },
    matchRuns: { column: "COALESCE(match_summary.match_runs, 0)", defaultDir: "desc" },
    totalMatches: { column: "COALESCE(match_summary.total_matches, 0)", defaultDir: "desc" },
    totalNearMisses: { column: "COALESCE(match_summary.total_near_misses, 0)", defaultDir: "desc" },
    hasPhoto: { column: "CASE WHEN u.photo_url IS NOT NULL THEN 1 ELSE 0 END", defaultDir: "desc" },
  };
  const activeSort = sortConfig[sortBy] || sortConfig.createdAt;
  const effectiveSortDir = sortDir || activeSort.defaultDir;

  const pool = getPool();
  const result = await pool.query(
    `
      WITH ranked_profiles AS (
        SELECT
          p.*,
          ROW_NUMBER() OVER (
            PARTITION BY p.user_id
            ORDER BY p.is_primary DESC, p.updated_at DESC, p.id ASC
          ) AS profile_rank
        FROM profiles p
      ),
      matched_users AS (
        SELECT
          u.id,
          u.phone,
          u.name,
          u.photo_url,
          u.photo_type,
          u.onboarding_done,
          u.lang,
          u.registration_completed_at,
          u.created_at,
          u.last_login,
          rp.profile_name,
          rp.relation,
          rp.photo_url AS profile_photo_url,
          rp.state,
          rp.occupation,
          rp.district,
          COALESCE(match_summary.match_runs, 0)::INT AS match_runs,
          COALESCE(match_summary.total_matches, 0)::INT AS total_matches,
          COALESCE(match_summary.total_near_misses, 0)::INT AS total_near_misses,
          COUNT(*) OVER ()::INT AS total_count
        FROM users u
        LEFT JOIN ranked_profiles rp
          ON rp.user_id = u.id
         AND rp.profile_rank = 1
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::INT AS match_runs,
            COALESCE(SUM(ml.match_count), 0)::INT AS total_matches,
            COALESCE(SUM(ml.near_miss_count), 0)::INT AS total_near_misses
          FROM match_logs ml
          WHERE ml.user_id = u.id
        ) AS match_summary ON TRUE
        WHERE ($1::TEXT IS NULL OR rp.state = $1)
          AND ($2::TEXT IS NULL OR rp.occupation = $2)
          AND (
            $3::TEXT IS NULL
            OR u.name ILIKE '%' || $3 || '%'
            OR u.phone ILIKE '%' || $3 || '%'
            OR rp.profile_name ILIKE '%' || $3 || '%'
            OR rp.district ILIKE '%' || $3 || '%'
          )
          AND (
            $4::BOOLEAN IS NULL
            OR ($4 = TRUE AND u.photo_url IS NOT NULL)
            OR ($4 = FALSE AND u.photo_url IS NULL)
          )
      )
      SELECT *
      FROM matched_users
      ORDER BY ${activeSort.column} ${effectiveSortDir.toUpperCase()}, id ASC
      LIMIT $5
      OFFSET $6
    `,
    [state, userType, search, hasPhoto, limit, offset]
  );

  const rows = result.rows;
  const total = rows[0]?.total_count || 0;

  return {
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    sortBy,
    sortDir: effectiveSortDir,
    users: rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name || row.profile_name || "Unknown",
      photoUrl: row.photo_url || null,
      displayPhotoUrl: row.photo_url || row.profile_photo_url || null,
      photoType: row.photo_type || "none",
      onboardingDone: Boolean(row.onboarding_done),
      lang: row.lang || "hi",
      createdAt: row.created_at,
      lastLogin: row.last_login,
      registrationCompletedAt: row.registration_completed_at,
      primaryProfile: {
        profileName: row.profile_name || null,
        relation: row.relation || null,
        photoUrl: row.photo_url || row.profile_photo_url || null,
        state: row.state || null,
        occupation: row.occupation || null,
        userType: row.occupation || null,
        district: row.district || null,
      },
      displayProfile: {
        profileName: row.profile_name || null,
        relation: row.relation || null,
        photoUrl: row.photo_url || row.profile_photo_url || null,
        state: row.state || null,
        occupation: row.occupation || null,
        userType: row.occupation || null,
        district: row.district || null,
      },
      stats: {
        matchRuns: Number(row.match_runs || 0),
        totalMatches: Number(row.total_matches || 0),
        totalNearMisses: Number(row.total_near_misses || 0),
      },
    })),
  };
}

async function getAdminUserMatches(userId) {
  await ensureDatabaseSchema();

  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        session_type,
        state,
        occupation,
        match_count,
        near_miss_count,
        scheme_ids,
        lang,
        created_at
      FROM match_logs
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [userId]
  );

  return result.rows.map(mapMatchRow);
}

async function getAdminUserById(userId) {
  await ensureDatabaseSchema();
  console.log(`[ADMIN] Fetching user ${userId} profiles...`);

  const pool = getPool();
  const userPromise = pool.query(
    `
      SELECT
        u.id,
        u.phone,
        u.name,
        u.photo_url,
        u.photo_type,
        u.onboarding_done,
        u.lang,
        u.registration_completed_at,
        u.created_at,
        u.last_login
      FROM users u
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );
  const profilesPromise = pool.query(
    `
      SELECT
        id,
        user_id,
        profile_name,
        relation,
        photo_url,
        is_primary,
        gender,
        caste,
        occupation,
        state,
        annual_income,
        district,
        age,
        land_acres,
        disability_pct,
        is_student,
        is_migrant,
        updated_at
      FROM profiles
      WHERE user_id = $1
      ORDER BY is_primary DESC, updated_at DESC, id ASC
    `,
    [userId]
  );
  const matchesPromise = pool.query(
    `
      SELECT
        id,
        user_id,
        session_type,
        state,
        occupation,
        match_count,
        near_miss_count,
        scheme_ids,
        lang,
        created_at
      FROM match_logs
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `,
    [userId]
  );
  const savedSchemesPromise = pool.query(
    `
      SELECT scheme_id, saved_at, notes
      FROM saved_schemes
      WHERE user_id = $1
      ORDER BY saved_at DESC, scheme_id ASC
    `,
    [userId]
  );
  const applicationsPromise = pool.query(
    `
      SELECT scheme_id, applied_at, status, notes, remind_at
      FROM applications
      WHERE user_id = $1
      ORDER BY applied_at DESC, scheme_id ASC
    `,
    [userId]
  );
  const matchSummaryPromise = pool.query(
    `
      SELECT
        COUNT(*)::INT AS match_runs,
        COALESCE(SUM(match_count), 0)::INT AS total_matches,
        COALESCE(SUM(near_miss_count), 0)::INT AS total_near_misses,
        MAX(created_at) AS last_match_at
      FROM match_logs
      WHERE user_id = $1
    `,
    [userId]
  );

  const [userResult, profilesResult, matchesResult, savedSchemesResult, applicationsResult, matchSummary] =
    await Promise.all([
      userPromise,
      profilesPromise,
      matchesPromise,
      savedSchemesPromise,
      applicationsPromise,
      matchSummaryPromise,
    ]);

  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  const profiles = profilesResult.rows.map(mapProfileRow);
  console.log(`[ADMIN] User ${userId} has ${profiles.length} profiles:`, profiles.map(p => ({id: p.id, name: p.profileName, primary: p.isPrimary, state: p.state, occupation: p.occupation})));
  const primaryProfile = profiles.find((profile) => profile.isPrimary) || profiles[0] || null;
  const displayProfile = pickDisplayProfile(profiles) || primaryProfile;
  console.log(`[ADMIN] Selected primaryProfile for ${userId}:`, primaryProfile ? {name: primaryProfile.profileName, state: primaryProfile.state, occupation: primaryProfile.occupation} : 'none');
  const matchStats = matchSummary.rows[0] || {};
  const displayPhotoUrl = getPreferredPhotoUrl(user, profiles);

  return {
    id: user.id,
    phone: user.phone,
    name: user.name || primaryProfile?.profileName || "Unknown",
    photoUrl: displayPhotoUrl,
    displayPhotoUrl,
    photoType: user.photo_type || "none",
    onboardingDone: Boolean(user.onboarding_done),
    lang: user.lang || "hi",
    createdAt: user.created_at,
    lastLogin: user.last_login,
    registration: {
      registrationCompletedAt: user.registration_completed_at,
      onboardingDone: Boolean(user.onboarding_done),
      photoType: user.photo_type || "none",
      hasPhoto: Boolean(user.photo_url),
      totalProfiles: profiles.length,
    },
    primaryProfile,
    displayProfile,
    displayPhotoUrl,
    profiles,
    savedSchemes: savedSchemesResult.rows.map((row) => ({
      schemeId: row.scheme_id,
      savedAt: row.saved_at,
      notes: row.notes || null,
    })),
    applications: applicationsResult.rows.map((row) => ({
      schemeId: row.scheme_id,
      appliedAt: row.applied_at,
      status: row.status,
      notes: row.notes || null,
      remindAt: row.remind_at,
    })),
    matchSummary: {
      matchRuns: Number(matchStats.match_runs || 0),
      totalMatches: Number(matchStats.total_matches || 0),
      totalNearMisses: Number(matchStats.total_near_misses || 0),
      lastMatchAt: matchStats.last_match_at || null,
    },
    recentMatches: matchesResult.rows.map(mapMatchRow),
  };
}

async function getAdminUserLiveMatches(userId) {
  await ensureDatabaseSchema();

  const user = await getAdminUserById(userId);
  if (!user) {
    return null;
  }

  if (!isMongoReady()) {
    return {
      userId,
      profileReady: false,
      count: 0,
      nearMissCount: 0,
      schemes: [],
      nearMisses: [],
      message: "MongoDB is unavailable",
    };
  }

  const sourceProfile = user.displayProfile || user.primaryProfile;
  if (!sourceProfile?.state || !sourceProfile?.occupation) {
    return {
      userId,
      profileReady: false,
      count: 0,
      nearMissCount: 0,
      schemes: [],
      nearMisses: [],
      message: "Primary profile is incomplete for live matching",
    };
  }

  const profile = {
    state: sourceProfile.state,
    occupation: sourceProfile.occupation,
    annual_income: sourceProfile.annualIncome ?? 0,
    caste: sourceProfile.caste || null,
    gender: sourceProfile.gender || null,
    age: sourceProfile.age ?? null,
    landAcres: sourceProfile.landAcres ?? 0,
    disabilityPct: sourceProfile.disabilityPct ?? 0,
    isStudent: Boolean(sourceProfile.isStudent),
  };

  const result = await getMatchingSchemes(profile, {
    limitMatches: 6,
    limitNearMisses: 6,
  });

  return {
    userId,
    profileReady: true,
    count: result.count,
    nearMissCount: result.nearMissCount,
    schemes: result.schemes || [],
    nearMisses: result.nearMisses || [],
  };
}

async function deleteCloudinaryAssets(urls) {
  const uniquePublicIds = [...new Set(urls.map(extractCloudinaryPublicId).filter(Boolean))];

  if (!uniquePublicIds.length) {
    return;
  }

  let cloudinary;
  try {
    cloudinary = configureCloudinary();
  } catch {
    return;
  }

  await Promise.all(
    uniquePublicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch(() => null)
    )
  );
}

async function deleteAdminUserById(userId) {
  await ensureDatabaseSchema();

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id, phone, name, photo_url, photo_type, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }

    const profilePhotosResult = await client.query(
      `
        SELECT photo_url
        FROM profiles
        WHERE user_id = $1 AND photo_url IS NOT NULL
      `,
      [userId]
    );

    await client.query(`DELETE FROM match_logs WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_funnel_events WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");

    const photoUrls = [
      user.photo_url,
      ...profilePhotosResult.rows.map((row) => row.photo_url),
    ].filter(Boolean);

    await deleteCloudinaryAssets(photoUrls);

    return {
      id: user.id,
      phone: user.phone,
      name: user.name || null,
      photoUrl: user.photo_url || null,
      photoType: user.photo_type || "none",
      deleted: true,
      deletedAt: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function exportAdminUsersCsv() {
  const payload = await listAdminUsers({
    page: 1,
    limit: 100000,
    maxLimit: 100000,
  });

  const lines = [
    ["user_id", "name", "state", "user_type", "match_count"].map(escapeCsv).join(","),
    ...payload.users.map((user) =>
      [
        user.id,
        user.name,
        user.primaryProfile?.state || "",
        user.primaryProfile?.occupation || "",
        user.stats?.totalMatches || 0,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];

  return lines.join("\n");
}

module.exports = {
  deleteAdminUserById,
  exportAdminUsersCsv,
  getAdminUserById,
  getAdminUserLiveMatches,
  getAdminUserMatches,
  listAdminUsers,
};
