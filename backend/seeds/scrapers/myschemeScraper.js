require("../../config/env");

const fs = require("fs");
const https = require("https");
const path = require("path");
const puppeteer = require("puppeteer");

const SCRAPER_OUTPUT_PATH = path.join(__dirname, "..", "data", "puppeteer-schemes.json");
const MYSCHEME_BASE_URL = "https://www.myscheme.gov.in";
const MYSCHEME_HOSTNAME = new URL(MYSCHEME_BASE_URL).hostname;
const SITEMAP_URL = `${MYSCHEME_BASE_URL}/sitemap.xml`;
const SEARCH_URL = `${MYSCHEME_BASE_URL}/search`;
const SEARCH_API_FRAGMENT = "/search/v6/schemes?";
const DETAIL_API_BASE = "https://api.myscheme.gov.in/schemes/v6/public/schemes";
const SEARCH_API_BASE = "https://api.myscheme.gov.in/search/v6/schemes";
const MIN_EXPECTED_SITEMAP_SCHEME_URLS = 100;
const SEARCH_API_PAGE_SIZE = 100;

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

function fetchJson(url, headers, attempt = 1) {
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

        try {
          resolve(JSON.parse(data));
        } catch (error) {
          if (attempt < 3) {
            setTimeout(() => {
              fetchJson(url, headers, attempt + 1).then(resolve).catch(reject);
            }, 1000 * attempt);
            return;
          }

          reject(
            new Error(
              `Invalid JSON received for ${url}: ${data.slice(0, 200)}`
            )
          );
        }
      });
    }).on("error", reject);
  });
}

function fetchText(url, headers = {}, attempt = 1) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          resolve(fetchText(response.headers.location, headers, attempt));
          return;
        }

        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode >= 400) {
            if (attempt < 3) {
              setTimeout(() => {
                fetchText(url, headers, attempt + 1).then(resolve).catch(reject);
              }, 1000 * attempt);
              return;
            }

            reject(
              new Error(
                `Request failed for ${url} with status ${response.statusCode}: ${data.slice(0, 200)}`
              )
            );
            return;
          }

          resolve(data);
        });
      })
      .on("error", (error) => {
        if (attempt < 3) {
          setTimeout(() => {
            fetchText(url, headers, attempt + 1).then(resolve).catch(reject);
          }, 1000 * attempt);
          return;
        }
        reject(error);
      });
  });
}

function decodeXmlEntities(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseSitemapXml(xml = "") {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => decodeXmlEntities(match[1]).trim())
    .filter(Boolean);
}

