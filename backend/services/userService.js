require("../config/env");

const { getPool } = require("../config/postgres");

async function findOrCreateUserByPhone(phone, lang = "hi") {
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO users (phone, lang, created_at, last_login)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (phone) DO UPDATE SET
        lang = COALESCE(EXCLUDED.lang, users.lang),
        last_login = NOW()
      RETURNING id, phone, lang
    `,
    [phone, lang]
  );

  return result.rows[0];
}

module.exports = {
  findOrCreateUserByPhone,
};
