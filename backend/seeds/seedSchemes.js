const fs = require("fs");
const https = require("https");
const path = require("path");
const mongoose = require("mongoose");

const { Scheme } = require("../models/Scheme");
const {
  scrapeMyScheme,
  SCRAPER_OUTPUT_PATH,
} = require("./scrapers/myschemeScraper");

const DEFAULT_SOURCE_ORDER = [
  "huggingface",
  "puppeteer",
  "datagov",
  "apisetu",
  "manual",
];

const DATA_DIR = path.join(__dirname, "data");
const HF_CSV_PATH = process.env.HF_CSV_PATH || "C:\\Users\\ace_ansh\\OneDrive\\Desktop\\Indian_Govenment_Scheme.csv";
const HF_DATASET_REPO = process.env.HF_DATASET_REPO || "";
const HF_DATASET_FILE = process.env.HF_DATASET_FILE || "";
const HF_DATASET_REF = process.env.HF_DATASET_REF || "main";
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || "";

const STATE_NAME_TO_CODE = {
  "andaman and nicobar islands": "AN",
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  assam: "AS",
  bihar: "BR",
  chandigarh: "CH",
  chhattisgarh: "CG",
  "dadra and nagar haveli and daman and diu": "DH",
  delhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  "himachal pradesh": "HP",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  "madhya pradesh": "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  puducherry: "PY",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  "tamil nadu": "TN",
  telangana: "TS",
  tripura: "TR",
  "uttar pradesh": "UP",
  uttarakhand: "UK",
  "west bengal": "WB",
  central: "central",
  india: "central",
  nationwide: "central",
  national: "central",
};

const CATEGORY_KEYWORDS = [
  { keywords: ["agriculture", "farmer", "kisan", "horticulture"], category: "agriculture" },
  { keywords: ["health", "medical", "hospital", "nutrition"], category: "health" },
  { keywords: ["finance", "bank", "credit", "loan"], category: "finance" },
  { keywords: ["housing", "home", "shelter"], category: "housing" },
  { keywords: ["women", "girl", "maternal"], category: "women" },
  { keywords: ["education", "learning", "school", "student", "scholarship"], category: "education" },
  { keywords: ["disability", "disabled", "divyang", "pwd"], category: "disability" },
  { keywords: ["senior", "elderly", "old age", "retired"], category: "senior" },
  { keywords: ["artisan", "craft", "weaver", "handicraft"], category: "artisan" },
  { keywords: ["labour", "labor", "worker", "employment", "migrant"], category: "labour" },
];

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

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers,
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          resolve(fetchText(response.headers.location, headers));
          return;
        }

        if (!response.statusCode || response.statusCode >= 400) {
          let errorBody = "";
          response.on("data", (chunk) => {
            errorBody += chunk.toString();
          });
          response.on("end", () => {
            reject(
              new Error(
                `Request failed for ${url} with status ${response.statusCode}: ${errorBody.slice(0, 200)}`
              )
            );
          });
          return;
        }

        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          resolve(data);
        });
      }
    );

    request.on("error", reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  return dataRows.map((cells) => {
    const record = {};
    headerRow.forEach((header, headerIndex) => {
      const key = header || `column_${headerIndex}`;
      record[key] = (cells[headerIndex] ?? "").trim();
    });
    return record;
  });
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

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function normalizeState(stateName, level) {
  const normalizedState = String(stateName ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedState || /central/i.test(level ?? "")) {
    return "central";
  }

  return STATE_NAME_TO_CODE[normalizedState] ?? "central";
}

function inferCategories(rawCategory = "", tags = "", textBlob = "") {
  const combined = `${rawCategory} ${tags} ${textBlob}`.toLowerCase();
  const matches = CATEGORY_KEYWORDS
    .filter(({ keywords }) => keywords.some((keyword) => combined.includes(keyword)))
    .map(({ category }) => category);

  return [...new Set(matches)].slice(0, 3);
}

function extractBenefitAmount(text) {
  const normalized = String(text ?? "").replace(/,/g, "");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)?/gi)];
  if (!matches.length) {
    return null;
  }

  const values = matches
    .map((match) => {
      const numericValue = Number(match[1]);
      if (!Number.isFinite(numericValue)) {
        return null;
      }
      return /lakh|lac/i.test(match[2] ?? "") ? numericValue * 100000 : numericValue;
    })
    .filter((value) => value != null);

  if (!values.length) {
    return null;
  }

  return Math.max(...values);
}

function inferBenefitType(text) {
  const normalized = String(text ?? "").toLowerCase();
  if (/\bloan\b|\bcredit\b/.test(normalized)) {
    return "loan";
  }
  if (/\binsurance\b/.test(normalized)) {
    return "insurance";
  }
  if (/\bsubsidy\b/.test(normalized)) {
    return "subsidy";
  }
  if (/\bscholarship\b/.test(normalized)) {
    return "scholarship";
  }
  if (/\bequipment\b|\binstrument\b/.test(normalized)) {
    return "equipment";
  }
  if (/\bfinancial assistance\b|\brs\b|\brupees\b|\bper month\b|\bper year\b/.test(normalized)) {
    return "cash_transfer";
  }
  return "service";
}

