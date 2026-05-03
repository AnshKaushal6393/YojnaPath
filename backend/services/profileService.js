require("../config/env");

const { getPool } = require("../config/postgres");

const ALLOWED_GENDERS = ["male", "female", "other"];
const ALLOWED_CASTES = ["sc", "st", "obc", "general"];
const ALLOWED_OCCUPATIONS = [
  "farmer",
  "business",
  "women",
  "student",
  "worker",
  "health",
  "housing",
  "senior",
  "disability",
  "shopkeeper",
  "artisan",
  "daily_wage",
  "retired",
  "disabled",
  "migrant_worker",
];

let ensureProfilesSchemaPromise = null;

async function ensureProfilesSchema() {
  if (!ensureProfilesSchemaPromise) {
    const pool = getPool();
    ensureProfilesSchemaPromise = pool
      .query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'profiles'
          ) THEN
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_is_primary_key;
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
            DROP INDEX IF EXISTS profiles_one_primary_per_user_idx;
            ALTER TABLE profiles
              ALTER COLUMN state TYPE VARCHAR(50);
            ALTER TABLE profiles
              ALTER COLUMN state DROP NOT NULL;
            ALTER TABLE profiles
              ALTER COLUMN user_id DROP NOT NULL;
            ALTER TABLE profiles
              ALTER COLUMN user_id SET NOT NULL;
            ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS profile_name VARCHAR(120);
            ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS relation VARCHAR(40);
            ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS photo_url TEXT;
            ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
            UPDATE profiles p
            SET
              profile_name = COALESCE(NULLIF(u.name, ''), 'Family member'),
              is_primary = COALESCE(p.is_primary, TRUE)
            FROM users u
            WHERE p.user_id = u.id
              AND (p.profile_name IS NULL OR p.profile_name = '');
            UPDATE profiles
            SET profile_name = 'Family member'
            WHERE profile_name IS NULL OR profile_name = '';
            UPDATE profiles
            SET is_primary = TRUE
            WHERE is_primary IS NULL;
            ALTER TABLE profiles
              ALTER COLUMN profile_name SET NOT NULL;
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_occupation_check;
            ALTER TABLE profiles
              ADD CONSTRAINT profiles_occupation_check
              CHECK (
                occupation IN (
                  'farmer',
                  'business',
                  'women',
                  'student',
                  'worker',
                  'health',
                  'housing',
                  'senior',
                  'disability',
                  'shopkeeper',
                  'artisan',
                  'daily_wage',
                  'retired',
                  'disabled',
                  'migrant_worker'
                )
              );
            CREATE UNIQUE INDEX profiles_one_primary_per_user_idx
              ON profiles (user_id)
              WHERE is_primary = TRUE;
          END IF;
        END
        $$;
      `)
      .catch((error) => {
        ensureProfilesSchemaPromise = null;
        throw error;
      });
  }

  await ensureProfilesSchemaPromise;
}

function mapProfileRow(row) {
  if (!row) {
    return null;
  }

  const displayPhotoUrl = row.photo_url || row.account_photo_url || null;

  return {
    id: row.id,
    userId: row.user_id,
    profileName: row.profile_name,
    relation: row.relation,
    photoUrl: row.photo_url || null,
    displayPhotoUrl,
    isPrimary: row.is_primary,
    state: row.state,
    occupation: row.occupation,
    userType: row.occupation || null,
    annualIncome: row.annual_income,
    caste: row.caste,
    gender: row.gender,
    age: row.age,
    landAcres: row.land_acres == null ? null : Number(row.land_acres),
    disabilityPct: row.disability_pct,
    isStudent: row.is_student,
    isMigrant: row.is_migrant,
    district: row.district,
    lang: row.lang,
    displayProfile: {
      profileName: row.profile_name,
      relation: row.relation,
      photoUrl: displayPhotoUrl,
      state: row.state,
      occupation: row.occupation,
      userType: row.occupation || null,
      gender: row.gender,
      caste: row.caste,
      age: row.age,
      landAcres: row.land_acres == null ? null : Number(row.land_acres),
      disabilityPct: row.disability_pct,
      isStudent: row.is_student,
      isMigrant: row.is_migrant,
      district: row.district,
    },
  };
}

function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function getProfileByUserId(userId, profileId = null) {
  await ensureProfilesSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.user_id,
        p.profile_name,
        p.relation,
        p.photo_url,
        p.is_primary,
        p.state,
        p.occupation,
        p.annual_income,
        p.caste,
        p.gender,
        p.age,
        p.land_acres,
        p.disability_pct,
        p.is_student,
        p.is_migrant,
        p.district,
        u.photo_url AS account_photo_url,
        u.lang
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
        AND ($2::uuid IS NULL OR p.id = $2::uuid)
      ORDER BY p.is_primary DESC, p.updated_at DESC
      LIMIT 1
    `,
    [userId, profileId]
  );

  return mapProfileRow(result.rows[0] ?? null);
}

