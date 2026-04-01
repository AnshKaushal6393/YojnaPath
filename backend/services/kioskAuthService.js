require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");

let kiosksInitializationPromise;

function parseEnvKioskCodes() {
  const raw = String(process.env.KIOSK_CODES || "").trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry, index) => {
      const [code, kioskId] = entry.split(":").map((part) => String(part || "").trim());
      if (!code || !kioskId) {
        return null;
      }

      return {
        id: kioskId,
        name: `Imported kiosk ${index + 1}`,
        centerCode: kioskId,
        loginCode: code.toUpperCase(),
      };
    })
    .filter(Boolean);
}

function getDevFallbackKiosk() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return {
    id: String(process.env.KIOSK_DEMO_ID || "KIOSK_DEMO_1").trim(),
    name: "Demo kiosk",
    centerCode: "DEMO",
    loginCode: String(process.env.KIOSK_DEMO_CODE || "DEMO1234").trim().toUpperCase(),
  };
}

async function ensureKiosksTable() {
  if (!kiosksInitializationPromise) {
    kiosksInitializationPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS kiosks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(120) NOT NULL,
          state VARCHAR(50),
          district VARCHAR(80),
          center_code VARCHAR(40),
          login_code VARCHAR(16) NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      const envKiosks = parseEnvKioskCodes();
      for (const kiosk of envKiosks) {
        await pool.query(
          `
            INSERT INTO kiosks (id, name, center_code, login_code, active)
            VALUES ($1, $2, $3, $4, TRUE)
            ON CONFLICT (login_code) DO NOTHING
          `,
          [kiosk.id, kiosk.name, kiosk.centerCode, kiosk.loginCode]
        ).catch(async () => {
          await pool.query(
            `
              INSERT INTO kiosks (name, center_code, login_code, active)
              VALUES ($1, $2, $3, TRUE)
              ON CONFLICT (login_code) DO NOTHING
            `,
            [kiosk.name, kiosk.centerCode, kiosk.loginCode]
          );
        });
      }

      const devKiosk = getDevFallbackKiosk();
      if (devKiosk) {
        await pool.query(
          `
            INSERT INTO kiosks (name, center_code, login_code, active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (login_code) DO NOTHING
          `,
          [devKiosk.name, devKiosk.centerCode, devKiosk.loginCode]
        );
      }
    })().catch((error) => {
      kiosksInitializationPromise = null;
      throw error;
    });
  }

  return kiosksInitializationPromise;
}

async function resolveKiosk(kioskCode) {
  await ensureKiosksTable();
  const normalizedCode = String(kioskCode || "").trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, name, state, district, center_code, login_code, active
      FROM kiosks
      WHERE login_code = $1 AND active = TRUE
      LIMIT 1
    `,
    [normalizedCode]
  );

  return result.rows[0] || null;
}

module.exports = {
  ensureKiosksTable,
  resolveKiosk,
};
