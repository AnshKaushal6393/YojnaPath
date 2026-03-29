require("../config/env");

const { getPool } = require("../config/postgres");

async function findUserByPhone(phone) {
  const pool = getPool();
  const result = await pool.query(
    "SELECT id, phone, lang FROM users WHERE phone = $1 LIMIT 1",
    [phone]
  );

  return result.rows[0] ?? null;
}

async function createUserByPhone(phone, lang = "hi") {
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO users (phone, lang, created_at, last_login)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, phone, lang
    `,
    [phone, lang]
  );

  return result.rows[0];
}

async function touchLastLogin(userId) {
  const pool = getPool();
  await pool.query(
    "UPDATE users SET last_login = NOW() WHERE id = $1",
    [userId]
  );
}

async function findOrCreateUserByPhone(phone, lang = "hi") {
  const existing = await findUserByPhone(phone);
  if (existing) {
    await touchLastLogin(existing.id);
    return existing;
  }

  return createUserByPhone(phone, lang);
}

module.exports = {
  findOrCreateUserByPhone,
};
