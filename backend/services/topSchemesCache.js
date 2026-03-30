require("../config/env");

const Redis = require("ioredis");

const CACHE_TTL_SECONDS = 24 * 60 * 60;

class MemoryTopSchemesCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const record = this.cache.get(key);
    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return record.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (CACHE_TTL_SECONDS * 1000),
    });
  }
}

let redis;
let memoryCache;
let redisUnavailable = false;
let hasLoggedRedisError = false;

function getMemoryCache() {
  if (!memoryCache) {
    memoryCache = new MemoryTopSchemesCache();
  }

  return memoryCache;
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
      console.warn("[cache] Falling back to memory cache because Redis is unavailable.");
    }
    return null;
  }
}

const topSchemesCache = {
  async get(userType) {
    const key = `top-schemes:${userType}`;
    const client = await getRedisClient();

    if (!client) {
      return getMemoryCache().get(key);
    }

    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(userType, value) {
    const key = `top-schemes:${userType}`;
    const client = await getRedisClient();

    if (!client) {
      getMemoryCache().set(key, value);
      return;
    }

    await client.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
  },
};

module.exports = {
  CACHE_TTL_SECONDS,
  topSchemesCache,
};
