import { apiGet } from "./api";
import { fetchSavedProfile } from "./onboardApi";
import { fetchResultsData } from "./resultsApi";
import {
  formatBenefitAmount,
  hasDevanagariText,
  isSchemeVisibleNow,
  isMeaningfullyDifferent,
  normalizeMinistry,
  normalizeText,
} from "./schemeText";

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
    matchStatus: "matched",
    description,
    descriptionHi:
      hasDevanagariText(descriptionHi) && isMeaningfullyDifferent(descriptionHi, description)
        ? descriptionHi
        : "",
  };
}

export async function fetchHomeData() {
  const [health, impact, savedProfile, schemes] = await Promise.all([
    apiGet("/api/health"),
    apiGet("/api/impact"),
    fetchSavedProfile(),
    apiGet("/api/schemes/all"),
  ]);

  if (savedProfile) {
    const personalizedResults = await fetchResultsData();

    return {
      health,
      impact,
      recentMatches: (personalizedResults.schemes || []).slice(0, 6),
    };
  }

  const recentIds = pickFeaturedSchemeIds(schemes, 6);
  const recentSchemeDetails = await Promise.all(
    recentIds.map((schemeId) => apiGet(`/api/schemes/${schemeId}`))
  );

  return {
    health,
    impact,
    recentMatches: recentSchemeDetails
      .filter((scheme) => isSchemeVisibleNow(scheme))
      .map(mapSchemeDetailToCard),
  };
}
