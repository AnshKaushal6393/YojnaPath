require("../config/env");

const { getPool } = require("../config/postgres");

const ALLOWED_GENDERS = ["male", "female", "other"];
const ALLOWED_CASTES = ["sc", "st", "obc", "general"];
const ALLOWED_OCCUPATIONS = [
  "farmer",
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

let ensureProfilesConstraintPromise = null;

async function ensureProfileOccupationConstraint() {
  if (!ensureProfilesConstraintPromise) {
    const pool = getPool();
    ensureProfilesConstraintPromise = pool
      .query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'profiles'
          ) THEN
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_occupation_check;
            ALTER TABLE profiles
              ADD CONSTRAINT profiles_occupation_check
              CHECK (
                occupation IN (
                  'farmer',
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
          END IF;
        END
        $$;
      `)
      .catch((error) => {
        ensureProfilesConstraintPromise = null;
        throw error;
      });
  }

  await ensureProfilesConstraintPromise;
}

function mapProfileRow(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    state: row.state,
    occupation: row.occupation,
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
  };
}

async function getProfileByUserId(userId) {
  await ensureProfileOccupationConstraint();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        p.user_id,
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
        u.lang
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return mapProfileRow(result.rows[0] ?? null);
}

async function upsertProfile(userId, profile) {
  await ensureProfileOccupationConstraint();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO profiles (
          user_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          state = EXCLUDED.state,
          occupation = EXCLUDED.occupation,
          annual_income = EXCLUDED.annual_income,
          caste = EXCLUDED.caste,
          gender = EXCLUDED.gender,
          age = EXCLUDED.age,
          land_acres = EXCLUDED.land_acres,
          disability_pct = EXCLUDED.disability_pct,
          is_student = EXCLUDED.is_student,
          is_migrant = EXCLUDED.is_migrant,
          district = EXCLUDED.district,
          updated_at = NOW()
        RETURNING
          user_id,
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
      const userResult = await client.query(
        `
          SELECT lang
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [userId]
      );
      lang = userResult.rows[0]?.lang ?? null;
    }

    await client.query("COMMIT");

    return mapProfileRow({
      ...result.rows[0],
      lang,
    });
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
  getProfileByUserId,
  upsertProfile,
};
