const { ipKeyGenerator, rateLimit } = require("express-rate-limit");
const { getAdminSettings } = require("../services/adminSettingsService");

function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function getOtpIdentifierKey(req) {
  const type = String(req.body?.type || "phone").trim().toLowerCase();
  const identifier = String(req.body?.identifier || "").trim();

  if (type === "phone") {
    return normalizePhone(identifier);
  }

  if (type === "email") {
    return `email:${normalizeEmail(identifier)}`;
  }

  return "";
}

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getOtpIdentifierKey(req) || ipKeyGenerator(req),
  message: { error: "Too many OTP requests. Wait 10 minutes." },
});

const matchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many match requests. Please wait." },
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

const dynamicBuckets = new Map();

function cleanupBucketEntries(now) {
  for (const [key, bucket] of dynamicBuckets.entries()) {
    if (!bucket || bucket.resetAt <= now) {
      dynamicBuckets.delete(key);
    }
  }
}

function createDynamicLimiter({ keyPrefix, getKey, resolveWindowMs, resolveMax, message }) {
  return async function dynamicLimiter(req, res, next) {
    const settings = await getAdminSettings();
    const windowMs = Math.max(Number(resolveWindowMs(settings)) || 60000, 1000);
    const max = Math.max(Number(resolveMax(settings)) || 1, 1);
    const key = `${keyPrefix}:${getKey(req)}`;
    const now = Date.now();

    cleanupBucketEntries(now);

    const existing = dynamicBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      dynamicBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    existing.count += 1;
    return next();
  };
}

const adminLoginLimiter = createDynamicLimiter({
  keyPrefix: "admin-login",
  getKey: (req) => String(req.body?.email || "").trim().toLowerCase() || ipKeyGenerator(req),
  resolveWindowMs: (settings) => settings.loginWindowMinutes * 60 * 1000,
  resolveMax: (settings) => settings.loginAttempts,
  message: "Too many admin login attempts. Please wait and try again.",
});

const adminApiLimiter = createDynamicLimiter({
  keyPrefix: "admin-api",
  getKey: (req) => req.admin?.id || ipKeyGenerator(req),
  resolveWindowMs: () => 60 * 1000,
  resolveMax: (settings) => settings.adminRequestsPerMinute,
  message: "Too many admin requests. Please slow down.",
});

module.exports = {
  adminApiLimiter,
  adminLoginLimiter,
  generalApiLimiter,
  getOtpIdentifierKey,
  matchLimiter,
  otpLimiter,
};