function normalizeMySchemeUrl(url, options = {}) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== MYSCHEME_HOSTNAME) {
      return null;
    }

    parsed.hash = "";
    if (!options.keepSearch) {
      parsed.search = "";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function extractSchemeSlugFromUrl(url) {
  const normalizedUrl = normalizeMySchemeUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  const match = normalizedUrl.match(/\/schemes\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : null;
}

async function fetchSchemeUrlsFromSitemap(url = SITEMAP_URL, visited = new Set()) {
  const normalizedUrl = normalizeMySchemeUrl(url, { keepSearch: true });
  if (!normalizedUrl || visited.has(normalizedUrl)) {
    return [];
  }

  visited.add(normalizedUrl);
  const xml = await fetchText(normalizedUrl, {
    accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  });

  const locs = parseSitemapXml(xml);
  const directSchemeUrls = [];
  const childSitemaps = [];

  for (const loc of locs) {
    const shouldKeepSearch = /\.xml(?:$|[?#])/i.test(loc);
    const normalizedLoc = normalizeMySchemeUrl(loc, { keepSearch: shouldKeepSearch });
    if (!normalizedLoc) {
      continue;
    }

    if (extractSchemeSlugFromUrl(normalizedLoc)) {
      directSchemeUrls.push(normalizedLoc);
      continue;
    }

    if (/\.xml(?:$|[?#])/i.test(normalizedLoc)) {
      childSitemaps.push(normalizedLoc);
    }
  }

  if (!childSitemaps.length) {
    return [...new Set(directSchemeUrls)];
  }

  const nestedResults = await Promise.all(
    childSitemaps.map((childUrl) => fetchSchemeUrlsFromSitemap(childUrl, visited))
  );

  return [...new Set([...directSchemeUrls, ...nestedResults.flat()])];
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
    { category: "skill_and_employment", keywords: ["artisan", "culture", "craft"] },
    { category: "labour", keywords: ["employment", "worker", "labour"] },
    { category: "skill_and_employment", keywords: ["skill", "entrepreneur", "startup"] },
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

async function discoverSearchContext(options = {}) {
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    let apiKey = null;
    let requestHeaders = null;

    page.on("request", (request) => {
      if (request.method() === "GET" && request.url().includes(SEARCH_API_FRAGMENT)) {
        apiKey = apiKey || request.headers()["x-api-key"] || null;
        requestHeaders = requestHeaders || request.headers();
      }
    });

    await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 180000 });
    await wait(5000);

    if (!apiKey) {
      throw new Error("Unable to discover myScheme API key from the live search page");
    }

    return {
      apiKey,
      requestHeaders: requestHeaders || {},
    };
  }, options);
}

async function enrichSitemapEntries(entries = [], apiKey) {
  if (!entries.length || !apiKey) {
    return entries;
  }

  const headers = {
    "x-api-key": apiKey,
    accept: "application/json, text/plain, */*",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9",
  };
  const slugParam = entries.map((entry) => entry.slug).filter(Boolean).join(",");

  if (!slugParam) {
    return entries;
  }

  try {
    const payload = await fetchJson(
      `${SEARCH_API_BASE}?lang=en&keyword=&sort=&from=0&size=${entries.length}&slug=${encodeURIComponent(slugParam)}`,
      headers
    );
    const items = payload?.data?.hits?.items ?? [];
    const bySlug = new Map(
      items
        .map((item) => item?.fields || null)
        .filter((fields) => fields?.slug)
        .map((fields) => [
          fields.slug,
          {
            title: fields.schemeName,
            ministry: fields.nodalMinistryName,
            summary: fields.briefDescription,
            tags: fields.tags || [],
            categories: fields.schemeCategory || [],
            level: fields.level || "",
            beneficiaryStates: fields.beneficiaryState || [],
          },
        ])
    );

    return entries.map((entry) => ({
      ...entry,
      ...(bySlug.get(entry.slug) || {}),
    }));
  } catch (error) {
    console.warn(`[myscheme] Unable to enrich sitemap entries from search API: ${error.message}`);
    return entries;
  }
}

function mapSearchApiItemToEntry(fields = {}) {
  if (!fields.slug) {
    return null;
  }

  return {
    slug: fields.slug,
    detailUrl: `${MYSCHEME_BASE_URL}/schemes/${fields.slug}`,
    title: fields.schemeName || "",
    ministry: fields.nodalMinistryName || "",
    summary: fields.briefDescription || "",
    tags: fields.tags || [],
    categories: fields.schemeCategory || [],
    level: fields.level || "",
    beneficiaryStates: fields.beneficiaryState || [],
  };
}

async function fetchListingPagesFromSearchApi(apiKey, options = {}) {
  const { maxSchemes = null } = options;
  const headers = {
    "x-api-key": apiKey,
    accept: "application/json, text/plain, */*",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9",
  };
  const target = maxSchemes ?? Number.POSITIVE_INFINITY;
  const seenItems = new Map();
  let totalAvailable = null;

  for (let from = 0; from < target; from += SEARCH_API_PAGE_SIZE) {
    const size = Math.min(SEARCH_API_PAGE_SIZE, target - from);
    const url =
      `${SEARCH_API_BASE}?lang=en&keyword=&sort=&from=${from}&size=${size}`;
    const payload = await fetchJson(url, headers);
    const items = payload?.data?.hits?.items ?? [];
    totalAvailable = payload?.data?.summary?.total ?? totalAvailable;

    for (const item of items) {
      const entry = mapSearchApiItemToEntry(item?.fields || {});
      if (entry) {
        seenItems.set(entry.slug, entry);
      }
    }

    if (!items.length || items.length < size) {
      break;
    }

    if (totalAvailable && seenItems.size >= totalAvailable) {
      break;
    }
  }

  return {
    totalAvailable,
    items: Array.from(seenItems.values()).slice(0, maxSchemes ?? seenItems.size),
  };
}

async function fetchListingPagesFromBrowserSearchApi(searchContext, options = {}) {
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 180000 });
    await wait(3000);
    const apiPage = await browser.newPage();
    const headerSource = searchContext.requestHeaders || {};
    const extraHeaders = {
      "x-api-key": searchContext.apiKey,
      accept: headerSource.accept || "application/json, text/plain, */*",
      "accept-language": headerSource["accept-language"] || "en-US,en;q=0.9",
      referer: SEARCH_URL,
    };
    await apiPage.setExtraHTTPHeaders(extraHeaders);

    const target = options.maxSchemes ?? Number.POSITIVE_INFINITY;
    const seenItems = new Map();
    let totalAvailable = null;

    for (let from = 0; from < target; from += SEARCH_API_PAGE_SIZE) {
      const size = Math.min(SEARCH_API_PAGE_SIZE, target - from);
      const url = `${SEARCH_API_BASE}?lang=en&keyword=&sort=&from=${from}&size=${size}`;
      const response = await apiPage.goto(url, { waitUntil: "networkidle0", timeout: 180000 });

      if (!response || !response.ok()) {
        throw new Error(`Browser session API request failed with status ${response ? response.status() : "unknown"}`);
      }

      const payload = JSON.parse(await response.text());
      const items = payload?.data?.hits?.items ?? [];
      totalAvailable = payload?.data?.summary?.total ?? totalAvailable;

      for (const item of items) {
        const entry = mapSearchApiItemToEntry(item?.fields || {});
        if (entry) {
          seenItems.set(entry.slug, entry);
        }
      }

      if (!items.length || items.length < size) {
        break;
      }

      if (totalAvailable && seenItems.size >= totalAvailable) {
        break;
      }
    }

    await apiPage.close();

    return {
      totalAvailable,
      items: Array.from(seenItems.values()).slice(0, options.maxSchemes ?? seenItems.size),
    };
  }, options);
}

