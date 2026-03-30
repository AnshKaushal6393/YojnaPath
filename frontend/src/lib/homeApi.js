import { apiGet } from "./api";

function formatBenefitAmount(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "Benefit available";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value));

  return `₹${formatted}`;
}

function mapSchemeDetailToCard(scheme) {
  const category = scheme.categories?.[0] || "agriculture";

  return {
    id: scheme.schemeId,
    schemeName: scheme.name?.en || "Scheme",
    schemeNameHi: scheme.name?.hi || scheme.name?.en || "योजना",
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    category,
    ministry: scheme.ministry || "Government of India",
    matchStatus: "matched",
    description:
      scheme.description?.en || "Scheme details are available from the live backend service.",
    descriptionHi:
      scheme.description?.hi || "योजना का विवरण लाइव बैकएंड सेवा से उपलब्ध है।",
  };
}

export async function fetchHomeData() {
  const [health, impact, schemes] = await Promise.all([
    apiGet("/api/health"),
    apiGet("/api/impact"),
    apiGet("/api/schemes/all"),
  ]);

  const recentIds = schemes.slice(0, 2).map((scheme) => scheme.schemeId);
  const recentSchemeDetails = await Promise.all(
    recentIds.map((schemeId) => apiGet(`/api/schemes/${schemeId}`))
  );

  return {
    health,
    impact,
    recentMatches: recentSchemeDetails.map(mapSchemeDetailToCard),
  };
}
