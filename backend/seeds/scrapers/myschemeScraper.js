const fs = require("fs");
const https = require("https");
const path = require("path");
const puppeteer = require("puppeteer");

const SCRAPER_OUTPUT_PATH = path.join(__dirname, "..", "data", "puppeteer-schemes.json");
const MYSCHEME_BASE_URL = "https://www.myscheme.gov.in";
const SEARCH_URL = `${MYSCHEME_BASE_URL}/search`;
const SEARCH_API_FRAGMENT = "/search/v6/schemes?";
const DETAIL_API_BASE = "https://api.myscheme.gov.in/schemes/v6/public/schemes";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readExistingScrape() {
  if (!fs.existsSync(SCRAPER_OUTPUT_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(SCRAPER_OUTPUT_PATH, "utf8").trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`Request failed for ${url} with status ${response.statusCode}: ${data.slice(0, 200)}`));
          return;
        }

        resolve(JSON.parse(data));
      });
    }).on("error", reject);
  });
}

function slugToSchemeId(slug) {
  return `MYSCHEME_${String(slug ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;
}

function mapStateLabelsToCode(labels = [], level = "") {
  const joined = labels.join(" ").toLowerCase();
  if (/central/i.test(level) || labels.includes("All") || joined.includes("all")) {
    return "central";
  }

  const label = String(labels[0] ?? "")
    .toLowerCase()
    .trim();

  const map = {
    "andaman and nicobar islands": "AN",
    "andhra pradesh": "AP",
    "arunachal pradesh": "AR",
    assam: "AS",
    bihar: "BR",
    chandigarh: "CH",
    chhattisgarh: "CG",
    "dadra & nagar haveli and daman & diu": "DH",
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
  };

  return map[label] ?? "central";
}

function mapCategories(categoryLabels = [], tags = []) {
  const combined = [...categoryLabels, ...tags].join(" ").toLowerCase();
  const keywordMap = [
    { category: "agriculture", keywords: ["agriculture", "farmer", "rural"] },
    { category: "health", keywords: ["health", "wellness", "medical"] },
    { category: "finance", keywords: ["banking", "finance", "insurance", "loan"] },
    { category: "housing", keywords: ["housing", "shelter"] },
    { category: "women", keywords: ["women", "girl", "child"] },
    { category: "education", keywords: ["education", "learning", "student", "scholarship"] },
    { category: "disability", keywords: ["disability", "disabled", "divyang"] },
    { category: "senior", keywords: ["senior", "pension", "elderly"] },
    { category: "artisan", keywords: ["artisan", "culture", "craft"] },
    { category: "labour", keywords: ["employment", "worker", "skill", "labour"] },
  ];

  const mapped = keywordMap
    .filter((entry) => entry.keywords.some((keyword) => combined.includes(keyword)))
    .map((entry) => entry.category);

  return [...new Set(mapped)].slice(0, 3);
}

function inferBenefitType(text) {
  const normalized = String(text ?? "").toLowerCase();
  if (normalized.includes("loan")) {
    return "loan";
  }
  if (normalized.includes("insurance")) {
    return "insurance";
  }
  if (normalized.includes("subsid")) {
    return "subsidy";
  }
  if (normalized.includes("scholarship")) {
    return "scholarship";
  }
  if (normalized.includes("equipment") || normalized.includes("instrument")) {
    return "equipment";
  }
  if (/rs\.?|rupees|allowance|financial assistance|grant|stipend|dbt/i.test(normalized)) {
    return "cash_transfer";
  }
  return "service";
}

function extractBenefitAmount(text) {
  const normalized = String(text ?? "").replace(/,/g, "");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)?/gi)];
  if (!matches.length) {
    return null;
  }

  const values = matches
    .map((match) => {
      const amount = Number(match[1]);
      if (!Number.isFinite(amount)) {
        return null;
      }
      return /lakh|lac/i.test(match[2] ?? "") ? amount * 100000 : amount;
    })
    .filter((value) => value != null);

  return values.length ? Math.max(...values) : null;
}

function flattenRichText(nodes = []) {
  if (!Array.isArray(nodes)) {
    return "";
  }

  const parts = [];
  const visit = (nodeList) => {
    for (const node of nodeList) {
      if (!node) {
        continue;
      }

      if (typeof node.text === "string") {
        parts.push(node.text);
      }

      if (Array.isArray(node.children)) {
        visit(node.children);
        if (node.type === "paragraph" || node.type === "list_item") {
          parts.push("\n");
        }
      }
    }
  };

  visit(nodes);
  return parts
    .join(" ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseDocumentList(nodes = []) {
  const text = flattenRichText(nodes);
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[\.\)\-:\t ]*/, "").trim())
    .filter(Boolean)
    .map((line) => ({ en: line, hi: line }));
}

function extractUrls(text) {
  return [...String(text ?? "").matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
}

async function withBrowser(task, options = {}) {
  const browser = await puppeteer.launch({
    headless: options.headless ?? "new",
    defaultViewport: { width: 1440, height: 1024 },
  });

  try {
    return await task(browser);
  } finally {
    await browser.close();
  }
}

async function scrapeListingPages(options = {}) {
  const { maxSchemes = null } = options;

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    const seenItems = new Map();
    let totalAvailable = null;
    let apiKey = null;

    page.on("request", (request) => {
      if (request.method() === "GET" && request.url().includes(SEARCH_API_FRAGMENT)) {
        apiKey = apiKey || request.headers()["x-api-key"] || null;
      }
    });

    page.on("response", async (response) => {
      if (!response.url().includes(SEARCH_API_FRAGMENT)) {
        return;
      }

      try {
        const payload = JSON.parse(await response.text());
        const hits = payload?.data?.hits?.items ?? [];
        totalAvailable = payload?.data?.summary?.total ?? totalAvailable;

        for (const item of hits) {
          const fields = item.fields || {};
          if (!fields.slug) {
            continue;
          }

          seenItems.set(fields.slug, {
            slug: fields.slug,
            detailUrl: `${MYSCHEME_BASE_URL}/schemes/${fields.slug}`,
            title: fields.schemeName,
            ministry: fields.nodalMinistryName,
            summary: fields.briefDescription,
            tags: fields.tags || [],
            categories: fields.schemeCategory || [],
            level: fields.level || "",
            beneficiaryStates: fields.beneficiaryState || [],
          });
        }
      } catch (error) {
      }
    });

    await page.goto(SEARCH_URL, { waitUntil: "networkidle2", timeout: 120000 });
    await wait(4000);

    let idleRounds = 0;
    let previousCount = 0;
    const targetTotal = maxSchemes ?? Number.POSITIVE_INFINITY;

    while ((seenItems.size < targetTotal) && idleRounds < 5) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await wait(2500);

      if (seenItems.size === previousCount) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
        previousCount = seenItems.size;
      }

      if (totalAvailable && seenItems.size >= totalAvailable) {
        break;
      }
    }

    return {
      apiKey,
      totalAvailable,
      items: Array.from(seenItems.values()).slice(0, maxSchemes ?? seenItems.size),
    };
  }, options);
}

async function fetchSchemeBundle(slug, apiKey) {
  const headers = {
    "x-api-key": apiKey,
    accept: "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9",
  };

  const [detailPayloadEn, detailPayloadHi] = await Promise.all([
    fetchJson(`${DETAIL_API_BASE}?slug=${encodeURIComponent(slug)}&lang=en`, headers),
    fetchJson(`${DETAIL_API_BASE}?slug=${encodeURIComponent(slug)}&lang=hi`, headers).catch(() => null),
  ]);
  const detailPayload = detailPayloadEn;
  const schemeId = detailPayloadEn?.data?._id;

  if (!schemeId) {
    throw new Error(`Missing scheme id for slug ${slug}`);
  }

  const [documentsPayloadEn, documentsPayloadHi, faqsPayload, applicationChannelPayload] = await Promise.all([
    fetchJson(`${DETAIL_API_BASE}/${schemeId}/documents?lang=en`, headers).catch(() => null),
    fetchJson(`${DETAIL_API_BASE}/${schemeId}/documents?lang=hi`, headers).catch(() => null),
    fetchJson(`${DETAIL_API_BASE}/${schemeId}/faqs?lang=en`, headers).catch(() => null),
    fetchJson(`${DETAIL_API_BASE}/${schemeId}/applicationchannel`, headers).catch(() => null),
  ]);

  return {
    detailPayload,
    detailPayloadHi,
    documentsPayloadEn,
    documentsPayloadHi,
    faqsPayload,
    applicationChannelPayload,
  };
}

async function scrapeSchemeDetail(entry, options = {}) {
  const { apiKey } = options;
  if (!apiKey) {
    throw new Error("myScheme api key is required for detail scraping");
  }

  const {
    detailPayload,
    detailPayloadHi,
    documentsPayloadEn,
    documentsPayloadHi,
    faqsPayload,
    applicationChannelPayload,
  } = await fetchSchemeBundle(entry.slug, apiKey);

  const data = detailPayload?.data?.en ?? {};
  const dataHi = detailPayloadHi?.data?.hi ?? {};
  const basic = data.basicDetails ?? {};
  const basicHi = dataHi.basicDetails ?? {};
  const content = data.schemeContent ?? {};
  const contentHi = dataHi.schemeContent ?? {};
  const faqItems = faqsPayload?.data?.en?.faqs ?? [];
  const documentsNodesEn = documentsPayloadEn?.data?.en?.documents_required ?? [];
  const documentsNodesHi = documentsPayloadHi?.data?.hi?.documents_required ?? [];
  const faqText = faqItems
    .map((faq) => `${faq.question}\n${faq.answer_md || flattenRichText(faq.answer || [])}`)
    .join("\n\n");
  const references = content.references ?? [];
  const externalUrls = [
    ...references.map((reference) => reference.url).filter(Boolean),
    ...extractUrls(faqText),
  ];
  const descriptionText = flattenRichText(content.detailedDescription || []);
  const descriptionTextHi = flattenRichText(contentHi.detailedDescription || []);
  const benefitsText = flattenRichText(content.benefits || []);
  const benefitsTextHi = flattenRichText(contentHi.benefits || []);
  const eligibilityText = flattenRichText(content.eligibility || []);
  const eligibilityTextHi = flattenRichText(detailPayloadHi?.data?.eligibilityCriteria?.eligibilityDescription || contentHi.eligibility || []);
  const exclusionsText = flattenRichText(content.exclusions || []);
  const applicationProcessText = flattenRichText(content.applicationProcess || []);
  const documentsEn = parseDocumentList(documentsNodesEn);
  const documentsHi = parseDocumentList(documentsNodesHi);
  const documents = documentsEn.map((doc, index) => ({
    en: doc.en,
    hi: documentsHi[index]?.en || doc.en,
  }));
  const categories = mapCategories(
    (basic.schemeCategory || []).map((item) => item.label),
    basic.tags || []
  );

  return {
    schemeId: slugToSchemeId(entry.slug),
    name: {
      en: basic.schemeName || entry.title,
      hi: basicHi.schemeName || basic.schemeName || entry.title,
    },
    description: {
      en: descriptionText || entry.summary || "",
      hi: descriptionTextHi || descriptionText || entry.summary || "",
    },
    ministry: basic.nodalMinistryName?.label || entry.ministry || "Unknown",
    categories: categories.length ? categories : ["finance"],
    state: mapStateLabelsToCode(basic.beneficiaryState || entry.beneficiaryStates, basic.level?.label || entry.level),
    eligibility: eligibilityText || {},
    benefitAmount: extractBenefitAmount(benefitsText),
    benefitType: inferBenefitType(benefitsText),
    documents,
    applyUrl: externalUrls[0] || entry.detailUrl,
    applyMode:
      applicationChannelPayload?.data?.length > 1
        ? "both"
        : /offline/i.test(applicationProcessText)
          ? "offline"
          : "online",
    officeAddress: null,
    deadline: {
      opens: basic.schemeOpenDate || null,
      closes: basic.schemeCloseDate || null,
      recurring: false,
      recurringMonth: null,
      recurringDay: null,
    },
    tags: basic.tags || entry.tags || [],
    active: true,
    verified: true,
    source: "myscheme",
    rawSections: {
      details: descriptionText,
      detailsHi: descriptionTextHi,
      benefits: benefitsText,
      benefitsHi: benefitsTextHi,
      eligibility: eligibilityText,
      eligibilityHi: eligibilityTextHi,
      exclusions: exclusionsText,
      applicationProcess: applicationProcessText,
      faqs: faqText,
    },
    rawReferences: references,
  };
}

async function scrapeMyScheme(options = {}) {
  const {
    useExistingDump = false,
    persistOutput = true,
    maxSchemes = null,
  } = options;

  if (useExistingDump) {
    const existing = readExistingScrape();
    if (existing.length) {
      return existing;
    }
  }

  const listing = await scrapeListingPages({ maxSchemes });
  if (!listing.apiKey) {
    throw new Error("Unable to discover myScheme API key from the live search page");
  }

  const schemes = [];
  for (const entry of listing.items) {
    const scheme = await scrapeSchemeDetail(entry, { apiKey: listing.apiKey });
    schemes.push(scheme);
  }

  if (persistOutput && schemes.length) {
    fs.mkdirSync(path.dirname(SCRAPER_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(SCRAPER_OUTPUT_PATH, JSON.stringify(schemes, null, 2));
  }

  return schemes;
}

if (require.main === module) {
  scrapeMyScheme({
    maxSchemes: process.env.MYSCHEME_MAX ? Number(process.env.MYSCHEME_MAX) : 20,
    persistOutput: true,
  })
    .then((schemes) => {
      console.log(`Scraped ${schemes.length} schemes from myScheme`);
      console.log(`Saved output to ${SCRAPER_OUTPUT_PATH}`);
    })
    .catch((error) => {
      console.error("myScheme scraper failed");
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  MYSCHEME_BASE_URL,
  SCRAPER_OUTPUT_PATH,
  scrapeListingPages,
  scrapeMyScheme,
  scrapeSchemeDetail,
};
