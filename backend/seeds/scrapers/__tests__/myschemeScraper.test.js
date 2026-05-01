const {
  MYSCHEME_BASE_URL,
  extractSchemeSlugFromUrl,
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
});
