require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");

let userColumnsInitializationPromise;

async function ensureUserColumns() {
  if (!userColumnsInitializationPromise) {
    userColumnsInitializationPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(120)`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`);
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMP`
      );
    })().catch((error) => {
      userColumnsInitializationPromise = null;
      throw error;
    });
  }

  return userColumnsInitializationPromise;
}

async function findOrCreateUserByPhone(phone, lang = "hi") {
  await ensureUserColumns();
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO users (phone, lang, created_at, last_login)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (phone) DO UPDATE SET
        lang = COALESCE(EXCLUDED.lang, users.lang),
        last_login = NOW()
      RETURNING id, phone, name, photo_url, lang, registration_completed_at
    `,
    [phone, lang]
  );

  return result.rows[0];
}

async function getUserById(userId) {
  await ensureUserColumns();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, phone, name, photo_url, lang, registration_completed_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function completeUserRegistration(userId, { name, lang, photoUrl }) {
  await ensureUserColumns();
  const pool = getPool();
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
  const normalizedLang = lang === "en" ? "en" : "hi";
  const normalizedPhotoUrl = photoUrl ? String(photoUrl).trim() : null;

  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $2,
        photo_url = COALESCE($3, photo_url),
        lang = $4,
        registration_completed_at = COALESCE(registration_completed_at, NOW()),
        last_login = NOW()
      WHERE id = $1
      RETURNING id, phone, name, photo_url, lang, registration_completed_at
    `,
    [userId, normalizedName, normalizedPhotoUrl, normalizedLang]
  );

  return result.rows[0] || null;
}

module.exports = {
  completeUserRegistration,
  findOrCreateUserByPhone,
  getUserById,
};
