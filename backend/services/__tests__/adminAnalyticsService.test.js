jest.mock("../../config/postgres", () => ({
  ensureDatabaseSchema: jest.fn().mockResolvedValue(),
  getPool: jest.fn(),
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => true),
}));

jest.mock("../../models/Scheme", () => ({
  Scheme: {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      })),
    })),
  },
}));

jest.mock("../../engine/matcher", () => ({
  getNearMisses: jest.fn(() => []),
  matchScheme: jest.fn(() => false),
}));

jest.mock("../analyticsService", () => ({
  recordKioskPdfDownload: jest.fn(),
}));

const { getPool } = require("../../config/postgres");

function loadAdminAnalyticsService() {
  let service;
  jest.isolateModules(() => {
    service = require("../adminAnalyticsService");
  });
  return service;
}

describe("adminAnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAnalyticsSchemes falls back to occupation when profiles.user_type is missing", async () => {
    const pool = {
      query: jest.fn((sql) => {
        const text = String(sql);

        if (text.includes("information_schema.columns")) {
          return Promise.resolve({ rows: [] });
        }

        if (text.includes("FROM profiles p") && text.includes("WHERE p.is_primary = TRUE")) {
          return Promise.resolve({
            rows: [
              {
                state: "UP",
                user_type: null,
                occupation: "farmer",
                annual_income: 100000,
                caste: "obc",
                gender: "male",
                age: 30,
                land_acres: 2,
                disability_pct: 0,
                is_student: false,
              },
            ],
          });
        }

        if (text.includes("FROM applications")) {
          return Promise.resolve({ rows: [] });
        }

        if (text.includes("FROM match_logs") && text.includes("UNNEST(COALESCE(scheme_ids")) {
          return Promise.resolve({ rows: [] });
        }

        return Promise.reject(new Error(`Unexpected query: ${text}`));
      }),
    };
    getPool.mockReturnValue(pool);

    const { getAnalyticsSchemes } = loadAdminAnalyticsService();
    const payload = await getAnalyticsSchemes();

    expect(payload.analyzedProfiles).toBe(1);
    expect(payload.totalMatches).toBe(0);
    expect(payload.totalNearMisses).toBe(0);
    expect(payload.totalApplications).toBe(0);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("NULL::VARCHAR(30) AS user_type"));
  });
});
