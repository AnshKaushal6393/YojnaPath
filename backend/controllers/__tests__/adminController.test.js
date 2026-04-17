jest.mock("../../services/adminDashboardService", () => ({
  getAdminOverview: jest.fn(),
  getAdminStats: jest.fn(),
}));

const { getAdminOverview, getAdminStats } = require("../../services/adminDashboardService");
const { getDashboard, getStats } = require("../adminController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("adminController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getDashboard returns current admin and overview", async () => {
    getAdminOverview.mockResolvedValue({
      generatedAt: "2026-04-17T18:30:00.000Z",
      mongoConnected: true,
      counts: {
        admins: 1,
        users: 10,
        profiles: 8,
        applications: 4,
        savedSchemes: 6,
        schemes: 120,
      },
    });

    const req = {
      admin: {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      },
    };
    const res = createResponse();

    await getDashboard(req, res);

    expect(getAdminOverview).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      admin: {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      },
      overview: {
        generatedAt: "2026-04-17T18:30:00.000Z",
        mongoConnected: true,
        counts: {
          admins: 1,
          users: 10,
          profiles: 8,
          applications: 4,
          savedSchemes: 6,
          schemes: 120,
        },
      },
    });
  });

  test("getStats returns admin stats payload", async () => {
    getAdminStats.mockResolvedValue({
      totalUsers: 24,
      totalMatches: 50,
      totalNearMisses: 13,
      activeSchemes: 120,
      activeToday: 6,
      topSchemeToday: "PM_KISAN_001",
      photoStats: [
        { photo_type: "camera", count: 10 },
        { photo_type: "none", count: 14 },
      ],
    });

    const req = {};
    const res = createResponse();

    await getStats(req, res);

    expect(getAdminStats).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      totalUsers: 24,
      totalMatches: 50,
      totalNearMisses: 13,
      activeSchemes: 120,
      activeToday: 6,
      topSchemeToday: "PM_KISAN_001",
      photoStats: [
        { photo_type: "camera", count: 10 },
        { photo_type: "none", count: 14 },
      ],
    });
  });
});
