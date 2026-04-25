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
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE`);
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`
      );
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
      RETURNING id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
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
      SELECT id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
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
      RETURNING id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
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
        RETURNING id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
      `,
      [normalizedEmail, normalizedLang]
    );
    return result.rows[0];
  }
  throw new Error('Type must be "phone" or "email"');
}

async function findOrCreateUserByGoogleProfile(profile, lang = "hi") {
  await ensureUserColumns();
  const pool = getPool();
  const normalizedLang = lang === "en" ? "en" : "hi";
  const normalizedSub = String(profile?.sub || "").trim();
  const rawEmail = String(profile?.email || "").trim().toLowerCase();
  const normalizedName = String(profile?.name || "").trim().replace(/\s+/g, " ");
  const normalizedPicture = String(profile?.picture || "").trim();
  const emailVerified = profile?.emailVerified === true;
  const normalizedEmail = emailVerified ? rawEmail : "";
  const hasGoogleProfile = Boolean(normalizedName) && Boolean(normalizedPicture);

  if (!normalizedSub) {
    throw new Error("Google subject is required");
  }

  const result = await pool.query(
    `
      WITH existing_user AS (
        SELECT id
        FROM users
        WHERE google_sub = $1
           OR ($2 <> '' AND email_verified = TRUE AND email = $2)
        ORDER BY CASE WHEN google_sub = $1 THEN 0 ELSE 1 END
        LIMIT 1
      ), updated_user AS (
        UPDATE users
        SET
          google_sub = $1,
          email = CASE WHEN $2 <> '' THEN $2 ELSE email END,
          email_verified = email_verified OR $3,
          name = CASE WHEN COALESCE(name, '') = '' AND $4 <> '' THEN $4 ELSE name END,
          photo_url = CASE WHEN COALESCE(photo_url, '') = '' AND $5 <> '' THEN $5 ELSE photo_url END,
          photo_type = CASE
            WHEN COALESCE(photo_url, '') = '' AND $5 <> '' THEN 'upload'
            ELSE photo_type
          END,
          onboarding_done = CASE
            WHEN onboarding_done = TRUE THEN TRUE
            ELSE $6
          END,
          registration_completed_at = CASE
            WHEN registration_completed_at IS NOT NULL THEN registration_completed_at
            WHEN $6 THEN NOW()
            ELSE registration_completed_at
          END,
          lang = COALESCE($7, lang),
          last_login = NOW()
        WHERE id = (SELECT id FROM existing_user)
        RETURNING id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
      )
      INSERT INTO users (
        email,
        google_sub,
        email_verified,
        name,
        photo_url,
        photo_type,
        onboarding_done,
        registration_completed_at,
        lang,
        created_at,
        last_login
      )
      SELECT
        NULLIF($2, ''),
        $1,
        $3,
        NULLIF($4, ''),
        NULLIF($5, ''),
        CASE WHEN $5 <> '' THEN 'upload' ELSE 'none' END,
        $6,
        CASE WHEN $6 THEN NOW() ELSE NULL END,
        $7,
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM updated_user)
      RETURNING id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
    `,
    [
      normalizedSub,
      normalizedEmail,
      emailVerified,
      normalizedName,
      normalizedPicture,
      hasGoogleProfile,
      normalizedLang,
    ]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const fallback = await pool.query(
    `
      SELECT id, phone, email, google_sub, email_verified, name, photo_url, photo_type, onboarding_done, lang, registration_completed_at
      FROM users
      WHERE google_sub = $1
      LIMIT 1
    `,
    [normalizedSub]
  );

  return fallback.rows[0] || null;
}

module.exports = {
  completeUserRegistration,
  findOrCreateUserByGoogleProfile,
  findOrCreateUserByPhone,
  findOrCreateUserByIdentifier,
  getUserById,
};
