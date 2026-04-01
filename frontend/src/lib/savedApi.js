import { apiDelete, apiGet, apiPost } from "./api";
import {
  formatBenefitAmount,
  isSchemeVisibleNow,
  normalizeMinistry,
  normalizeText,
  toSentenceCase,
} from "./schemeText";

function buildSavedSchemeModel(item) {
  const scheme = item.scheme || null;
  const category = scheme?.categories?.[0] || "agriculture";
  const schemeName = normalizeText(scheme?.name?.en, item.schemeId);

  return {
    id: item.schemeId,
    savedAt: item.savedAt,
    notes: normalizeText(item.notes, ""),
    active: Boolean(item.active),
    isVisible: isSchemeVisibleNow(scheme),
    isDiscontinued: !item.active || !scheme || !isSchemeVisibleNow(scheme),
    schemeName,
    schemeNameHi: normalizeText(scheme?.name?.hi, ""),
    description: normalizeText(scheme?.description?.en, "Saved scheme"),
    descriptionHi: normalizeText(scheme?.description?.hi, ""),
    ministry: normalizeMinistry(scheme?.ministry, category, schemeName),
    category,
    categoryLabel: toSentenceCase(category),
    state: scheme?.state || "central",
    benefitAmount: formatBenefitAmount(scheme?.benefitAmount),
  };
}

export async function fetchSavedSchemes() {
  const response = await apiGet("/api/saved");
  return response.map(buildSavedSchemeModel);
}

export function saveScheme(schemeId) {
  return apiPost(`/api/saved/${schemeId}`, {});
}

export function removeSavedScheme(schemeId) {
  return apiDelete(`/api/saved/${schemeId}`);
}
