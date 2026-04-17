require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");

let funnelSchemaPromise;

async function ensureFunnelSchema() {
  if (!funnelSchemaPromise) {
    funnelSchemaPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_funnel_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          phone VARCHAR(10),
          stage VARCHAR(30) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      funnelSchemaPromise = null;
      throw error;
    });
  }

  return funnelSchemaPromise;
}

async function recordFunnelStage({
  stage,
  userId = null,
  phone = null,
  oncePerUser = false,
  oncePerPhone = false,
}) {
  if (!stage) {
    return;
  }

  await ensureFunnelSchema();
  const pool = getPool();

  if (oncePerUser && userId) {
    await pool.query(
      `
        INSERT INTO user_funnel_events (user_id, phone, stage)
        SELECT $1, $2, $3
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_funnel_events
          WHERE user_id = $1 AND stage = $3
        )
      `,
      [userId, phone, stage]
    );
    return;
  }

  if (oncePerPhone && phone) {
    await pool.query(
      `
        INSERT INTO user_funnel_events (user_id, phone, stage)
        SELECT $1, $2, $3
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_funnel_events
          WHERE phone = $2 AND stage = $3
        )
      `,
      [userId, phone, stage]
    );
    return;
  }

  await pool.query(
    `
      INSERT INTO user_funnel_events (user_id, phone, stage)
      VALUES ($1, $2, $3)
    `,
    [userId, phone, stage]
  );
}

module.exports = {
  ensureFunnelSchema,
  recordFunnelStage,
};
