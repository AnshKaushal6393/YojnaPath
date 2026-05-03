jest.mock("../../services/adminDashboardService", () => ({
  getAdminActivity: jest.fn(),
  getAdminFunnel: jest.fn(),
  getAdminOverview: jest.fn(),
  getAdminStats: jest.fn(),
}));

jest.mock("../../services/adminUserService", () => ({
  deleteAdminUserById: jest.fn(),
  exportAdminUsersCsv: jest.fn(),
  getAdminUserById: jest.fn(),
  getAdminUserMatches: jest.fn(),
  listAdminUsers: jest.fn(),
}));

const {
  getAdminActivity,
  getAdminFunnel,
  getAdminOverview,
  getAdminStats,
} = require("../../services/adminDashboardService");
const {
  deleteAdminUserById,
  exportAdminUsersCsv,
  getAdminUserById,
  getAdminUserMatches,
  listAdminUsers,
} = require("../../services/adminUserService");
const {
  deleteUserById,
  exportUsers,
  getActivity,
  getDashboard,
  getFunnel,
  getStats,
  getUserById,
  getUserMatches,
  getUsers,
} = require("../adminController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
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
      avgMatchesPerUser: 2.08,
      photoCompletionPct: 41.67,
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
      avgMatchesPerUser: 2.08,
      photoCompletionPct: 41.67,
      topSchemeToday: "PM_KISAN_001",
      photoStats: [
        { photo_type: "camera", count: 10 },
        { photo_type: "none", count: 14 },
      ],
    });
  });

  test("getActivity returns recent activity events", async () => {
    getAdminActivity.mockResolvedValue([
      {
        id: "evt-1",
        sessionType: "web",
        state: "UP",
        occupation: "farmer",
        matchCount: 3,
        nearMissCount: 1,
        schemeIds: ["PM_KISAN_001"],
        lang: "hi",
        createdAt: "2026-04-17T19:00:00.000Z",
      },
    ]);
    const res = createResponse();

    await getActivity({}, res);

    expect(getAdminActivity).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      events: [
        {
          id: "evt-1",
          sessionType: "web",
          state: "UP",
          occupation: "farmer",
          matchCount: 3,
          nearMissCount: 1,
          schemeIds: ["PM_KISAN_001"],
          lang: "hi",
          createdAt: "2026-04-17T19:00:00.000Z",
        },
      ],
    });
  });

  test("getFunnel returns funnel stages", async () => {
    getAdminFunnel.mockResolvedValue({
      maxCount: 100,
      stages: [
        { key: "phoneEntered", label: "Phone entered", count: 100 },
        { key: "otpVerified", label: "OTP verified", count: 96 },
      ],
    });
    const res = createResponse();

    await getFunnel({}, res);

    expect(getAdminFunnel).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      maxCount: 100,
      stages: [
        { key: "phoneEntered", label: "Phone entered", count: 100 },
        { key: "otpVerified", label: "OTP verified", count: 96 },
      ],
    });
  });

  test("getUsers forwards filters and returns paginated users", async () => {
    listAdminUsers.mockResolvedValue({
      page: 2,
      limit: 25,
      total: 1,
      totalPages: 1,
      users: [{ id: "user-1", name: "Ram" }],
    });
    const req = {
      query: {
        page: "2",
        limit: "25",
        state: "UP",
        userType: "farmer",
        search: "ram",
        hasPhoto: "true",
      },
    };
    const res = createResponse();

    await getUsers(req, res);

    expect(listAdminUsers).toHaveBeenCalledWith({
      page: "2",
      limit: "25",
      maxLimit: 100,
      state: "UP",
      userType: "farmer",
      search: "ram",
      hasPhoto: "true",
      sortBy: null,
      sortDir: null,
    });
    expect(res.json).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      total: 1,
      totalPages: 1,
      users: [{ id: "user-1", name: "Ram" }],
    });
  });

  test("getUserById returns 404 when user does not exist", async () => {
    getAdminUserById.mockResolvedValue(null);
    const req = { params: { id: "missing-user" } };
    const res = createResponse();

    await getUserById(req, res);

    expect(getAdminUserById).toHaveBeenCalledWith("missing-user");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("getUserMatches returns matches for an existing user", async () => {
    getAdminUserById.mockResolvedValue({ id: "user-1" });
    getAdminUserMatches.mockResolvedValue([
      {
        id: "match-1",
        matchCount: 5,
        nearMissCount: 2,
      },
    ]);
    const req = { params: { id: "user-1" } };
    const res = createResponse();

    await getUserMatches(req, res);

    expect(getAdminUserById).toHaveBeenCalledWith("user-1");
    expect(getAdminUserMatches).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({
      userId: "user-1",
      matches: [
        {
          id: "match-1",
          matchCount: 5,
          nearMissCount: 2,
        },
      ],
    });
  });

  test("deleteUserById returns deleted user details", async () => {
    deleteAdminUserById.mockResolvedValue({
      id: "user-1",
      deleted: true,
    });
    const req = { params: { id: "user-1" } };
    const res = createResponse();

    await deleteUserById(req, res);

    expect(deleteAdminUserById).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({
      message: "User deleted successfully",
      user: {
        id: "user-1",
        deleted: true,
      },
    });
  });

  test("exportUsers sends CSV as downloadable response", async () => {
    exportAdminUsersCsv.mockResolvedValue("user_id,name\n1,Ram");
    const res = createResponse();

    await exportUsers({}, res);

    expect(exportAdminUsersCsv).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenNthCalledWith(1, "Content-Type", "text/csv; charset=utf-8");
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      "Content-Disposition",
      'attachment; filename="admin-users-export.csv"'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("user_id,name\n1,Ram");
  });
});