async function listProfilesByUserId(userId) {
  await ensureProfilesSchema();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.user_id,
        p.profile_name,
        p.relation,
        p.photo_url,
        p.is_primary,
        p.state,
        p.occupation,
        p.annual_income,
        p.caste,
        p.gender,
        p.age,
        p.land_acres,
        p.disability_pct,
        p.is_student,
        p.is_migrant,
        p.district,
        u.photo_url AS account_photo_url,
        u.lang
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
      ORDER BY p.is_primary DESC, p.updated_at DESC, p.id ASC
    `,
    [userId]
  );

  return result.rows.map(mapProfileRow);
}

async function upsertProfile(userId, profileId, profile) {
  await ensureProfilesSchema();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userInfoResult = await client.query(
      `
        SELECT name, lang, photo_url
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    const userInfo = userInfoResult.rows[0] || {};
    const resolvedProfileName = profile.profileName || userInfo.name || "Family member";
    const isOwnerProfile =
      normalizeComparisonName(resolvedProfileName) &&
      normalizeComparisonName(resolvedProfileName) === normalizeComparisonName(userInfo.name);

    const existingCountResult = await client.query(
      `
        SELECT COUNT(*)::integer AS count
        FROM profiles
        WHERE user_id = $1
      `,
      [userId]
    );
    const existingCount = existingCountResult.rows[0]?.count ?? 0;

    if (!profileId && existingCount > 0 && !profile.photoUrl) {
      throw new Error("photoUrl is required for family members");
    }

    let result;
    if (profileId) {
      result = await client.query(
        `
          UPDATE profiles
          SET
            profile_name = $3,
            relation = $4,
            photo_url = COALESCE($5, photo_url),
            state = $6,
            occupation = $7,
            annual_income = $8,
            caste = $9,
            gender = $10,
            age = $11,
            land_acres = $12,
            disability_pct = $13,
            is_student = $14,
            is_migrant = $15,
            district = $16,
          updated_at = NOW()
          WHERE user_id = $1 AND id = $2
          RETURNING
            id,
            user_id,
            profile_name,
            relation,
            photo_url,
            is_primary,
            state,
            occupation,
            annual_income,
            caste,
            gender,
            age,
            land_acres,
            disability_pct,
            is_student,
            is_migrant,
            district
        `,
        [
          userId,
          profileId,
          resolvedProfileName,
          profile.relation,
          profile.photoUrl,
          profile.state,
          profile.occupation,
          profile.annualIncome,
          profile.caste,
          profile.gender,
          profile.age,
          profile.landAcres,
          profile.disabilityPct,
          profile.isStudent,
          profile.isMigrant,
          profile.district,
        ]
      );
    } else {
      result = await client.query(
        `
          INSERT INTO profiles (
            user_id,
            profile_name,
            relation,
            is_primary,
            photo_url,
            state,
            occupation,
            annual_income,
            caste,
            gender,
            age,
            land_acres,
            disability_pct,
            is_student,
            is_migrant,
            district,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
          )
          RETURNING
            id,
            user_id,
            profile_name,
            relation,
            photo_url,
            is_primary,
            state,
            occupation,
            annual_income,
            caste,
            gender,
            age,
            land_acres,
            disability_pct,
            is_student,
            is_migrant,
            district
        `,
        [
          userId,
          resolvedProfileName,
          profile.relation,
          existingCount === 0 || isOwnerProfile,
          profile.photoUrl,
          profile.state,
          profile.occupation,
          profile.annualIncome,
          profile.caste,
          profile.gender,
          profile.age,
          profile.landAcres,
          profile.disabilityPct,
          profile.isStudent,
          profile.isMigrant,
          profile.district,
        ]
      );
    }

    if (!result.rows.length) {
      throw new Error("Profile not found");
    }

    if (isOwnerProfile) {
      await client.query(
        `
          UPDATE profiles
          SET is_primary = CASE WHEN id = $2 THEN TRUE ELSE FALSE END,
              updated_at = NOW()
          WHERE user_id = $1
        `,
        [userId, result.rows[0].id]
      );

      const refreshedResult = await client.query(
        `
          SELECT
            p.id,
            p.user_id,
            p.profile_name,
            p.relation,
            p.photo_url,
            p.is_primary,
            p.state,
            p.occupation,
            p.annual_income,
            p.caste,
            p.gender,
            p.age,
            p.land_acres,
            p.disability_pct,
            p.is_student,
            p.is_migrant,
            p.district,
            $3::TEXT AS account_photo_url
          FROM profiles p
          WHERE p.user_id = $1 AND p.id = $2
          LIMIT 1
        `,
        [userId, result.rows[0].id, userInfo.photo_url || null]
      );

      result = refreshedResult;
    }

    let lang = null;
    if (profile.lang) {
      const userResult = await client.query(
        `
          UPDATE users
          SET lang = $2
          WHERE id = $1
          RETURNING lang
        `,
        [userId, profile.lang]
      );
      lang = userResult.rows[0]?.lang ?? null;
    } else {
      lang = userInfo.lang ?? null;
    }

    await client.query("COMMIT");

    return mapProfileRow({
      ...result.rows[0],
      lang,
      account_photo_url: userInfo.photo_url || null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteProfileByUserId(userId, profileId) {
  await ensureProfilesSchema();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingProfilesResult = await client.query(
      `
        SELECT id, is_primary
        FROM profiles
        WHERE user_id = $1
        ORDER BY is_primary DESC, updated_at DESC, id ASC
      `,
      [userId]
    );

    const existingProfiles = existingProfilesResult.rows;

    if (existingProfiles.length <= 1) {
      throw new Error("You must keep at least one family profile.");
    }

    const profileToDelete = existingProfiles.find((profile) => profile.id === profileId);

    if (!profileToDelete) {
      throw new Error("Profile not found");
    }

    await client.query(
      `
        DELETE FROM profiles
        WHERE user_id = $1 AND id = $2
      `,
      [userId, profileId]
    );

    if (profileToDelete.is_primary) {
      const nextPrimaryProfile = existingProfiles.find((profile) => profile.id !== profileId);

      if (nextPrimaryProfile) {
        await client.query(
          `
            UPDATE profiles
            SET is_primary = CASE WHEN id = $2 THEN TRUE ELSE FALSE END,
                updated_at = NOW()
            WHERE user_id = $1
          `,
          [userId, nextPrimaryProfile.id]
        );
      }
    }

    const remainingProfiles = await client.query(
      `
        SELECT
          p.id,
          p.user_id,
          p.profile_name,
          p.relation,
          p.photo_url,
          p.is_primary,
          p.state,
          p.occupation,
          p.annual_income,
          p.caste,
          p.gender,
          p.age,
          p.land_acres,
        p.disability_pct,
        p.is_student,
        p.is_migrant,
        p.district,
        u.photo_url AS account_photo_url,
        u.lang
      FROM profiles p
      JOIN users u ON u.id = p.user_id
        WHERE p.user_id = $1
        ORDER BY p.is_primary DESC, p.updated_at DESC, p.id ASC
      `,
      [userId]
    );

    await client.query("COMMIT");

    return remainingProfiles.rows.map(mapProfileRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ALLOWED_CASTES,
  ALLOWED_GENDERS,
  ALLOWED_OCCUPATIONS,
  deleteProfileByUserId,
  getProfileByUserId,
  listProfilesByUserId,
  upsertProfile,
};
