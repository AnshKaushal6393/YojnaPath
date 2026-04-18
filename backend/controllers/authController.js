require("../config/env");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { JWT_EXPIRES_IN } = require("../config/constants");
const { getRequiredEnv } = require("../config/env");
const { recordFunnelStage } = require("../services/funnelService");
const { getOtpStore } = require("../services/otpStore");
const {
  completeUserRegistration,
  findOrCreateUserByIdentifier,
  getUserById,
} = require("../services/userService");

const { sendOtpEmail } = require("../services/emailService");


function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim().toLowerCase());
}

function validateName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").length >= 2;
}

function validatePhotoUrl(photoUrl) {
  const value = String(photoUrl ?? "").trim();
  if (!value) {
    return false;
  }

  if (value.startsWith("data:image/")) {
    return value.length <= 2_000_000;
  }

  return /^https:\/\/res\.cloudinary\.com\/.+/i.test(value);
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    phone: user.phone || null,
    email: user.email || null,
    name: user.name || null,
    photoUrl: user.photo_url || null,
    photoType: user.photo_type || "none",
    onboardingDone: Boolean(user.onboarding_done),
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

function isSmsOtpEnabled() {
  return process.env.SMS_OTP_ENABLED === "true";
}

function shouldExposeOtpInResponse() {
  return process.env.EXPOSE_OTP_IN_RESPONSE === "true";
}

async function login(req, res) {
  const otpStore = getOtpStore();
  const type = String(req.body?.type || 'phone').toLowerCase();
  const identifier = String(req.body?.identifier || '').trim();
  let key;
  let normalizedIdentifier;
  let phone = "";

  if (type === 'phone') {
    phone = normalizePhone(identifier);
    if (!validatePhone(phone)) {
      return res.status(400).json({ message: "Valid 10-digit phone is required" });
    }
    normalizedIdentifier = phone;
    key = `phone:${phone}`;
  } else if (type === 'email') {
    const email = identifier.toLowerCase();
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    normalizedIdentifier = email;
    key = `email:${email}`;
  } else {
    return res.status(400).json({ message: "Type must be 'phone' or 'email'" });
  }

  await recordFunnelStage({
    stage: "identifier_entered",
    phone: type === 'phone' ? identifier : undefined,
    oncePerPhone: true,
  });

  if (await otpStore.isRateLimited(key)) {
    return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
  }

  const useDemoOtp = type === "phone" && isDemoOtpEnabled() && isDemoPhoneAllowed(phone);
  const otp = useDemoOtp ? getDemoOtpCode() : generateOtp();

  if (type === "phone") {
    await otpStore.saveOtp(key, otp);

    if (useDemoOtp) {
      console.log(`[auth] Demo OTP for ${phone}: ${otp}`);
    } else if (!isSmsOtpEnabled()) {
      console.log(`[auth] Generated phone OTP for ${phone}: ${otp}`);
    }

    // TODO: integrate SMS service when SMS_OTP_ENABLED is true.
    return res.json({
      message: "OTP sent",
      ...(shouldExposeOtpInResponse() ? { debugOtp: otp } : {}),
    });
  }

  await otpStore.saveOtp(key, otp);

  try {
    await sendOtpEmail(normalizedIdentifier, otp);
    console.log(`[auth] OTP sent to ${normalizedIdentifier}`);
  } catch (error) {
    await otpStore.clearOtp(key);
    console.error(`[auth] OTP delivery failed for ${normalizedIdentifier}:`, error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }

  return res.json({
    message: "OTP sent",
    ...(shouldExposeOtpInResponse() ? { debugOtp: otp } : {}),
  });
}


async function verify(req, res) {
  const otpStore = getOtpStore();
  const type = String(req.body?.type || 'phone').toLowerCase();
  const identifier = String(req.body?.identifier || '').trim();
  const otp = String(req.body?.otp ?? "").trim();
  const lang = req.body?.lang === "en" ? "en" : "hi";

  let key;
  if (type === 'phone') {
    const phone = normalizePhone(identifier);
    if (!validatePhone(phone) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Valid phone and 6-digit OTP are required" });
    }
    key = `phone:${phone}`;
  } else if (type === 'email') {
    if (!validateEmail(identifier) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Valid email and 6-digit OTP are required" });
    }
    key = `email:${identifier.toLowerCase()}`;
  } else {
    return res.status(400).json({ message: "Type must be 'phone' or 'email'" });
  }

  const storedOtp = await otpStore.getOtp(key);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(401).json({ message: "OTP wrong or expired" });
  }

  await otpStore.clearOtp(key);

  const user = await findOrCreateUserByIdentifier(identifier, type, lang);
  await recordFunnelStage({
    stage: "otp_verified",
    userId: user.id,
    phone: type === 'phone' ? identifier : undefined,
    oncePerUser: true,
  });
  const jwtSecret = getRequiredEnv("JWT_SECRET");
  const token = jwt.sign(
    {
      userId: user.id,
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
  const photoType = req.body?.photoType === "camera" ? "camera" : "upload";

  const existingUser = await getUserById(req.user.id);

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!validateName(name)) {
    return res.status(400).json({ message: "Name must be at least 2 characters long" });
  }

  if (!photoUrl && !existingUser.photo_url) {
    return res.status(400).json({ message: "Photo is required to complete registration" });
  }

  if (photoUrl && !validatePhotoUrl(photoUrl)) {
    return res.status(400).json({ message: "Photo must be a valid image under 2 MB" });
  }

  const user = await completeUserRegistration(req.user.id, { name, lang, photoUrl, photoType });
  await recordFunnelStage({
    stage: "profile_filled",
    userId: req.user.id,
    phone: existingUser.phone,
    oncePerUser: true,
  });

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
