import { apiGet } from "./api";
import {
  formatBenefitAmount,
  isSchemeVisibleNow,
  normalizeMinistry,
  normalizeText,
  toSentenceCase,
} from "./schemeText";

function hasMeaningfulText(value) {
  return Boolean(normalizeText(value, ""));
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function buildEligibilityItems(eligibility = {}) {
  const items = [];

  if (Array.isArray(eligibility.occupation) && eligibility.occupation.length > 0) {
    items.push(`For ${eligibility.occupation.map(toSentenceCase).join(", ")} applicants`);
  }

  if (Array.isArray(eligibility.beneficiaryType) && eligibility.beneficiaryType.length > 0) {
    items.push(`Beneficiary type: ${eligibility.beneficiaryType.map(toSentenceCase).join(", ")}`);
  }

  if (Array.isArray(eligibility.caste) && eligibility.caste.length > 0) {
    items.push(`Category: ${eligibility.caste.map((value) => value.toUpperCase()).join(", ")}`);
  }

  if (Array.isArray(eligibility.gender) && eligibility.gender.length > 0) {
    items.push(`Gender: ${eligibility.gender.map(toSentenceCase).join(", ")}`);
  }

  if (typeof eligibility.maxAnnualIncome === "number") {
    items.push(`Annual income up to ${formatBenefitAmount(eligibility.maxAnnualIncome)}`);
  }

  if (typeof eligibility.minAge === "number" || typeof eligibility.maxAge === "number") {
    const minAge = typeof eligibility.minAge === "number" ? eligibility.minAge : null;
    const maxAge = typeof eligibility.maxAge === "number" ? eligibility.maxAge : null;

    if (minAge != null && maxAge != null) {
      items.push(`Age ${minAge} to ${maxAge} years`);
    } else if (minAge != null) {
      items.push(`Age ${minAge}+ years`);
    } else if (maxAge != null) {
      items.push(`Age up to ${maxAge} years`);
    }
  }

  if (eligibility.landOwned && typeof eligibility.landOwned.max === "number") {
    items.push(
      `Land owned: ${eligibility.landOwned.min || 0} to ${eligibility.landOwned.max} acres`
    );
  }

  if (typeof eligibility.minDisabilityPct === "number") {
    items.push(`Disability certificate ${eligibility.minDisabilityPct}% or above`);
  }

  if (eligibility.minEducation) {
    items.push(`Minimum education: ${toSentenceCase(eligibility.minEducation)}`);
  }

  if (eligibility.mustBeStudent === true) {
    items.push("Only for current students");
  }

  if (eligibility.mustHaveBankAccount === true) {
    items.push("Bank account required");
  }

  if (eligibility.mustHaveAadhaar === true) {
    items.push("Aadhaar required");
  }

  return items;
}

export async function fetchSchemeDetail(schemeId) {
  let scheme;

  try {
    scheme = await apiGet(`/api/schemes/${schemeId}`);
  } catch (error) {
    if (error?.status === 404) {
      throw new Error("This scheme is no longer open for applications.");
    }

    throw error;
  }

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
    applyUrlFinal: normalizeText(scheme.applyUrlFinal, ""),
    applyUrlRedirect: normalizeText(scheme.applyUrlRedirect, ""),
    applyUrlStatus: normalizeText(scheme.applyUrlStatus, "unknown"),
    urlStatus: normalizeText(scheme.urlStatus, "unknown"),
    applyMode: normalizeText(scheme.applyMode, ""),
    officeAddress: {
      en: normalizeText(scheme.officeAddress?.en, ""),
      hi: normalizeText(scheme.officeAddress?.hi, ""),
    },
    deadline: {
      opens: formatDateLabel(scheme.effectiveDeadline?.opens || scheme.deadline?.opens),
      closes: formatDateLabel(scheme.effectiveDeadline?.closes || scheme.deadline?.closes),
      recurring: Boolean(
        scheme.effectiveDeadline?.recurring ?? scheme.deadline?.recurring
      ),
    },
    eligibilityItems: buildEligibilityItems(scheme.eligibility),
    tags: (scheme.tags || []).map((tag) => normalizeText(tag, "")).filter(Boolean),
    documents: (scheme.documents || [])
      .map((doc) => ({
        en: normalizeText(doc?.en, ""),
        hi: normalizeText(doc?.hi, ""),
      }))
      .filter((doc) => hasMeaningfulText(doc.en) || hasMeaningfulText(doc.hi)),
  };
}
