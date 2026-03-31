import { apiGet } from "./api";

const HTML_ENTITY_MAP = {
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "â‚¹": "₹",
  "â€™": "'",
  "â€“": "–",
  "â€œ": '"',
  "â€": '"',
};

function decodeUtf8Mojibake(value) {
  try {
    const bytes = Uint8Array.from(
      [...String(value)].map((char) => char.charCodeAt(0))
    );
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return String(value);
  }
}

function decodeHtmlEntities(value) {
  return Object.entries(HTML_ENTITY_MAP).reduce(
    (text, [entity, replacement]) => text.split(entity).join(replacement),
    String(value)
  );
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeText(value, fallback = "") {
  const raw = String(value ?? fallback).trim();

  if (!raw) {
    return fallback;
  }

  let text = raw;

  if (
    /[Ãàâ][\u0080-\u00ff]?/.test(text) ||
    text.includes("â‚") ||
    text.includes("à¤") ||
    text.includes("Ãƒ")
  ) {
    text = decodeUtf8Mojibake(text).trim() || text;
  }

  text = decodeHtmlEntities(text).replace(/�/g, "");
  return normalizeWhitespace(text) || fallback;
}

function hasDevanagariText(value) {
  return /[\u0900-\u097f]/.test(String(value ?? ""));
}

function isMeaningfullyDifferent(primary, secondary) {
  const a = normalizeWhitespace(primary).toLowerCase();
  const b = normalizeWhitespace(secondary).toLowerCase();

  if (!a || !b) {
    return false;
  }

  return a !== b;
}

function formatBenefitAmount(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "Benefit available";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value));

  return `₹${formatted}`;
}

function pickFeaturedSchemeIds(schemes, limit = 6) {
  const selected = [];
  const seenCategories = new Set();

  for (const scheme of schemes) {
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

  for (const scheme of schemes) {
    if (!selected.includes(scheme.schemeId)) {
      selected.push(scheme.schemeId);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function normalizeMinistry(value, categoryLabel, schemeName) {
  const ministry = normalizeText(value, "");

  if (!ministry || ministry.toLowerCase() === "unknown") {
    return "";
  }

  if (
    ministry.toLowerCase() === String(categoryLabel ?? "").toLowerCase() ||
    ministry.toLowerCase() === String(schemeName ?? "").toLowerCase()
  ) {
    return "";
  }

  return ministry;
}

function mapSchemeDetailToCard(scheme) {
  const category = scheme.categories?.[0] || "agriculture";
  const schemeName = normalizeText(scheme.name?.en, "Scheme");
  const schemeNameHi = normalizeText(
    scheme.name?.hi,
    normalizeText(scheme.name?.en, "योजना")
  );
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
  const [health, impact, schemes] = await Promise.all([
    apiGet("/api/health"),
    apiGet("/api/impact"),
    apiGet("/api/schemes/all"),
  ]);

  const recentIds = pickFeaturedSchemeIds(schemes, 6);
  const recentSchemeDetails = await Promise.all(
    recentIds.map((schemeId) => apiGet(`/api/schemes/${schemeId}`))
  );

  return {
    health,
    impact,
    recentMatches: recentSchemeDetails.map(mapSchemeDetailToCard),
  };
}
