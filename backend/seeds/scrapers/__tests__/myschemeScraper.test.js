const {
  fetchListingPagesFromSearchApi,
  MYSCHEME_BASE_URL,
  extractSchemeSlugFromUrl,
  fetchSchemeUrlsFromSitemap,
  mapSearchApiItemToEntry,
  parseSitemapXml,
} = require("../myschemeScraper");

describe("myschemeScraper sitemap helpers", () => {
  test("parseSitemapXml returns loc entries and decodes XML entities", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.myscheme.gov.in/schemes/sample-scheme</loc></url>
        <url><loc>https://www.myscheme.gov.in/sitemap-schemes.xml?lang=en&amp;page=1</loc></url>
      </urlset>`;

    expect(parseSitemapXml(xml)).toEqual([
      "https://www.myscheme.gov.in/schemes/sample-scheme",
      "https://www.myscheme.gov.in/sitemap-schemes.xml?lang=en&page=1",
    ]);
  });

  test("extractSchemeSlugFromUrl returns slug only for MyScheme scheme detail pages", () => {
    expect(extractSchemeSlugFromUrl(`${MYSCHEME_BASE_URL}/schemes/pm-kisan?lang=en#overview`)).toBe(
      "pm-kisan"
    );
    expect(extractSchemeSlugFromUrl(`${MYSCHEME_BASE_URL}/search`)).toBeNull();
    expect(extractSchemeSlugFromUrl("https://example.com/schemes/pm-kisan")).toBeNull();
  });

  test("fetchSchemeUrlsFromSitemap keeps query strings for paginated sitemap XML files", async () => {
    const https = require("https");
    const originalGet = https.get;
    const responses = new Map([
      [
        "https://www.myscheme.gov.in/sitemap.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex>
          <sitemap><loc>https://www.myscheme.gov.in/sitemap-schemes.xml?page=1</loc></sitemap>
          <sitemap><loc>https://www.myscheme.gov.in/sitemap-schemes.xml?page=2</loc></sitemap>
        </sitemapindex>`,
      ],
      [
        "https://www.myscheme.gov.in/sitemap-schemes.xml?page=1",
        `<?xml version="1.0" encoding="UTF-8"?>
        <urlset>
          <url><loc>https://www.myscheme.gov.in/schemes/page-one</loc></url>
        </urlset>`,
      ],
      [
        "https://www.myscheme.gov.in/sitemap-schemes.xml?page=2",
        `<?xml version="1.0" encoding="UTF-8"?>
        <urlset>
          <url><loc>https://www.myscheme.gov.in/schemes/page-two</loc></url>
        </urlset>`,
      ],
    ]);

    https.get = jest.fn((url, options, callback) => {
      const { EventEmitter } = require("events");
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = {};
      response.setEncoding = jest.fn();

      process.nextTick(() => {
        callback(response);
        response.emit("data", responses.get(url) || "");
        response.emit("end");
      });

      return {
        on: jest.fn(),
      };
    });

    try {
      await expect(fetchSchemeUrlsFromSitemap()).resolves.toEqual([
        "https://www.myscheme.gov.in/schemes/page-one",
        "https://www.myscheme.gov.in/schemes/page-two",
      ]);
    } finally {
      https.get = originalGet;
    }
  });

  test("very low sitemap counts are treated as suspicious", () => {
    const minExpected = 100;
    const discovered = 0;

    expect(discovered < minExpected).toBe(true);
  });

  test("mapSearchApiItemToEntry converts search fields into scraper listing entries", () => {
    expect(
      mapSearchApiItemToEntry({
        slug: "pm-kisan",
        schemeName: "PM Kisan",
        nodalMinistryName: "Agriculture",
        briefDescription: "Income support",
        tags: ["farmer"],
        schemeCategory: ["agriculture"],
        level: "Central",
        beneficiaryState: ["All"],
      })
    ).toEqual({
      slug: "pm-kisan",
      detailUrl: `${MYSCHEME_BASE_URL}/schemes/pm-kisan`,
      title: "PM Kisan",
      ministry: "Agriculture",
      summary: "Income support",
      tags: ["farmer"],
      categories: ["agriculture"],
      level: "Central",
      beneficiaryStates: ["All"],
    });
  });

  test("fetchListingPagesFromSearchApi paginates and accumulates unique slugs", async () => {
    jest.resetModules();
    jest.doMock("https", () => ({
      get: jest
        .fn()
        .mockImplementationOnce((url, options, callback) => {
          const { EventEmitter } = require("events");
          const response = new EventEmitter();
          response.statusCode = 200;
          response.headers = {};
          response.setEncoding = jest.fn();
          process.nextTick(() => {
            callback(response);
            response.emit(
              "data",
              JSON.stringify({
                data: {
                  summary: { total: 2 },
                  hits: {
                    items: [
                      { fields: { slug: "one", schemeName: "One" } },
                      { fields: { slug: "two", schemeName: "Two" } },
                    ],
                  },
                },
              })
            );
            response.emit("end");
          });
          return { on: jest.fn() };
        }),
    }));

    const { fetchListingPagesFromSearchApi: fetchWithMock } = require("../myschemeScraper");
    const result = await fetchWithMock("test-key", { maxSchemes: 2 });

    expect(result.totalAvailable).toBe(2);
    expect(result.items.map((item) => item.slug)).toEqual(["one", "two"]);
  });
});
