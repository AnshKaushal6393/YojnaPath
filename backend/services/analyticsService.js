require("../config/env");

const Redis = require("ioredis");

const { isMongoReady } = require("../config/mongo");
const { IMPACT_CACHE_TTL_SECONDS } = require("../config/constants");
const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { recordFunnelStage } = require("./funnelService");
const { Scheme } = require("../models/Scheme");

class MemoryAnalyticsStore {
  constructor() {
    this.counters = new Map();
    this.values = new Map();
  }

  increment(key, amount = 1) {
    const current = Number(this.counters.get(key) || 0);
    this.counters.set(key, current + amount);
  }

  getCount(key) {
    return Number(this.counters.get(key) || 0);
  }

  setValue(key, value, ttlSeconds) {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  getValue(key) {
    const record = this.values.get(key);
    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.values.delete(key);
      return null;
    }

    return record.value;
  }
}

let redis;
let memoryStore;
let redisUnavailable = false;
let hasLoggedRedisError = false;
let analyticsSchemaReadyPromise;

function isMissingRelationError(error) {
  return error?.code === "42P01";
}

function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = new MemoryAnalyticsStore();
  }

  return memoryStore;
}

async function ensureAnalyticsSchema() {
  if (!analyticsSchemaReadyPromise) {
    analyticsSchemaReadyPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS match_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          session_type VARCHAR(10) DEFAULT 'web',
          state VARCHAR(80),
          occupation VARCHAR(30),
          match_count INTEGER,
          near_miss_count INTEGER,
          scheme_ids TEXT[],
          lang VARCHAR(5),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`ALTER TABLE match_logs ALTER COLUMN state TYPE VARCHAR(80)`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS session_type VARCHAR(10) DEFAULT 'web'`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS state VARCHAR(80)`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS occupation VARCHAR(30)`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS match_count INTEGER`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS near_miss_count INTEGER`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS scheme_ids TEXT[]`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS lang VARCHAR(5)`);
      await pool.query(`ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kiosk_usage_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`ALTER TABLE kiosk_usage_events ADD COLUMN IF NOT EXISTS kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL`);
      await pool.query(`ALTER TABLE kiosk_usage_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kiosk_pdf_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`ALTER TABLE kiosk_pdf_events ADD COLUMN IF NOT EXISTS kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL`);
      await pool.query(`ALTER TABLE kiosk_pdf_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    })().catch((error) => {
      analyticsSchemaReadyPromise = null;
      throw error;
    });
  }

  return analyticsSchemaReadyPromise;
}

async function getRedisClient() {
  if (!process.env.REDIS_URL || redisUnavailable) {
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    redis.on("error", (error) => {
      if (process.env.NODE_ENV === "development" && !hasLoggedRedisError) {
        hasLoggedRedisError = true;
        console.warn(`[redis] ${error.message}`);
      }
    });
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    return redis;
  } catch (error) {
    redisUnavailable = true;
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] Falling back to memory analytics store because Redis is unavailable.");
    }

    return null;
  }
}

async function incrementCounter(key, amount = 1) {
  const client = await getRedisClient();
  if (!client) {
    getMemoryStore().increment(key, amount);
    return;
  }

  await client.incrby(key, amount);
}

async function getCounter(key) {
  const client = await getRedisClient();
  if (!client) {
    return getMemoryStore().getCount(key);
  }

  return Number(await client.get(key) || 0);
}

