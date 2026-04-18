require("../config/env");

const Redis = require("ioredis");

const {
  OTP_MAX_REQUESTS_PER_WINDOW,
  OTP_RESEND_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
} = require("../config/constants");

class MemoryOtpStore {
  constructor() {
    this.otpByKey = new Map();
    this.rateLimitByKey = new Map();
  }

  cleanupRateLimit(key, now) {
    const entries = this.rateLimitByKey.get(key) ?? [];
    const cutoff = now - (OTP_RESEND_WINDOW_SECONDS * 1000);
    const filtered = entries.filter((timestamp) => timestamp > cutoff);
    this.rateLimitByKey.set(key, filtered);
    return filtered;
  }

  async isRateLimited(key) {
    const now = Date.now();
    const entries = this.cleanupRateLimit(key, now);
    return entries.length >= OTP_MAX_REQUESTS_PER_WINDOW;
  }

  async saveOtp(key, otp) {
    const expiresAt = Date.now() + (OTP_TTL_SECONDS * 1000);
    this.otpByKey.set(key, { otp, expiresAt });
    const entries = this.cleanupRateLimit(key, Date.now());
    entries.push(Date.now());
    this.rateLimitByKey.set(key, entries);
  }

  async getOtp(key) {
    const record = this.otpByKey.get(key);
    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.otpByKey.delete(key);
      return null;
    }

    return record.otp;
  }

  async clearOtp(key) {
    this.otpByKey.delete(key);
  }
}

let redis;
let fallbackStore;
let redisUnavailable = false;
let hasLoggedRedisError = false;

function getMemoryStore() {
  if (!fallbackStore) {
    fallbackStore = new MemoryOtpStore();
  }

  return fallbackStore;
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
      console.warn("[otp] Falling back to memory OTP store because Redis is unavailable.");
    }
    return null;
  }
}

function getOtpStore() {
  return fallbackStore;
}

const otpStoreFacade = {
  async isRateLimited(key) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().isRateLimited(key);
    }

    const redisKey = `otp:rate:${key}`;
    const count = await client.get(redisKey);
    return Number(count ?? 0) >= OTP_MAX_REQUESTS_PER_WINDOW;
  },
  async saveOtp(key, otp) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().saveOtp(key, otp);
    }

    const otpRedisKey = `otp:value:${key}`;
    const rateRedisKey = `otp:rate:${key}`;
    const multi = client.multi();
    multi.set(otpRedisKey, otp, "EX", OTP_TTL_SECONDS);
    multi.incr(rateRedisKey);
    multi.expire(rateRedisKey, OTP_RESEND_WINDOW_SECONDS);
    await multi.exec();
  },

  async getOtp(key) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().getOtp(key);
    }

    const redisKey = `otp:value:${key}`;
    return client.get(redisKey);
  },
  async clearOtp(key) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().clearOtp(key);
    }

    await client.del(`otp:value:${key}`);
  },
};

module.exports = {
  getOtpStore: () => otpStoreFacade,
};