function parseDocuments(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[\.\)\t-]?\s*/, "").trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  return lines.map((line) => ensureLocalizedText(line));
}

function parseTags(text) {
  return String(text ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function inferApplyMode(applicationProcess = "", officialWebsite = "") {
  const normalized = `${applicationProcess} ${officialWebsite}`.toLowerCase();
  const hasOnlineSignal = /portal|register|login|online|website/.test(normalized);
  const hasOfflineSignal = /visit|office|centre|center|submit.*office|anganwadi/.test(normalized);

  if (hasOnlineSignal && hasOfflineSignal) {
    return "both";
  }
  if (hasOfflineSignal) {
    return "offline";
  }
  return "online";
}

function csvRowToScheme(row) {
  const state = normalizeState(row.state, row.level);
  const schemeName = row.scheme_name || "Untitled Scheme";
  const categories = inferCategories(
    row.category,
    row.tags,
    `${row.brief_description} ${row.detailed_description} ${row.target_beneficiaries}`
  );
  const benefitText = row.benefits || row.brief_description || "";

  return normalizeScheme(
    {
      schemeId: `${state}_${slugify(schemeName).toUpperCase()}`,
      name: { en: schemeName, hi: schemeName },
      description: {
        en: row.detailed_description || row.brief_description || "",
        hi: row.brief_description || row.detailed_description || "",
      },
      ministry: row.nodal_ministry || row.implementing_agency || "Unknown",
      categories: categories.length ? categories : ["finance"],
      state,
      eligibilityText: row.eligibility_criteria || "",
      benefitAmount: extractBenefitAmount(benefitText),
      benefitType: inferBenefitType(benefitText),
      documents: parseDocuments(row.documents_required),
      applyUrl: row["Official Website"] || row["Application Form"] || "",
      applyMode: inferApplyMode(row.application_process, row["Official Website"]),
      tags: parseTags(row.tags),
      active: true,
      verified: false,
      source: "manual",
    },
    "manual"
  );
}

function jsonRowToScheme(row) {
  return normalizeScheme(row, row?.source ?? "manual");
}

function huggingFaceRowToScheme(row) {
  if (
    row?.scheme_name ||
    row?.eligibility_criteria ||
    row?.["Official Website"] ||
    row?.application_process
  ) {
    return csvRowToScheme(row);
  }

  return jsonRowToScheme(row);
}

function parseDatasetContent(fileName, content) {
  if (/\.csv$/i.test(fileName)) {
    return parseCsv(content);
  }

  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.data)) {
    return parsed.data;
  }

  throw new Error(`Unsupported Hugging Face dataset content format for ${fileName}`);
}

async function loadHuggingFaceRemoteSource() {
  if (!HF_DATASET_REPO || !HF_DATASET_FILE) {
    return [];
  }

  const encodedRepo = HF_DATASET_REPO
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const encodedRef = encodeURIComponent(HF_DATASET_REF);
  const encodedFile = HF_DATASET_FILE
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `https://huggingface.co/datasets/${encodedRepo}/resolve/${encodedRef}/${encodedFile}?download=true`;
  const headers = HF_TOKEN
    ? {
        Authorization: `Bearer ${HF_TOKEN}`,
      }
    : {};
  const content = await fetchText(url, headers);
  const rows = parseDatasetContent(HF_DATASET_FILE, content);
  return rows.map(huggingFaceRowToScheme);
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
  const remoteRows = await loadHuggingFaceRemoteSource();
  if (remoteRows.length) {
    return remoteRows;
  }

  if (fs.existsSync(HF_CSV_PATH)) {
    const csvRows = parseCsv(fs.readFileSync(HF_CSV_PATH, "utf8"));
    return csvRows.map(csvRowToScheme);
  }

  const filePath = path.join(DATA_DIR, "huggingface-schemes.json");
  return readJsonArray(filePath).map((scheme) => normalizeScheme(scheme, "manual"));
}

async function loadPuppeteerSource() {
  const scrapedSchemes = await scrapeMyScheme();
  if (scrapedSchemes.length) {
    return scrapedSchemes.map((scheme) => normalizeScheme(scheme, "myscheme"));
  }

  const filePath = SCRAPER_OUTPUT_PATH || path.join(DATA_DIR, "puppeteer-schemes.json");
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
  csvRowToScheme,
  parseEligibility,
  parseCsv,
  loadHuggingFaceRemoteSource,
  normalizeScheme,
  parseDatasetContent,
  seedSchemes,
  normalizeState,
  upsertScheme,
};
