const rateLimit = require("express-rate-limit");

function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizePhone(req.body?.phone) || req.ip,
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

module.exports = {
  generalApiLimiter,
  matchLimiter,
  otpLimiter,
};
