require("../config/env");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { JWT_EXPIRES_IN } = require("../config/constants");
const { getRequiredEnv } = require("../config/env");
const { getOtpStore } = require("../services/otpStore");
const {
  completeUserRegistration,
  findOrCreateUserByPhone,
  getUserById,
} = require("../services/userService");

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

function validateName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").length >= 2;
}

function validatePhotoUrl(photoUrl) {
  if (!photoUrl) {
    return true;
  }

  const value = String(photoUrl).trim();
  if (!value.startsWith("data:image/")) {
    return false;
  }

  return value.length <= 2_000_000;
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name || null,
    photoUrl: user.photo_url || null,
    lang: user.lang,
    needsRegistration: !user.name,
  };
}

function parseDemoPhones() {
  return String(process.env.DEMO_OTP_PHONES || "")
    .split(",")
    .map((phone) => phone.replace(/\D/g, "").trim())
    .filter(Boolean);
}

function isDemoOtpEnabled() {
  return process.env.DEMO_OTP_ENABLED === "true";
}

function getDemoOtpCode() {
  return String(process.env.DEMO_OTP_CODE || "123456").trim();
}

function isDemoPhoneAllowed(phone) {
  const allowedPhones = parseDemoPhones();
  return allowedPhones.length === 0 || allowedPhones.includes(phone);
}

async function login(req, res) {
  const otpStore = getOtpStore();
  const phone = normalizePhone(req.body?.phone);

  if (!validatePhone(phone)) {
    return res.status(400).json({ message: "Valid 10-digit phone is required" });
  }

  if (await otpStore.isRateLimited(phone)) {
    return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
  }

  const useDemoOtp = isDemoOtpEnabled() && isDemoPhoneAllowed(phone);
  const otp = useDemoOtp ? getDemoOtpCode() : generateOtp();
  await otpStore.saveOtp(phone, otp);

  if (useDemoOtp) {
    console.log(`[auth] Demo OTP for ${phone}: ${otp}`);
  } else if (process.env.NODE_ENV === "development" || !process.env.SMS_ENABLED) {
    console.log(`[auth] OTP for ${phone}: ${otp}`);
  }

  return res.json({ message: "OTP sent" });
}

async function verify(req, res) {
  const otpStore = getOtpStore();
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp ?? "").trim();
  const lang = req.body?.lang === "en" ? "en" : "hi";

  if (!validatePhone(phone) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Valid phone and 6-digit OTP are required" });
  }

  const useDemoOtp = isDemoOtpEnabled() && isDemoPhoneAllowed(phone);
  if (useDemoOtp && otp === getDemoOtpCode()) {
    const user = await findOrCreateUserByPhone(phone, lang);
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        role: "user",
      },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: serializeUser(user),
      needsRegistration: !user.name,
    });
  }

  const storedOtp = await otpStore.getOtp(phone);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(401).json({ message: "OTP wrong or expired" });
  }

  await otpStore.clearOtp(phone);

  const user = await findOrCreateUserByPhone(phone, lang);
  const jwtSecret = getRequiredEnv("JWT_SECRET");
  const token = jwt.sign(
    {
      userId: user.id,
      phone: user.phone,
      role: "user",
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    user: serializeUser(user),
    needsRegistration: !user.name,
  });
}

async function me(req, res) {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    user: serializeUser(user),
  });
}

async function register(req, res) {
  const name = String(req.body?.name ?? "").trim().replace(/\s+/g, " ");
  const lang = req.body?.lang === "en" ? "en" : "hi";
  const photoUrl = req.body?.photoUrl ? String(req.body.photoUrl).trim() : "";

  if (!validateName(name)) {
    return res.status(400).json({ message: "Name must be at least 2 characters long" });
  }

  if (!validatePhotoUrl(photoUrl)) {
    return res.status(400).json({ message: "Photo must be a valid image under 2 MB" });
  }

  const user = await completeUserRegistration(req.user.id, { name, lang, photoUrl });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    user: serializeUser(user),
  });
}

module.exports = {
  login,
  me,
  register,
  verify,
};
