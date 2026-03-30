require("../config/env");

const Redis = require("ioredis");

const {
  OTP_MAX_REQUESTS_PER_WINDOW,
  OTP_RESEND_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
} = require("../config/constants");

class MemoryOtpStore {
  constructor() {
    this.otpByPhone = new Map();
    this.rateLimitByPhone = new Map();
  }

  cleanupRateLimit(phone, now) {
    const entries = this.rateLimitByPhone.get(phone) ?? [];
    const cutoff = now - (OTP_RESEND_WINDOW_SECONDS * 1000);
    const filtered = entries.filter((timestamp) => timestamp > cutoff);
    this.rateLimitByPhone.set(phone, filtered);
    return filtered;
  }

  async isRateLimited(phone) {
    const now = Date.now();
    const entries = this.cleanupRateLimit(phone, now);
    return entries.length >= OTP_MAX_REQUESTS_PER_WINDOW;
  }

  async saveOtp(phone, otp) {
    const expiresAt = Date.now() + (OTP_TTL_SECONDS * 1000);
    this.otpByPhone.set(phone, { otp, expiresAt });
    const entries = this.cleanupRateLimit(phone, Date.now());
    entries.push(Date.now());
    this.rateLimitByPhone.set(phone, entries);
  }

  async getOtp(phone) {
    const record = this.otpByPhone.get(phone);
    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.otpByPhone.delete(phone);
      return null;
    }

    return record.otp;
  }

  async clearOtp(phone) {
    this.otpByPhone.delete(phone);
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
  async isRateLimited(phone) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().isRateLimited(phone);
    }

    const key = `otp:rate:${phone}`;
    const count = await client.get(key);
    return Number(count ?? 0) >= OTP_MAX_REQUESTS_PER_WINDOW;
  },
  async saveOtp(phone, otp) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().saveOtp(phone, otp);
    }

    const otpKey = `otp:value:${phone}`;
    const rateKey = `otp:rate:${phone}`;
    const multi = client.multi();
    multi.set(otpKey, otp, "EX", OTP_TTL_SECONDS);
    multi.incr(rateKey);
    multi.expire(rateKey, OTP_RESEND_WINDOW_SECONDS);
    await multi.exec();
  },
  async getOtp(phone) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().getOtp(phone);
    }

    return client.get(`otp:value:${phone}`);
  },
  async clearOtp(phone) {
    const client = await getRedisClient();
    if (!client) {
      return getMemoryStore().clearOtp(phone);
    }

    await client.del(`otp:value:${phone}`);
  },
};

module.exports = {
  getOtpStore: () => otpStoreFacade,
};
