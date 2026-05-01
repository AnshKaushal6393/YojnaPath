jest.mock("../../models/Scheme", () => ({
  Scheme: {
    updateOne: jest.fn(),
  },
}));

const { buildFallbackUrl, buildSchemeUrlUpdate } = require("../../scripts/checkUrls");

describe("checkUrls helpers", () => {
  test("buildFallbackUrl creates a MyScheme search URL from the scheme name", () => {
    expect(
      buildFallbackUrl({
        schemeId: "SCHEME-1",
        name: { en: "Farmer Support", hi: "" },
      })
    ).toBe("https://www.myscheme.gov.in/search?keyword=Farmer+Support");
  });

  test("buildSchemeUrlUpdate preserves fallback status for repaired dead URLs", () => {
    const checkedAt = new Date("2026-05-02T10:00:00.000Z");
    const update = buildSchemeUrlUpdate(
      {
        schemeId: "SCHEME-1",
        name: { en: "Farmer Support", hi: "" },
        applyUrl: "https://dead.example.gov/apply",
        applyUrlStatus: "fallback",
        applyUrlFinal: "https://www.myscheme.gov.in/search?keyword=Farmer+Support",
      },
      {
        alive: false,
        status: 404,
        finalUrl: "https://dead.example.gov/apply",
        error: "HTTP 404",
      },
      checkedAt
    );

    expect(update).toMatchObject({
      urlStatus: "dead",
      urlHttpStatus: 404,
      applyUrlStatus: "fallback",
      applyUrlFinal: "https://www.myscheme.gov.in/search?keyword=Farmer+Support",
      originalApplyUrl: "https://dead.example.gov/apply",
      applyUrlError: "HTTP 404",
    });
    expect(update.urlCheckedAt).toBe(checkedAt);
    expect(update.applyUrlCheckedAt).toBe(checkedAt);
  });
});
