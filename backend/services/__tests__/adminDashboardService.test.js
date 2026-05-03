jest.mock("../../config/postgres", () => ({
  ensureDatabaseSchema: jest.fn().mockResolvedValue(),
  getPool: jest.fn(),
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => false),
}));

jest.mock("../../models/Scheme", () => ({
  Scheme: {
    countDocuments: jest.fn(),
  },
}));

const { getPool } = require("../../config/postgres");

function loadAdminDashboardService() {
  let service;
  jest.isolateModules(() => {
    service = require("../adminDashboardService");
  });
  return service;
}

describe("adminDashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAdminStats falls back when analytics schema columns are missing", async () => {
    const pool = {
      query: jest.fn((sql) => {
        const text = String(sql);

        if (text.includes("information_schema.columns")) {
          return Promise.resolve({ rows: [] });
        }

        if (text.includes("SELECT COUNT(*)::INT AS count FROM users")) {
          return Promise.resolve({ rows: [{ count: 12 }] });
        }

        if (text.includes("FROM profiles")) {
          return Promise.resolve({ rows: [] });
        }

        if (text.includes("COALESCE(SUM(near_miss_count)")) {
          return Promise.reject({ code: "42P01", message: "relation match_logs does not exist" });
        }

        if (text.includes("WHERE created_at >= CURRENT_DATE") && text.includes("COUNT(*)::INT AS count")) {
          return Promise.reject({ code: "42P01", message: "relation match_logs does not exist" });
        }

        if (text.includes("UNNEST(COALESCE(scheme_ids")) {
          return Promise.reject({ code: "42883", message: "function unnest(jsonb) does not exist" });
        }

        if (text.includes("SELECT photo_type, COUNT(*)::INT AS count")) {
          return Promise.reject({ code: "42703", message: "column photo_type does not exist" });
        }

        return Promise.reject(new Error(`Unexpected query: ${text}`));
      }),
    };
    getPool.mockReturnValue(pool);

    const { getAdminStats } = loadAdminDashboardService();
    const stats = await getAdminStats();

    expect(stats).toMatchObject({
      totalUsers: 12,
      totalMatches: 0,
      totalNearMisses: 0,
      activeSchemes: 0,
      activeToday: 0,
      topSchemeToday: "N/A",
      photoCompletionPct: 0,
      photoStats: [{ photo_type: "none", count: 0 }],
      userTypeStats: [],
    });
  });
});
