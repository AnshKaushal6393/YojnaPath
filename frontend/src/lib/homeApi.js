import { apiGet } from "./api";
import { buildProfilePayload, fetchSavedProfile, isProfileReadyForMatching } from "./onboardApi";
import { fetchResultsData } from "./resultsApi";
import {
  formatBenefitAmount,
  hasDevanagariText,
  isSchemeVisibleNow,
  isMeaningfullyDifferent,
  normalizeMinistry,
  normalizeText,
  toSentenceCase,
} from "./schemeText";

const TOTAL_MATCH_RULES = 14;

function toMatchPercent(score, totalCriteria) {
  const hasValidScore = typeof score === "number" && !Number.isNaN(score);
  const hasValidCriteria =
    typeof totalCriteria === "number" && !Number.isNaN(totalCriteria) && totalCriteria > 0;

  if (!hasValidScore || !hasValidCriteria) {
    return null;
  }

  return Math.round(72 + Math.min(totalCriteria / TOTAL_MATCH_RULES, 1) * 28);
}

function pickFeaturedSchemeIds(schemes, limit = 6) {
  const visibleSchemes = schemes.filter((scheme) => isSchemeVisibleNow(scheme));
  const selected = [];
  const seenCategories = new Set();

  for (const scheme of visibleSchemes) {
    const primaryCategory = scheme.categories?.[0];

    if (!primaryCategory || seenCategories.has(primaryCategory)) {
      continue;
    }

    selected.push(scheme.schemeId);
    seenCategories.add(primaryCategory);

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const scheme of visibleSchemes) {
    if (!selected.includes(scheme.schemeId)) {
      selected.push(scheme.schemeId);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function mapSchemeDetailToCard(scheme) {
  const category = scheme.categories?.[0] || "agriculture";
  const schemeName = normalizeText(scheme.name?.en, "Scheme");
  const schemeNameHi = normalizeText(scheme.name?.hi, normalizeText(scheme.name?.en, "योजना"));
  const description = normalizeText(
    scheme.description?.en,
    "Scheme details are available from the live backend service."
  );
  const descriptionHi = normalizeText(
    scheme.description?.hi,
    "योजना का विवरण लाइव बैकएंड सेवा से उपलब्ध है।"
  );

  return {
    id: scheme.schemeId,
    schemeName,
    schemeNameHi:
      hasDevanagariText(schemeNameHi) && isMeaningfullyDifferent(schemeNameHi, schemeName)
        ? schemeNameHi
        : "",
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    category,
    state: scheme.state || "central",
    ministry: normalizeMinistry(scheme.ministry, category, schemeName),
    matchedCriteria:
      typeof scheme.matchScore === "number" && !Number.isNaN(scheme.matchScore)
        ? scheme.matchScore
        : null,
    totalCriteria:
      typeof scheme.totalCriteria === "number" && !Number.isNaN(scheme.totalCriteria)
        ? scheme.totalCriteria
        : null,
    matchScorePercent: toMatchPercent(scheme.matchScore, scheme.totalCriteria),
    matchStatus: "matched",
    description,
    descriptionHi:
      hasDevanagariText(descriptionHi) && isMeaningfullyDifferent(descriptionHi, description)
        ? descriptionHi
        : "",
  };
}

function buildCategoryHighlights(schemes, limit = 6) {
  const counts = new Map();

  schemes
    .filter((scheme) => isSchemeVisibleNow(scheme))
    .forEach((scheme) => {
      const category = String(scheme.categories?.[0] || "agriculture").toLowerCase();
      counts.set(category, (counts.get(category) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({
      key,
      count,
      label: toSentenceCase(key),
    }));
}

function buildTopSchemesQuery(profile) {
  const payload = buildProfilePayload(profile.selectedUserType, profile.formState);
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  return params.toString();
}

export async function fetchHomeData(profileId) {
  const [health, impact, savedProfile, schemes] = await Promise.all([
    apiGet("/api/health"),
    apiGet("/api/impact"),
    fetchSavedProfile(profileId),
    apiGet("/api/schemes/all"),
  ]);

  if (isProfileReadyForMatching(savedProfile)) {
    const query = buildTopSchemesQuery(savedProfile);
    const [topSchemes, personalizedResults] = await Promise.all([
      apiGet(`/api/schemes/top/${encodeURIComponent(savedProfile.selectedUserType)}?${query}`),
      fetchResultsData(profileId),
    ]);

    return {
      health,
      impact,
      categoryHighlights: buildCategoryHighlights(schemes),
      recentMatches:
        (topSchemes?.schemes || [])
          .filter((scheme) => isSchemeVisibleNow(scheme))
          .map(mapSchemeDetailToCard)
          .slice(0, 6) || [],
      urgent: (personalizedResults.urgent || []).slice(0, 3),
    };
  }

  const recentIds = pickFeaturedSchemeIds(schemes, 6);
  const recentSchemeDetails = await Promise.all(
    recentIds.map((schemeId) => apiGet(`/api/schemes/${schemeId}`))
  );

  return {
    health,
    impact,
    categoryHighlights: buildCategoryHighlights(schemes),
    urgent: [],
    recentMatches: recentSchemeDetails
      .filter((scheme) => isSchemeVisibleNow(scheme))
      .map(mapSchemeDetailToCard),
  };
}
