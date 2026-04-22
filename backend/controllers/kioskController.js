require("../config/env");

const jwt = require("jsonwebtoken");

const { KIOSK_JWT_EXPIRES_IN } = require("../config/constants");
const { getRequiredEnv } = require("../config/env");
const { getMatchingSchemes } = require("../engine/matcher");
const {
  recordKioskPdfDownloadEvent,
  recordKioskUsage,
  recordMatchAnalytics,
} = require("../services/analyticsService");
const { resolveKiosk } = require("../services/kioskAuthService");
const { buildMatchProfile, validateMatchProfile } = require("./schemesController");

function buildPdfReadyData(kioskId, profile, result) {
  return {
    kioskId,
    generatedAt: new Date().toISOString(),
    visitorProfile: profile,
    summary: {
      matched: result.count,
      nearMisses: result.nearMissCount,
      totalScanned: result.totalScanned,
    },
    schemes: result.schemes.map((scheme) => ({
      schemeId: scheme.schemeId,
      name: scheme.name,
      benefitAmount: scheme.benefitAmount,
      benefitType: scheme.benefitType,
      applyMode: scheme.applyMode,
      applyUrl: scheme.applyUrl,
      documents: scheme.documents,
      officeAddress: scheme.officeAddress,
    })),
  };
}

async function kioskLogin(req, res) {
  const kioskCode = String(req.body?.kioskCode || "").trim().toUpperCase();

  if (!/^[A-Z0-9]{8}$/.test(kioskCode)) {
    return res.status(400).json({ message: "kioskCode must be an 8-character code" });
  }

  const kiosk = await resolveKiosk(kioskCode);
  if (!kiosk) {
    return res.status(401).json({ message: "Invalid kiosk code" });
  }

  const jwtSecret = getRequiredEnv("JWT_SECRET");
  const token = jwt.sign(
    {
      kioskId: kiosk.id,
      role: "kiosk",
    },
    jwtSecret,
    { expiresIn: KIOSK_JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    kioskId: kiosk.id,
    kioskName: kiosk.name,
    role: "kiosk",
  });
}

async function kioskMatch(req, res) {
  const profile = buildMatchProfile(req.body || {});
  const validationError = validateMatchProfile(profile);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const result = await getMatchingSchemes(profile);
  await Promise.all([
    recordMatchAnalytics({
      userId: null,
      sessionType: "kiosk",
      state: profile.state,
      occupation: profile.occupation,
      matchCount: result.count,
      nearMissCount: result.nearMissCount,
      schemeIds: result.schemes.map((scheme) => scheme.schemeId),
      lang: String(req.body?.lang || "").trim().toLowerCase().slice(0, 5) || null,
    }),
    recordKioskUsage(req.user.id),
  ]);

  return res.json({
    ...result,
    pdfData: buildPdfReadyData(req.user.id, profile, result),
  });
}

async function kioskPdfDownload(req, res) {
  await recordKioskPdfDownloadEvent(req.user.id);
  return res.json({ ok: true });
}

module.exports = {
  buildPdfReadyData,
  kioskLogin,
  kioskPdfDownload,
  kioskMatch,
};
