const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { Scheme } = require("../models/Scheme");

const DEFAULT_SOURCE_ORDER = [
  "huggingface",
  "puppeteer",
  "datagov",
  "apisetu",
  "manual",
];

const DATA_DIR = path.join(__dirname, "data");

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${filePath}`);
  }

  return parsed;
}

function ensureLocalizedText(value, fallback = "") {
  if (value && typeof value === "object" && value.en && value.hi) {
    return {
      en: String(value.en).trim(),
      hi: String(value.hi).trim(),
    };
  }

  const text = String(value ?? fallback).trim();
  return { en: text, hi: text };
}

function ensureLocalizedList(items = []) {
  return items.map((item) => ensureLocalizedText(item));
}

function parseLakhValue(rawNumber) {
  return parseFloat(rawNumber) * 100000;
}

function parseEligibility(text) {
  const eligibility = {};
  if (!text) {
    return eligibility;
  }

  const normalizedText = String(text).toLowerCase();

  const incomeMatch = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)\b/
  );
  if (incomeMatch) {
    eligibility.maxAnnualIncome = parseLakhValue(incomeMatch[1]);
  }

  const castes = [];
  if (/\bsc\b|scheduled caste/.test(normalizedText)) {
    castes.push("sc");
  }
  if (/\bst\b|scheduled tribe/.test(normalizedText)) {
    castes.push("st");
  }
  if (/\bobc\b|other backward/.test(normalizedText)) {
    castes.push("obc");
  }
  if (castes.length) {
    eligibility.caste = castes;
  }

  if (/\bfemale\b|\bwomen\b|\bwoman\b|\bgirl\b/.test(normalizedText)) {
    eligibility.gender = ["female"];
  } else if (/\bmale\b|\bmen\b|\bman\b|\bboy\b/.test(normalizedText)) {
    eligibility.gender = ["male"];
  }

  if (/\bfarmer\b|\bagricultural\b|\bkisan\b/.test(normalizedText)) {
    eligibility.occupation = ["farmer"];
  } else if (/\bshopkeeper\b|\btrader\b/.test(normalizedText)) {
    eligibility.occupation = ["shopkeeper"];
  } else if (/\bartisan\b|\bcraft\b|\bweaver\b/.test(normalizedText)) {
    eligibility.occupation = ["artisan"];
  } else if (/\bdaily wage\b|\blabour\b|\blabor\b/.test(normalizedText)) {
    eligibility.occupation = ["daily_wage"];
  } else if (/\bstudent\b|\bscholarship\b/.test(normalizedText)) {
    eligibility.occupation = ["student"];
    eligibility.mustBeStudent = true;
  } else if (/\bretired\b|\bsenior citizen\b|\bpensioner\b/.test(normalizedText)) {
    eligibility.occupation = ["retired"];
  } else if (/\bmigrant\b/.test(normalizedText)) {
    eligibility.occupation = ["migrant_worker"];
  }

  const minAgeMatch = normalizedText.match(
    /(?:above|over|minimum age|aged?)\s*(\d{1,2})|\b(\d{1,2})\s*\+/
  );
  if (minAgeMatch) {
    eligibility.minAge = parseInt(minAgeMatch[1] ?? minAgeMatch[2], 10);
  }

  const ageRangeMatch = normalizedText.match(/between\s*(\d{1,2})\s*and\s*(\d{1,2})\s*years?/);
  if (ageRangeMatch) {
    eligibility.minAge = parseInt(ageRangeMatch[1], 10);
    eligibility.maxAge = parseInt(ageRangeMatch[2], 10);
  }

  const maxAgeMatch = normalizedText.match(/below\s*(\d{1,2})\s*years?|under\s*(\d{1,2})/);
  if (maxAgeMatch) {
    eligibility.maxAge = parseInt(maxAgeMatch[1] ?? maxAgeMatch[2], 10);
  }

  const disabilityMatch = normalizedText.match(/(\d{1,3})\s*%\s*(?:disability|disabled)/);
  if (disabilityMatch) {
    eligibility.minDisabilityPct = parseInt(disabilityMatch[1], 10);
  } else if (/\bdisabled\b|\bdisability\b|\bdivyang\b/.test(normalizedText)) {
    eligibility.minDisabilityPct = 40;
  }

  const landMaxMatch = normalizedText.match(
    /(?:below|upto|up to|less than)\s*(\d+(?:\.\d+)?)\s*acres?/
  );
  if (landMaxMatch) {
    eligibility.landOwned = {
      min: 0,
      max: parseFloat(landMaxMatch[1]),
    };
  }

  const landRangeMatch = normalizedText.match(
    /between\s*(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)\s*acres?/
  );
  if (landRangeMatch) {
    eligibility.landOwned = {
      min: parseFloat(landRangeMatch[1]),
      max: parseFloat(landRangeMatch[2]),
    };
  }

  if (/\bstudent\b|\bstudying\b/.test(normalizedText)) {
    eligibility.mustBeStudent = true;
  }

  if (/\baadhaar\b/.test(normalizedText)) {
    eligibility.mustHaveAadhaar = true;
  }

  if (/\bbank account\b|\bbank passbook\b/.test(normalizedText)) {
    eligibility.mustHaveBankAccount = true;
  }

  return eligibility;
}

function normalizeEligibility(eligibility = {}) {
  const parsedEligibility =
    typeof eligibility === "string" ? parseEligibility(eligibility) : eligibility;

  return {
    occupation: Array.isArray(parsedEligibility.occupation) ? parsedEligibility.occupation : [],
    beneficiaryType: Array.isArray(parsedEligibility.beneficiaryType)
      ? parsedEligibility.beneficiaryType
      : [],
    caste: Array.isArray(parsedEligibility.caste) ? parsedEligibility.caste : [],
    gender: Array.isArray(parsedEligibility.gender) ? parsedEligibility.gender : [],
    maxAnnualIncome:
      parsedEligibility.maxAnnualIncome == null ? null : Number(parsedEligibility.maxAnnualIncome),
    minAge: parsedEligibility.minAge == null ? null : Number(parsedEligibility.minAge),
    maxAge: parsedEligibility.maxAge == null ? null : Number(parsedEligibility.maxAge),
    landOwned:
      parsedEligibility.landOwned == null
        ? null
        : {
            min: Number(parsedEligibility.landOwned.min ?? 0),
            max: Number(parsedEligibility.landOwned.max ?? 0),
          },
    minDisabilityPct:
      parsedEligibility.minDisabilityPct == null ? null : Number(parsedEligibility.minDisabilityPct),
    minEducation: parsedEligibility.minEducation ?? null,
    mustBeStudent:
      parsedEligibility.mustBeStudent == null ? null : Boolean(parsedEligibility.mustBeStudent),
    mustHaveBankAccount:
      parsedEligibility.mustHaveBankAccount == null
        ? null
        : Boolean(parsedEligibility.mustHaveBankAccount),
    mustHaveAadhaar:
      parsedEligibility.mustHaveAadhaar == null ? null : Boolean(parsedEligibility.mustHaveAadhaar),
  };
}

function normalizeDeadline(deadline = {}) {
  return {
    opens: deadline.opens ? new Date(deadline.opens) : null,
    closes: deadline.closes ? new Date(deadline.closes) : null,
    recurring: Boolean(deadline.recurring),
    recurringMonth: deadline.recurringMonth == null ? null : Number(deadline.recurringMonth),
    recurringDay: deadline.recurringDay == null ? null : Number(deadline.recurringDay),
  };
}

function normalizeScheme(rawScheme, sourceName) {
  if (!rawScheme?.schemeId) {
    throw new Error(`Scheme is missing schemeId from source "${sourceName}"`);
  }

  return {
    schemeId: String(rawScheme.schemeId).trim().toUpperCase(),
    name: ensureLocalizedText(rawScheme.name),
    description: rawScheme.description ? ensureLocalizedText(rawScheme.description) : null,
    ministry: String(rawScheme.ministry ?? "").trim(),
    categories: Array.isArray(rawScheme.categories)
      ? rawScheme.categories
      : rawScheme.category
        ? [rawScheme.category]
        : [],
    state: String(rawScheme.state ?? "central").trim(),
    eligibility: normalizeEligibility(rawScheme.eligibility ?? rawScheme.eligibilityText ?? ""),
    benefitAmount:
      rawScheme.benefitAmount == null ? null : Number(rawScheme.benefitAmount),
    benefitType: rawScheme.benefitType,
    documents: ensureLocalizedList(rawScheme.documents ?? []),
    applyUrl: String(rawScheme.applyUrl ?? "").trim(),
    applyMode: rawScheme.applyMode ?? "online",
    officeAddress: rawScheme.officeAddress
      ? ensureLocalizedText(rawScheme.officeAddress)
      : null,
    deadline: normalizeDeadline(rawScheme.deadline),
    tags: Array.isArray(rawScheme.tags) ? rawScheme.tags : [],
    active: rawScheme.active ?? true,
    verified: rawScheme.verified ?? false,
    source: rawScheme.source ?? sourceName,
  };
}

async function loadHuggingFaceSource() {
  const filePath = path.join(DATA_DIR, "huggingface-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "manual"));
}

async function loadPuppeteerSource() {
  const filePath = path.join(DATA_DIR, "puppeteer-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "myscheme"));
}

async function loadDataGovSource() {
  const filePath = path.join(DATA_DIR, "datagov-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "datagov"));
}

async function loadApiSetuSource() {
  const filePath = path.join(DATA_DIR, "apisetu-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "manual"));
}

async function loadManualSource() {
  const filePath = path.join(DATA_DIR, "manual-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "manual"));
}

const SOURCE_LOADERS = {
  huggingface: loadHuggingFaceSource,
  puppeteer: loadPuppeteerSource,
  datagov: loadDataGovSource,
  apisetu: loadApiSetuSource,
  manual: loadManualSource,
};

async function upsertScheme(scheme) {
  const update = {
    $set: {
      ...scheme,
      updatedAt: new Date(),
    },
    $setOnInsert: {
      createdAt: new Date(),
    },
  };

  return Scheme.updateOne({ schemeId: scheme.schemeId }, update, {
    upsert: true,
    runValidators: true,
  });
}

async function seedSchemes({
  mongoUri = process.env.MONGODB_URI,
  sourceOrder = DEFAULT_SOURCE_ORDER,
} = {}) {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to run the seed script");
  }

  await mongoose.connect(mongoUri);

  const summary = {
    scanned: 0,
    upserted: 0,
    bySource: {},
  };

  try {
    for (const sourceName of sourceOrder) {
      const loadSource = SOURCE_LOADERS[sourceName];
      if (!loadSource) {
        throw new Error(`Unknown seed source: ${sourceName}`);
      }

      const schemes = await loadSource();
      summary.bySource[sourceName] = schemes.length;

      for (const scheme of schemes) {
        await upsertScheme(scheme);
        summary.scanned += 1;
        summary.upserted += 1;
      }
    }

    return summary;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedSchemes()
    .then((summary) => {
      console.log("Scheme seed completed");
      console.table(summary.bySource);
      console.log(summary);
    })
    .catch((error) => {
      console.error("Scheme seed failed");
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  DEFAULT_SOURCE_ORDER,
  SOURCE_LOADERS,
  parseEligibility,
  normalizeScheme,
  seedSchemes,
  upsertScheme,
};