async function scrapeListingPages(options = {}) {
  const { maxSchemes = null } = options;
  const searchContext = await discoverSearchContext(options);
  const apiKey = searchContext.apiKey;

  try {
    const schemeUrls = await fetchSchemeUrlsFromSitemap();
    console.log(`[myscheme] Sitemap discovered ${schemeUrls.length} scheme URL(s)`);

    if (!maxSchemes && schemeUrls.length < MIN_EXPECTED_SITEMAP_SCHEME_URLS) {
      throw new Error(
        `Suspiciously low sitemap result (${schemeUrls.length} URLs); falling back to live search listing`
      );
    }

    const items = schemeUrls
      .map((detailUrl) => {
        const slug = extractSchemeSlugFromUrl(detailUrl);
        if (!slug) {
          return null;
        }

        return {
          slug,
          detailUrl,
          title: "",
          ministry: "",
          summary: "",
          tags: [],
          categories: [],
          level: "",
          beneficiaryStates: [],
        };
      })
      .filter(Boolean)
      .slice(0, maxSchemes ?? Number.MAX_SAFE_INTEGER);

    const enrichedItems = await enrichSitemapEntries(items, apiKey);
    console.log(`[myscheme] Using ${enrichedItems.length} sitemap listing item(s) for detail scraping`);

    return {
      apiKey,
      totalAvailable: schemeUrls.length,
      items: enrichedItems,
    };
  } catch (error) {
    console.warn(`[myscheme] Sitemap discovery failed, falling back to live search scroll: ${error.message}`);
  }

  try {
    const listing = await fetchListingPagesFromSearchApi(apiKey, options);
    console.log(`[myscheme] Search API discovered ${listing.items.length} scheme listing item(s)`);

    if (!listing.items.length) {
      throw new Error("Search API returned 0 scheme listing items");
    }

    return {
      apiKey,
      totalAvailable: listing.totalAvailable,
      items: listing.items,
    };
  } catch (error) {
    console.warn(`[myscheme] Search API listing failed, falling back to browser scroll: ${error.message}`);
  }

  try {
    const listing = await fetchListingPagesFromBrowserSearchApi(searchContext, options);
    console.log(`[myscheme] Browser search API discovered ${listing.items.length} scheme listing item(s)`);

    if (!listing.items.length) {
      throw new Error("Browser search API returned 0 scheme listing items");
    }

    return {
      apiKey,
      totalAvailable: listing.totalAvailable,
      items: listing.items,
    };
  } catch (error) {
    console.warn(`[myscheme] Browser search API listing failed, falling back to browser scroll: ${error.message}`);
  }

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    const seenItems = new Map();
    let totalAvailable = null;

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

    await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 180000 });
    await wait(5000);

    let idleRounds = 0;
    let previousCount = 0;
    const targetTotal = maxSchemes ?? Number.POSITIVE_INFINITY;

    while (seenItems.size < targetTotal && idleRounds < 5) {
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

    console.log(`[myscheme] Live search discovered ${seenItems.size} scheme listing item(s)`);

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
  const failures = [];

  for (let index = 0; index < listing.items.length; index += 1) {
    const entry = listing.items[index];

    try {
      const scheme = await scrapeSchemeDetail(entry, { apiKey: listing.apiKey });
      schemes.push(scheme);
    } catch (error) {
      failures.push({
        slug: entry.slug,
        error: error.message,
      });
      console.warn(`[myscheme] Failed to scrape ${entry.slug}: ${error.message}`);
    }

    if (persistOutput && schemes.length && schemes.length % 25 === 0) {
      fs.mkdirSync(path.dirname(SCRAPER_OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(SCRAPER_OUTPUT_PATH, JSON.stringify(schemes, null, 2));
    }

    if ((index + 1) % 25 === 0) {
      console.log(
        `[myscheme] Progress: ${index + 1}/${listing.items.length} processed, ${schemes.length} saved, ${failures.length} failed`
      );
    }

    await wait(150);
  }

  if (persistOutput && schemes.length) {
    fs.mkdirSync(path.dirname(SCRAPER_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(SCRAPER_OUTPUT_PATH, JSON.stringify(schemes, null, 2));
  }

  if (failures.length) {
    console.warn(`[myscheme] Completed with ${failures.length} failed schemes`);
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
  SITEMAP_URL,
  discoverSearchContext,
  extractSchemeSlugFromUrl,
  fetchListingPagesFromBrowserSearchApi,
  fetchListingPagesFromSearchApi,
  fetchSchemeUrlsFromSitemap,
  mapSearchApiItemToEntry,
  parseSitemapXml,
  scrapeListingPages,
  scrapeMyScheme,
  scrapeSchemeDetail,
};
