import { apiGet, apiPost } from "./api";
import { buildProfilePayload, fetchSavedProfile, isProfileReadyForMatching } from "./onboardApi";
import { getProfileDraft } from "./profileDraft";
import {
  formatBenefitAmount,
  hasDevanagariText,
  isSchemeVisibleNow,
  isMeaningfullyDifferent,
  normalizeMinistry,
  normalizeText,
  toSentenceCase,
} from "./schemeText";

const RESULTS_LIMIT = 200;
const NEAR_MISS_LIMIT = 12;
const TOTAL_MATCH_RULES = 14;

const RELEVANT_NEAR_MISS_CATEGORIES = {
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

function normalizeScope(value) {
  return String(value || "central").toLowerCase();
}

function toMatchPercent(score, totalCriteria, matchStatus = "matched") {
  const hasValidScore = typeof score === "number" && !Number.isNaN(score);
  const hasValidCriteria =
    typeof totalCriteria === "number" && !Number.isNaN(totalCriteria) && totalCriteria > 0;

  if (!hasValidScore || !hasValidCriteria) {
    if (matchStatus === "matched") {
      return 70;
    }

    if (matchStatus === "near-miss") {
      return 48;
    }

    return null;
  }

  const passedRatio = score / totalCriteria;
  const specificityRatio = Math.min(totalCriteria / TOTAL_MATCH_RULES, 1);

  if (matchStatus === "matched") {
    return Math.round(72 + specificityRatio * 28);
  }

  return Math.round(40 + passedRatio * 35 + specificityRatio * 10);
}

function mapSchemeToCard(scheme, matchStatus = "matched") {
  const schemeName = normalizeText(scheme.name?.en, "Scheme");
  const schemeNameHi = normalizeText(scheme.name?.hi, "");
  const description = normalizeText(
    scheme.description?.en,
    "Scheme details are available from the live backend service."
  );
  const descriptionHi = normalizeText(scheme.description?.hi, "");
  const category = String(scheme.categories?.[0] || "agriculture").toLowerCase();

  return {
    id: scheme.schemeId,
    schemeName,
    schemeNameHi:
      hasDevanagariText(schemeNameHi) && isMeaningfullyDifferent(schemeNameHi, schemeName)
        ? schemeNameHi
        : "",
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    category,
    categoryLabel: toSentenceCase(category),
    state: normalizeScope(scheme.state),
    ministry: normalizeMinistry(scheme.ministry, category, schemeName),
    description,
    descriptionHi:
      hasDevanagariText(descriptionHi) && isMeaningfullyDifferent(descriptionHi, description)
        ? descriptionHi
        : "",
    matchedCriteria:
      typeof scheme.matchScore === "number" && !Number.isNaN(scheme.matchScore)
        ? scheme.matchScore
        : null,
    totalCriteria:
      typeof scheme.totalCriteria === "number" && !Number.isNaN(scheme.totalCriteria)
        ? scheme.totalCriteria
        : null,
    matchScorePercent: toMatchPercent(scheme.matchScore, scheme.totalCriteria, matchStatus),
    matchStatus,
  };
}

function mapNearMissCard(scheme) {
  const base = mapSchemeToCard(scheme, "near-miss");
  const gapEn = normalizeText(
    scheme.missedCriterion?.en,
    "You are close, but one eligibility condition is not satisfied."
  );
  const gapHi = normalizeText(scheme.missedCriterion?.hi, "");

  return {
    ...base,
    gapLabel: gapEn,
    gapLabelHi:
      hasDevanagariText(gapHi) && isMeaningfullyDifferent(gapHi, gapEn) ? gapHi : "",
  };
}

function isRelevantSchemeForUserType(userType, scheme) {
  const allowedCategories = RELEVANT_NEAR_MISS_CATEGORIES[userType] || [];

  if (!allowedCategories.length) {
    return true;
  }

  return allowedCategories.includes(scheme.category);
}

export async function fetchResultsData(profileId) {
  const savedProfile = await fetchSavedProfile(profileId);
  const draftProfile = getProfileDraft(profileId);
  const activeProfile = isProfileReadyForMatching(savedProfile)
    ? savedProfile
    : isProfileReadyForMatching(draftProfile)
      ? draftProfile
      : null;

  if (!activeProfile) {
    return {
      profile: null,
      count: 0,
      schemes: [],
      nearMissCount: 0,
      nearMisses: [],
      urgent: [],
    };
  }

  const payload = buildProfilePayload(activeProfile.selectedUserType, activeProfile.formState);
  const [matches, urgent] = await Promise.all([
    apiPost("/api/schemes/match", {
      ...payload,
      limitMatches: RESULTS_LIMIT,
      limitNearMisses: NEAR_MISS_LIMIT,
    }),
    apiGet(
      `/api/schemes/urgent?${new URLSearchParams({
        state: payload.state,
        occupation: payload.occupation,
        annualIncome: String(payload.annualIncome ?? ""),
        gender: String(payload.gender ?? ""),
        age: String(payload.age ?? ""),
        landAcres: String(payload.landAcres ?? ""),
        disabilityPct: String(payload.disabilityPct ?? ""),
        isStudent: String(payload.isStudent ?? false),
      }).toString()}`
    ),
  ]);

  const matchedSchemes = (matches.schemes || [])
    .filter((scheme) => isSchemeVisibleNow(scheme))
    .map((scheme) => mapSchemeToCard(scheme, "matched"))
    .filter((scheme) => isRelevantSchemeForUserType(activeProfile.selectedUserType, scheme));

  const nearMissSchemes = (matches.nearMisses || [])
    .filter((scheme) => isSchemeVisibleNow(scheme))
    .map(mapNearMissCard)
    .filter((scheme) => isRelevantSchemeForUserType(activeProfile.selectedUserType, scheme));

  return {
    profile: activeProfile,
    count: matchedSchemes.length,
    schemes: matchedSchemes,
    nearMissCount: nearMissSchemes.length,
    nearMisses: nearMissSchemes,
    urgent: (urgent || [])
      .filter((scheme) => isSchemeVisibleNow(scheme))
      .map((scheme) => mapSchemeToCard(scheme, "matched")),
  };
}
