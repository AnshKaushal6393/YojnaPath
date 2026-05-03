jest.mock("../../models/Scheme", () => ({
  Scheme: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => true),
}));

jest.mock("../../services/analyticsService", () => ({
  getImpactStats: jest.fn(),
}));

const { Scheme } = require("../../models/Scheme");
const { getImpactStats } = require("../../services/analyticsService");
const { getApiHealth, getImpact } = require("../publicController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("publicController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getApiHealth returns status metadata", async () => {
    Scheme.countDocuments.mockResolvedValue(123);
    const req = {};
    const res = createResponse();

    await getApiHealth(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: "ok",
      schemeCount: 123,
      version: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    }));
  });

  test("getImpact returns aggregate impact stats", async () => {
    getImpactStats.mockResolvedValue({
      totalMatches: 50,
      totalBenefitValue: 200000,
      usersServed: 10,
      byUserType: { farmer: 5 },
      byState: { UP: 3 },
      schemesInDatabase: 100,
      lastUpdated: "2026-03-29T00:00:00.000Z",
    });
    const req = {};
    const res = createResponse();

    await getImpact(req, res);

    expect(res.json).toHaveBeenCalledWith({
      totalMatches: 50,
      totalBenefitValue: 200000,
      usersServed: 10,
      byUserType: { farmer: 5 },
      byState: { UP: 3 },
      schemesInDatabase: 100,
      lastUpdated: "2026-03-29T00:00:00.000Z",
    });
  });
});
