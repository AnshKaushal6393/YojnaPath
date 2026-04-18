require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");

let userColumnsInitializationPromise;

async function ensureUserColumns() {
  if (!userColumnsInitializationPromise) {
    userColumnsInitializationPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(120)`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`);
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_type VARCHAR(12) NOT NULL DEFAULT 'none'`
      );
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE`);
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT FALSE`
      );
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
      RETURNING id, phone, email, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
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
      SELECT id, phone, email, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );


  return result.rows[0] || null;
}

async function completeUserRegistration(userId, { name, lang, photoUrl, photoType = "upload" }) {
  await ensureUserColumns();
  const pool = getPool();
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
  const normalizedLang = lang === "en" ? "en" : "hi";
  const normalizedPhotoUrl = photoUrl ? String(photoUrl).trim() : null;
  const normalizedPhotoType =
    photoType === "camera" || photoType === "generated" ? photoType : "upload";

  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $2,
        photo_url = COALESCE($3, photo_url),
        lang = $4,
        photo_type = CASE WHEN $3 IS NOT NULL THEN $5 ELSE photo_type END,
        onboarding_done = TRUE,
        registration_completed_at = COALESCE(registration_completed_at, NOW()),
        last_login = NOW()
      WHERE id = $1
      RETURNING id, phone, email, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
    `,
    [userId, normalizedName, normalizedPhotoUrl, normalizedLang, normalizedPhotoType]
  );

  return result.rows[0] || null;
}

async function findOrCreateUserByIdentifier(identifier, type, lang = "hi") {
  await ensureUserColumns();
  const pool = getPool();
  const normalizedLang = lang === "en" ? "en" : "hi";

  if (type === 'phone') {
    const normalizedPhone = String(identifier || "").replace(/\D/g, '');
    if (!/^\d{10}$/.test(normalizedPhone)) {
      throw new Error('Invalid phone number');
    }
    return findOrCreateUserByPhone(normalizedPhone, normalizedLang);
  } else if (type === 'email') {
    const normalizedEmail = String(identifier || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Invalid email address');
    }
    const result = await pool.query(
      `
        INSERT INTO users (email, lang, created_at, last_login)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          lang = COALESCE(EXCLUDED.lang, users.lang),
          last_login = NOW()
        RETURNING id, phone, email, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
      `,
      [normalizedEmail, normalizedLang]
    );
    return result.rows[0];
  }
  throw new Error('Type must be "phone" or "email"');
}

module.exports = {
  completeUserRegistration,
  findOrCreateUserByPhone,
  findOrCreateUserByIdentifier,
  getUserById,
};
