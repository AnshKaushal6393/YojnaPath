require("../config/env");

const Redis = require("ioredis");

const { isMongoReady } = require("../config/mongo");
const { IMPACT_CACHE_TTL_SECONDS } = require("../config/constants");
const { getPool } = require("../config/postgres");
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

function isMissingRelationError(error) {
  return error?.code === "42P01";
}

function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = new MemoryAnalyticsStore();
  }

  return memoryStore;
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

async function recordMatchAnalytics() {
  await incrementCounter("analytics:matches:total", 1);
}

async function recordKioskUsage(kioskId) {
  await incrementCounter("analytics:kiosk:total", 1);
  if (kioskId) {
    await incrementCounter(`analytics:kiosk:${kioskId}`, 1);
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
  recordKioskUsage,
  recordMatchAnalytics,
};
