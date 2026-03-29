const fs = require("fs");
const path = require("path");

const SCRAPER_OUTPUT_PATH = path.join(__dirname, "..", "data", "puppeteer-schemes.json");
const MYSCHEME_BASE_URL = "https://www.myscheme.gov.in";

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

async function scrapeListingPages() {
  // TODO: Implement real pagination and listing extraction from myscheme.gov.in.
  // Expected output:
  // [
  //   {
  //     detailUrl: "https://www.myscheme.gov.in/schemes/...",
  //     title: "Scheme name",
  //     state: "central"
  //   }
  // ]
  return [];
}

async function scrapeSchemeDetail(detailUrl) {
  // TODO: Open detailUrl with Puppeteer and extract fields needed by normalizeScheme():
  // schemeId, name, description, ministry, categories/category, state, eligibility,
  // benefitAmount, benefitType, documents, applyUrl, applyMode, officeAddress, tags.
  return null;
}

async function scrapeMyScheme(options = {}) {
  const {
    useExistingDump = true,
    persistOutput = false,
  } = options;

  if (useExistingDump) {
    const existing = readExistingScrape();
    if (existing.length) {
      return existing;
    }
  }

  const listingEntries = await scrapeListingPages();
  const schemes = [];

  for (const entry of listingEntries) {
    const scheme = await scrapeSchemeDetail(entry.detailUrl);
    if (scheme) {
      schemes.push(scheme);
    }
  }

  if (persistOutput && schemes.length) {
    fs.mkdirSync(path.dirname(SCRAPER_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(SCRAPER_OUTPUT_PATH, JSON.stringify(schemes, null, 2));
  }

  return schemes;
}

module.exports = {
  MYSCHEME_BASE_URL,
  SCRAPER_OUTPUT_PATH,
  scrapeListingPages,
  scrapeMyScheme,
  scrapeSchemeDetail,
};
