import { apiPost } from "./api";
import { formatBenefitAmount, normalizeText, toSentenceCase } from "./schemeText";

const KIOSK_TOKEN_KEY = "yojnapath_kiosk_token";
const KIOSK_ID_KEY = "yojnapath_kiosk_id";
const TOTAL_MATCH_RULES = 14;
const RELEVANT_KIOSK_CATEGORIES = {
  farmer: ["agriculture", "finance", "housing", "labour"],
  business: ["finance", "skill_and_employment", "housing", "labour"],
  women: ["women", "health", "education", "finance", "housing"],
  student: ["education", "finance", "skill_and_employment"],
  worker: ["labour", "finance", "housing", "skill_and_employment", "health"],
  health: ["health"],
  housing: ["housing", "finance"],
  senior: ["senior", "health", "finance"],
  disability: ["disability", "health", "education", "finance", "housing"],
};

function normalizeScheme(scheme) {
  const category = String(scheme.categories?.[0] || "agriculture").toLowerCase();
  const matchScorePercent =
    typeof scheme.matchScore === "number" &&
    typeof scheme.totalCriteria === "number" &&
    scheme.totalCriteria > 0
      ? Math.round(72 + Math.min(scheme.totalCriteria / TOTAL_MATCH_RULES, 1) * 28)
      : 70;

  return {
    id: scheme.schemeId,
    schemeName: normalizeText(scheme.name?.en, "Scheme"),
    schemeNameHi: normalizeText(scheme.name?.hi, ""),
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    category,
    categoryLabel: toSentenceCase(category),
    state: scheme.state || "central",
    ministry: normalizeText(scheme.ministry, ""),
    description: normalizeText(
      scheme.description?.en,
      "Scheme details are available in the kiosk summary."
    ),
    descriptionHi: normalizeText(scheme.description?.hi, ""),
    matchScorePercent,
    matchStatus: "matched",
  };
}

function isRelevantSchemeForOccupation(occupation, scheme) {
  const allowedCategories = RELEVANT_KIOSK_CATEGORIES[String(occupation || "").toLowerCase()] || [];

  if (!allowedCategories.length) {
    return true;
  }

  return allowedCategories.includes(scheme.category);
}

export function getKioskToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(KIOSK_TOKEN_KEY) || "";
}

export function getKioskId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(KIOSK_ID_KEY) || "";
}

export function clearKioskSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(KIOSK_TOKEN_KEY);
  window.localStorage.removeItem(KIOSK_ID_KEY);
}

export async function loginKiosk(kioskCode) {
  const payload = await apiPost("/api/kiosk/login", { kioskCode }, { token: "" });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(KIOSK_TOKEN_KEY, payload.token || "");
    window.localStorage.setItem(KIOSK_ID_KEY, payload.kioskId || "");
  }

  return payload;
}

export async function fetchKioskMatches(profile) {
  const token = getKioskToken();
  if (!token) {
    throw new Error("Kiosk session expired. Enter kiosk code again.");
  }

  const payload = await apiPost("/api/kiosk/match", profile, { token });
  const schemes = (payload.schemes || [])
    .map(normalizeScheme)
    .filter((scheme) => isRelevantSchemeForOccupation(profile.occupation, scheme));

  return {
    kioskId: getKioskId(),
    count: schemes.length,
    nearMissCount: payload.nearMissCount || 0,
    totalScanned: payload.totalScanned || 0,
    schemes,
    pdfData: payload.pdfData || null,
  };
}

export async function recordKioskPdfDownload() {
  const token = getKioskToken();
  if (!token) {
    return null;
  }

  return apiPost("/api/kiosk/pdf-download", {}, { token });
}
