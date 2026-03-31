import { apiGet } from "./api";
import {
  formatBenefitAmount,
  isSchemeVisibleNow,
  normalizeMinistry,
  normalizeText,
} from "./schemeText";

function hasMeaningfulText(value) {
  return Boolean(normalizeText(value, ""));
}

export async function fetchSchemeDetail(schemeId) {
  const scheme = await apiGet(`/api/schemes/${schemeId}`);

  if (!isSchemeVisibleNow(scheme)) {
    throw new Error("This scheme is no longer open for applications.");
  }

  const schemeName = normalizeText(scheme.name?.en, "Scheme");

  return {
    id: scheme.schemeId,
    schemeName,
    schemeNameHi: normalizeText(scheme.name?.hi, ""),
    description: normalizeText(scheme.description?.en, ""),
    descriptionHi: normalizeText(scheme.description?.hi, ""),
    ministry: normalizeMinistry(
      scheme.ministry,
      scheme.categories?.[0] || "agriculture",
      schemeName
    ),
    category: scheme.categories?.[0] || "agriculture",
    allCategories: scheme.categories || [],
    state: scheme.state || "central",
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    benefitType: normalizeText(scheme.benefitType, ""),
    applyUrl: normalizeText(scheme.applyUrl, ""),
    applyMode: normalizeText(scheme.applyMode, ""),
    documents: (scheme.documents || [])
      .map((doc) => ({
        en: normalizeText(doc?.en, ""),
        hi: normalizeText(doc?.hi, ""),
      }))
      .filter((doc) => hasMeaningfulText(doc.en) || hasMeaningfulText(doc.hi)),
  };
}