async function getCachedValue(key) {
  const client = await getRedisClient();
  if (!client) {
    return getMemoryStore().getValue(key);
  }

  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

async function setCachedValue(key, value, ttlSeconds = IMPACT_CACHE_TTL_SECONDS) {
  const client = await getRedisClient();
  if (!client) {
    getMemoryStore().setValue(key, value, ttlSeconds);
    return;
  }

  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

async function recordMatchAnalytics(matchLog = null) {
  await incrementCounter("analytics:matches:total", 1);

  if (!matchLog) {
    return;
  }

  try {
    await ensureAnalyticsSchema();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO match_logs (
          user_id,
          session_type,
          state,
          occupation,
          match_count,
          near_miss_count,
          scheme_ids,
          lang
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        matchLog.userId || null,
        String(matchLog.sessionType || "web").slice(0, 10),
        matchLog.state || null,
        matchLog.userType || matchLog.occupation || null,
        Number.isInteger(matchLog.matchCount) ? matchLog.matchCount : null,
        Number.isInteger(matchLog.nearMissCount) ? matchLog.nearMissCount : null,
        Array.isArray(matchLog.schemeIds)
          ? matchLog.schemeIds.map((schemeId) => String(schemeId))
          : null,
        matchLog.lang || null,
      ]
    );

    if (matchLog.userId) {
      await recordFunnelStage({
        stage: "first_match_run",
        userId: matchLog.userId,
        oncePerUser: true,
      });
    }
  } catch (error) {
    console.warn(`[analytics] Failed to persist match log: ${error.message}`);
  }
}

async function recordKioskUsage(kioskId) {
  await incrementCounter("analytics:kiosk:total", 1);
  if (kioskId) {
    await incrementCounter(`analytics:kiosk:${kioskId}`, 1);
  }

  try {
    await ensureAnalyticsSchema();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO kiosk_usage_events (kiosk_id)
        VALUES ($1)
      `,
      [kioskId || null]
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[analytics] Failed to persist kiosk usage: ${error.message}`);
    }
  }
}

async function recordKioskPdfDownload(kioskId) {
  await incrementCounter("analytics:kiosk:pdf_downloads", 1);
  if (kioskId) {
    await incrementCounter(`analytics:kiosk:pdf_downloads:${kioskId}`, 1);
  }

  try {
    await ensureAnalyticsSchema();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO kiosk_pdf_events (kiosk_id)
        VALUES ($1)
      `,
      [kioskId || null]
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[analytics] Failed to persist kiosk PDF download: ${error.message}`);
    }
  }
}

async function getUsersServedCount() {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM users");
    return result.rows[0]?.count ?? 0;
  } catch (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw error;
  }
}

async function getProfilesGroupedBy(fieldName) {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${fieldName}, COUNT(*)::int AS count FROM profiles GROUP BY ${fieldName}`
    );

    return result.rows.reduce((accumulator, row) => {
      if (row[fieldName] != null) {
        accumulator[row[fieldName]] = row.count;
      }
      return accumulator;
    }, {});
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {};
    }

    throw error;
  }
}

async function getTrackedBenefitValue() {
  if (!isMongoReady()) {
    return 0;
  }

  try {
    const pool = getPool();
    const result = await pool.query("SELECT scheme_id FROM applications");
    const schemeIds = [...new Set(result.rows.map((row) => row.scheme_id).filter(Boolean))];

    if (schemeIds.length === 0) {
      return 0;
    }

    const schemes = await Scheme.find(
      { schemeId: { $in: schemeIds } },
      { schemeId: 1, benefitAmount: 1 }
    ).lean();

    return schemes.reduce((sum, scheme) => sum + Number(scheme.benefitAmount || 0), 0);
  } catch (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw error;
  }
}

async function buildImpactStats() {
  const [
    totalMatches,
    usersServed,
    byUserType,
    byState,
    schemesInDatabase,
    totalBenefitValue,
  ] = await Promise.all([
    getCounter("analytics:matches:total"),
    getUsersServedCount(),
    getProfilesGroupedBy("occupation"),
    getProfilesGroupedBy("state"),
    isMongoReady() ? Scheme.countDocuments({}) : 0,
    getTrackedBenefitValue(),
  ]);

  return {
    totalMatches,
    totalBenefitValue,
    usersServed,
    byUserType,
    byOccupation: byUserType,
    byState,
    schemesInDatabase,
    lastUpdated: new Date().toISOString(),
  };
}

async function getImpactStats() {
  const cacheKey = "impact:snapshot";
  const cached = await getCachedValue(cacheKey);
  if (cached) {
    return cached;
  }

  const stats = await buildImpactStats();
  await setCachedValue(cacheKey, stats);
  return stats;
}

module.exports = {
  buildImpactStats,
  getImpactStats,
  recordKioskPdfDownload,
  recordKioskUsage,
  recordMatchAnalytics,
};
