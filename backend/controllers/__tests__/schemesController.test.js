jest.mock("../../models/Scheme", () => ({
  Scheme: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => true),
}));

jest.mock("../../engine/matcher", () => ({
  getMatchingSchemes: jest.fn(),
  matchScheme: jest.fn(),
}));

jest.mock("../../services/topSchemesCache", () => ({
  topSchemesCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("../../services/analyticsService", () => ({
  recordMatchAnalytics: jest.fn(),
}));

const { Scheme } = require("../../models/Scheme");
const { getMatchingSchemes, matchScheme } = require("../../engine/matcher");
const { topSchemesCache } = require("../../services/topSchemesCache");
const { recordMatchAnalytics } = require("../../services/analyticsService");
const {
  getSchemeById,
  getTopSchemes,
  getUrgentSchemes,
  matchSchemes,
} = require("../schemesController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("schemesController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("matchSchemes returns scored engine result with processing time", async () => {
    getMatchingSchemes.mockResolvedValue({
      count: 1,
      schemes: [{ schemeId: "ABC", matchScore: 3 }],
      nearMissCount: 0,
      nearMisses: [],
      totalScanned: 10,
    });
    const req = {
      method: "POST",
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
      },
      user: {
        id: "user-1",
      },
    };
    const res = createResponse();

    await matchSchemes(req, res);

    expect(getMatchingSchemes).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "UP",
        occupation: "farmer",
        annual_income: 100000,
        caste: "obc",
        gender: "male",
        age: 35,
        landAcres: 1,
        disabilityPct: 0,
        isStudent: false,
      }),
      {
        limitMatches: 50,
        limitNearMisses: 10,
        nearMissGap: 1,
      }
    );
    expect(recordMatchAnalytics).toHaveBeenCalledWith({
      userId: "user-1",
      sessionType: "web",
      state: "UP",
      occupation: "farmer",
      matchCount: 1,
      nearMissCount: 0,
      schemeIds: ["ABC"],
      lang: null,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      count: 1,
      totalScanned: 10,
      processingTimeMs: expect.any(Number),
    }));
  });

  test("getSchemeById returns 404 when scheme is missing", async () => {
    Scheme.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const req = { params: { id: "missing" } };
    const res = createResponse();

    await getSchemeById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Scheme not found" });
  });

  test("getUrgentSchemes returns only matching schemes closing within 7 days", async () => {
    const now = new Date();
    const closesSoon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    Scheme.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { schemeId: "ONE", deadline: { closes: closesSoon } },
        { schemeId: "TWO", deadline: { closes: closesSoon } },
      ]),
    });
    matchScheme
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const req = {
      method: "GET",
      query: {
        state: "UP",
        occupation: "farmer",
      },
      body: {},
    };
    const res = createResponse();

    await getUrgentSchemes(req, res);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        schemeId: "ONE",
        daysRemaining: expect.any(Number),
      }),
    ]);
  });

  test("getTopSchemes returns cached payload when available", async () => {
    topSchemesCache.get.mockResolvedValue({
      userType: "farmer",
      count: 1,
      schemes: [{ schemeId: "PM_KISAN_001" }],
    });
    const req = {
      method: "GET",
      query: {
        state: "UP",
        occupation: "farmer",
        income: 100000,
        caste: "obc",
        gender: "male",
        age: 35,
        landAcres: 1,
        disabilityPct: 0,
        isStudent: false,
      },
      body: {},
    };
    const res = createResponse();

    await getTopSchemes(req, res);

    expect(getMatchingSchemes).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      userType: "farmer",
      count: 1,
      schemes: [{ schemeId: "PM_KISAN_001" }],
    });
  });

  test("getTopSchemes rejects requests without live profile input", async () => {
    const req = {
      method: "GET",
      query: {},
      body: {},
    };
    const res = createResponse();

    await getTopSchemes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Real-time top schemes require current profile inputs",
    });
  });

  test("matchSchemes accepts userType when occupation is omitted", async () => {
    getMatchingSchemes.mockResolvedValue({
      count: 0,
      schemes: [],
      nearMissCount: 0,
      nearMisses: [],
      totalScanned: 4,
    });
    const req = {
      method: "POST",
      body: {
        state: "UP",
        userType: "business",
        income: 100000,
        caste: "obc",
        gender: "male",
        age: 35,
        landAcres: 1,
        disabilityPct: 0,
        isStudent: false,
      },
      user: {
        id: "user-1",
      },
    };
    const res = createResponse();

    await matchSchemes(req, res);

    expect(getMatchingSchemes).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "UP",
        userType: "business",
        occupation: "business",
      }),
      expect.any(Object)
    );
  });
});
