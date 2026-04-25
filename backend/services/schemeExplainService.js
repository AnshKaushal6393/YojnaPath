const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { attachDeadlineInfo, isSchemeOpenForApplications } = require("./deadlineTrackerService");

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function formatBenefitAmount(value) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function toSentenceCase(value) {
  return String(value ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildEligibilitySummary(eligibility = {}) {
  const items = [];

  if (Array.isArray(eligibility.occupation) && eligibility.occupation.length) {
    items.push(`For ${eligibility.occupation.map(toSentenceCase).join(", ")}`);
  }

  if (typeof eligibility.maxAnnualIncome === "number") {
    items.push(`Income up to ${formatBenefitAmount(eligibility.maxAnnualIncome)}`);
  }

  if (typeof eligibility.minAge === "number" || typeof eligibility.maxAge === "number") {
    const minAge = typeof eligibility.minAge === "number" ? eligibility.minAge : null;
    const maxAge = typeof eligibility.maxAge === "number" ? eligibility.maxAge : null;

    if (minAge != null && maxAge != null) {
      items.push(`Age ${minAge} to ${maxAge}`);
    } else if (minAge != null) {
      items.push(`Age ${minAge}+`);
    } else if (maxAge != null) {
      items.push(`Age up to ${maxAge}`);
    }
  }

  if (Array.isArray(eligibility.caste) && eligibility.caste.length) {
    items.push(`Category ${eligibility.caste.map((item) => String(item).toUpperCase()).join(", ")}`);
  }

  if (Array.isArray(eligibility.gender) && eligibility.gender.length) {
    items.push(`Gender ${eligibility.gender.map(toSentenceCase).join(", ")}`);
  }

  if (eligibility.mustBeStudent === true) {
    items.push("Only for current students");
  }

  return items.slice(0, 5);
}

function buildExplainPrompt(scheme) {
  const eligibilityItems = buildEligibilitySummary(scheme.eligibility);
  const documents = (scheme.documents || [])
    .map((document) => normalizeOptionalString(document?.hi || document?.en))
    .filter(Boolean)
    .slice(0, 6);
  const benefitAmount = formatBenefitAmount(scheme.benefitAmount);
  const deadline = normalizeOptionalString(
    scheme.effectiveDeadline?.closes || scheme.deadline?.closes
  );

  return [
    "Aap ek Hindi government schemes guide ho.",
    "Is scheme ko bahut simple Hindi mein samjhao.",
    "Heavy jargon mat use karo.",
    "English words kam rakho, lekin zaroori proper nouns same rehne do.",
    "Output 4 short sections mein do:",
    "1. Ye scheme kya hai",
    "2. Kisko mil sakti hai",
    "3. Kitna fayda hai",
    "4. User ko ab kya karna chahiye",
    "Har line practical aur seedhi ho.",
    "Agar exact info missing ho to clearly bolo ki user ko official details check karni chahiye.",
    "",
    `Scheme name: ${scheme.name?.en || "Scheme"}`,
    `Ministry: ${normalizeOptionalString(scheme.ministry) || "Not specified"}`,
    `State: ${normalizeOptionalString(scheme.state) || "central"}`,
    `Categories: ${Array.isArray(scheme.categories) ? scheme.categories.map(toSentenceCase).join(", ") : "Not specified"}`,
    `Benefit amount: ${benefitAmount || "Not clearly specified"}`,
    `Benefit type: ${normalizeOptionalString(scheme.benefitType) || "Not specified"}`,
    `Apply mode: ${normalizeOptionalString(scheme.applyMode) || "Not specified"}`,
    `Deadline: ${deadline || "No fixed deadline found"}`,
    `Description: ${normalizeOptionalString(scheme.description?.en) || "No description available"}`,
    `Eligibility: ${eligibilityItems.length ? eligibilityItems.join("; ") : "No clear eligibility summary available"}`,
    `Documents: ${documents.length ? documents.join(", ") : "Documents not clearly listed"}`,
  ].join("\n");
}

function extractTextContent(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((item) => typeof item?.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

async function explainSchemeInHindi(schemeId) {
  if (!isMongoReady()) {
    return null;
  }

  const normalizedId = normalizeOptionalString(schemeId)?.toUpperCase();
  if (!normalizedId) {
    return null;
  }

  const scheme = await Scheme.findOne({ schemeId: normalizedId, active: true }).lean();
  if (!scheme || !isSchemeOpenForApplications(scheme)) {
    return null;
  }

  const apiKey =
    normalizeOptionalString(process.env.GEMINI_API_KEY) ||
    normalizeOptionalString(process.env.GOOGLE_API_KEY);
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured on the backend.");
    error.status = 503;
    throw error;
  }

  const model = normalizeOptionalString(process.env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildExplainPrompt(attachDeadlineInfo(scheme)),
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || "Gemini explanation failed");
    error.status = response.status;
    throw error;
  }

  return {
    schemeId: normalizedId,
    model,
    explanation: extractTextContent(payload),
  };
}

module.exports = {
  explainSchemeInHindi,
};
