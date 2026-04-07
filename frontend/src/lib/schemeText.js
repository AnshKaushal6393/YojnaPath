const TEXT_REPLACEMENTS = [
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&nbsp;", " "],
  ["&amp;quot;", '"'],
  ["&amp;#39;", "'"],
  ["&amp;amp;", "&"],
  ["Ã¢â€šÂ¹", "₹"],
  ["â‚¹", "₹"],
  ["Ã¢â‚¬â€œ", "-"],
  ["Ã¢â‚¬â€", "-"],
];

function decodeUtf8Mojibake(value) {
  try {
    const bytes = Uint8Array.from([...String(value)].map((char) => char.charCodeAt(0)));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return String(value);
  }
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function applyReplacementTable(value) {
  return TEXT_REPLACEMENTS.reduce(
    (text, [from, to]) => text.split(from).join(to),
    String(value ?? "")
  );
}

function stripMarkdownArtifacts(value) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/<br\s*\/?>/gi, " ");
}

export function normalizeText(value, fallback = "") {
  const raw = String(value ?? fallback).trim();

  if (!raw) {
    return fallback;
  }

  let text = raw;

  for (let index = 0; index < 3; index += 1) {
    let current = text;

    if (
      /[ÃÂâ€¢â‚¬]/.test(current) ||
      current.includes("Ã¢â€šÂ¹") ||
      current.includes("Ã¢â‚¬â€œ") ||
      current.includes("Ã¢â‚¬â€")
    ) {
      current = decodeUtf8Mojibake(current).trim() || current;
    }

    current = applyReplacementTable(current);
    current = stripMarkdownArtifacts(current);
    current = current.replace(/Ãƒ|Ã‚|Â|ï¿½/g, "");

    if (current === text) {
      break;
    }

    text = current;
  }

  return normalizeWhitespace(text) || fallback;
}

export function hasDevanagariText(value) {
  return /[\u0900-\u097f]/.test(String(value ?? ""));
}

export function isMeaningfullyDifferent(primary, secondary) {
  const a = normalizeWhitespace(primary).toLowerCase();
  const b = normalizeWhitespace(secondary).toLowerCase();
  return Boolean(a && b && a !== b);
}

export function toSentenceCase(value) {
  return String(value ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatBenefitAmount(value) {
  const numericValue = Number(value);

  if (value == null || Number.isNaN(numericValue)) {
    return "Benefit available";
  }

  if (numericValue <= 0 || numericValue < 100) {
    return "Benefit available";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(numericValue);

  return `₹${formatted}`;
}

export function isSchemeVisibleNow(scheme, now = new Date()) {
  if (!scheme || scheme.active === false) {
    return false;
  }

  if (typeof scheme.effectiveDeadline?.isOpen === "boolean") {
    return scheme.effectiveDeadline.isOpen;
  }

  const effectiveClosesAtRaw = scheme.effectiveDeadline?.closes;
  if (effectiveClosesAtRaw) {
    const effectiveClosesAt = new Date(effectiveClosesAtRaw);
    if (!Number.isNaN(effectiveClosesAt.getTime())) {
      return effectiveClosesAt.getTime() >= now.getTime();
    }
  }

  const closesAtRaw = scheme.deadline?.closes;
  if (!closesAtRaw) {
    return true;
  }

  const closesAt = new Date(closesAtRaw);
  if (Number.isNaN(closesAt.getTime())) {
    return true;
  }

  return closesAt.getTime() >= now.getTime();
}

export function normalizeMinistry(value, categoryLabel = "", schemeName = "") {
  const raw = normalizeText(value, "");

  if (!raw) {
    return "";
  }

  const looksObjectLike =
    (/^\s*[\[{].*[\]}]\s*$/.test(raw) || (raw.includes("{") && raw.includes("}"))) &&
    /\b(value|label)\b/i.test(raw);

  let nextValue = raw;
  if (looksObjectLike) {
    const labelOnlyMatch =
      raw.match(/['"]label['"]\s*:\s*['"]([^'"]+)['"]/i) ||
      raw.match(/\blabel\b\s*:\s*([^,}]+)/i);

    if (labelOnlyMatch) {
      const cleanedLabel = normalizeText(labelOnlyMatch[1], "")
        .replace(/^['"]|['"]$/g, "")
        .trim();
      if (cleanedLabel) {
        nextValue = cleanedLabel;
      }
    }
  }

  const normalizedRaw = normalizeText(nextValue, "");
  const labelMatch =
    normalizedRaw.match(/["']label["']\s*:\s*["']([^"']+)["']/i) ||
    normalizedRaw.match(/\blabel\s*:\s*([^,}]+)/i);

  const extracted = labelMatch ? normalizeText(labelMatch[1], normalizedRaw) : normalizedRaw;
  const ministry = extracted.replace(/^[{[]|[}\]]$/g, "").trim();
  const lowered = ministry.toLowerCase();

  if (!ministry || lowered === "unknown" || lowered === "null" || lowered === "undefined") {
    return "";
  }

  if (/[{}[\]]/.test(ministry) || /\bvalue\b/i.test(ministry) || /\blabel\b/i.test(ministry)) {
    return "";
  }

  if (
    lowered === String(categoryLabel ?? "").toLowerCase() ||
    lowered === String(schemeName ?? "").toLowerCase()
  ) {
    return "";
  }

  return ministry;
}
