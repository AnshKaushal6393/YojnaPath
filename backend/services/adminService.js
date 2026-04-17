require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");

let adminTableInitializationPromise;

async function ensureAdminTable() {
  if (!adminTableInitializationPromise) {
    adminTableInitializationPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(
        `CREATE TABLE IF NOT EXISTS admins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(120) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )`
      );
      await pool.query("ALTER TABLE admins ALTER COLUMN email TYPE VARCHAR(120)");
      await pool.query("ALTER TABLE admins ALTER COLUMN password_hash TYPE VARCHAR(255)");
      await pool.query("ALTER TABLE admins ALTER COLUMN created_at SET DEFAULT NOW()");
    })().catch((error) => {
      adminTableInitializationPromise = null;
      throw error;
    });
  }

  return adminTableInitializationPromise;
}

async function findAdminByEmail(email) {
  await ensureAdminTable();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, email, password_hash, created_at, last_login
      FROM admins
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [String(email || "").trim()]
  );

  return result.rows[0] || null;
}

async function findAdminById(adminId) {
  await ensureAdminTable();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, email, created_at, last_login
      FROM admins
      WHERE id = $1
      LIMIT 1
    `,
    [adminId]
  );

  return result.rows[0] || null;
}

async function recordAdminLogin(adminId) {
  await ensureAdminTable();
  const pool = getPool();
  await pool.query(
    `
      UPDATE admins
      SET last_login = NOW()
      WHERE id = $1
    `,
    [adminId]
  );
}

module.exports = {
  ensureAdminTable,
  findAdminByEmail,
  findAdminById,
  recordAdminLogin,
};
