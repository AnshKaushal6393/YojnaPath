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

export function normalizeText(value, fallback = "") {
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

function formatBenefitAmount(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "Benefit available";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value));

  return `₹${formatted}`;
}

function hasMeaningfulText(value) {
  return Boolean(normalizeText(value, ""));
}

export async function fetchSchemeDetail(schemeId) {
  const scheme = await apiGet(`/api/schemes/${schemeId}`);

  return {
    id: scheme.schemeId,
    schemeName: normalizeText(scheme.name?.en, "Scheme"),
    schemeNameHi: normalizeText(scheme.name?.hi, ""),
    description: normalizeText(scheme.description?.en, ""),
    descriptionHi: normalizeText(scheme.description?.hi, ""),
    ministry: normalizeText(scheme.ministry, ""),
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
