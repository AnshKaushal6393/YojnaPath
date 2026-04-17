jest.mock("../../engine/matcher", () => ({
  getMatchingSchemes: jest.fn(),
}));

jest.mock("../../services/analyticsService", () => ({
  recordKioskUsage: jest.fn(),
  recordMatchAnalytics: jest.fn(),
}));

jest.mock("../../services/kioskAuthService", () => ({
  resolveKiosk: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { getMatchingSchemes } = require("../../engine/matcher");
const { recordKioskUsage, recordMatchAnalytics } = require("../../services/analyticsService");
const { resolveKiosk } = require("../../services/kioskAuthService");
const { kioskLogin, kioskMatch } = require("../kioskController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("kioskController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  test("kioskLogin returns 401 for invalid kiosk code", async () => {
    resolveKiosk.mockResolvedValue(null);
    const req = { body: { kioskCode: "ABCD1234" } };
    const res = createResponse();

    await kioskLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid kiosk code" });
  });

  test("kioskLogin returns kiosk JWT for valid code", async () => {
    resolveKiosk.mockResolvedValue({
      id: "kiosk-1",
      name: "Demo kiosk",
    });
    const req = { body: { kioskCode: "ABCD1234" } };
    const res = createResponse();

    await kioskLogin(req, res);

    const payload = jwt.verify(res.json.mock.calls[0][0].token, process.env.JWT_SECRET);
    expect(payload.kioskId).toBe("kiosk-1");
    expect(payload.role).toBe("kiosk");
    expect(res.json).toHaveBeenCalledWith({
      token: expect.any(String),
      kioskId: "kiosk-1",
      kioskName: "Demo kiosk",
      role: "kiosk",
    });
  });

  test("kioskMatch returns schemes plus pdf-ready data without saving visitor data", async () => {
    getMatchingSchemes.mockResolvedValue({
      count: 1,
      schemes: [
        {
          schemeId: "PM_KISAN_001",
          name: { en: "PM Kisan", hi: "पीएम किसान" },
          benefitAmount: 6000,
          benefitType: "cash_transfer",
          applyMode: "online",
          applyUrl: "https://example.com",
          documents: [],
          officeAddress: null,
        },
      ],
      nearMissCount: 0,
      nearMisses: [],
      totalScanned: 100,
    });
    const req = {
      user: { id: "kiosk-1", role: "kiosk" },
      body: {
        state: "UP",
        occupation: "farmer",
        income: 100000,
        caste: "obc",
        gender: "male",
        age: 35,
        landAcres: 1,
        disabilityPct: 0,
        isStudent: false,
        lang: "hi",
      },
    };
    const res = createResponse();

    await kioskMatch(req, res);

    expect(recordMatchAnalytics).toHaveBeenCalledWith({
      userId: null,
      sessionType: "kiosk",
      state: "UP",
      occupation: "farmer",
      matchCount: 1,
      nearMissCount: 0,
      schemeIds: ["PM_KISAN_001"],
      lang: "hi",
    });
    expect(recordKioskUsage).toHaveBeenCalledWith("kiosk-1");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      count: 1,
      pdfData: expect.objectContaining({
        kioskId: "kiosk-1",
        summary: expect.objectContaining({ matched: 1 }),
      }),
    }));
  });
});
