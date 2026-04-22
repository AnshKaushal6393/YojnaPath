jest.mock("../../services/adminDashboardService", () => ({
  getAdminFunnel: jest.fn(),
}));

jest.mock("../../services/adminAnalyticsService", () => ({
  getAnalyticsKiosk: jest.fn(),
  getAnalyticsOverview: jest.fn(),
  getAnalyticsPhoto: jest.fn(),
  getAnalyticsSchemes: jest.fn(),
}));

const { getAdminFunnel } = require("../../services/adminDashboardService");
const {
  getAnalyticsKiosk,
  getAnalyticsOverview,
  getAnalyticsPhoto,
  getAnalyticsSchemes,
} = require("../../services/adminAnalyticsService");
const {
  getAnalyticsFunnelRoute,
  getAnalyticsKioskRoute,
  getAnalyticsNearMissRoute,
  getAnalyticsOverviewRoute,
  getAnalyticsPhotoRoute,
  getAnalyticsSchemesRoute,
} = require("../adminAnalyticsController");

function createResponse() {
  return {
    json: jest.fn().mockReturnThis(),
  };
}

describe("adminAnalyticsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAnalyticsOverviewRoute returns overview payload", async () => {
    getAnalyticsOverview.mockResolvedValue({ generatedAt: "2026-04-22T00:00:00.000Z" });
    const res = createResponse();

    await getAnalyticsOverviewRoute({}, res);

    expect(getAnalyticsOverview).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ generatedAt: "2026-04-22T00:00:00.000Z" });
  });

  test("getAnalyticsFunnelRoute returns funnel payload", async () => {
    getAdminFunnel.mockResolvedValue({ stages: [] });
    const res = createResponse();

    await getAnalyticsFunnelRoute({}, res);

    expect(getAdminFunnel).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ stages: [] });
  });

  test("getAnalyticsNearMissRoute returns truncated near miss payload", async () => {
    getAnalyticsSchemes.mockResolvedValue({
      generatedAt: "2026-04-22T00:00:00.000Z",
      analyzedProfiles: 12,
      totalNearMisses: 11,
      nearMissCriteria: [
        { key: "occupation", count: 8 },
        { key: "state", count: 3 },
      ],
      schemes: [
        { schemeId: "A", name: "Scheme A", nearMisses: 5 },
        { schemeId: "B", name: "Scheme B", nearMisses: 4 },
      ],
    });
    const res = createResponse();

    await getAnalyticsNearMissRoute({}, res);

    expect(res.json).toHaveBeenCalledWith({
      generatedAt: "2026-04-22T00:00:00.000Z",
      analyzedProfiles: 12,
      totalNearMisses: 11,
      criteria: [
        { key: "occupation", count: 8 },
        { key: "state", count: 3 },
      ],
      schemes: [
        { schemeId: "A", name: "Scheme A", nearMisses: 5 },
        { schemeId: "B", name: "Scheme B", nearMisses: 4 },
      ],
    });
  });

  test("getAnalyticsPhotoRoute returns photo analytics", async () => {
    getAnalyticsPhoto.mockResolvedValue({ total: 10 });
    const res = createResponse();

    await getAnalyticsPhotoRoute({}, res);

    expect(res.json).toHaveBeenCalledWith({ total: 10 });
  });

  test("getAnalyticsKioskRoute returns kiosk analytics", async () => {
    getAnalyticsKiosk.mockResolvedValue({ totalSessions: 3 });
    const res = createResponse();

    await getAnalyticsKioskRoute({}, res);

    expect(res.json).toHaveBeenCalledWith({ totalSessions: 3 });
  });

  test("getAnalyticsSchemesRoute returns scheme analytics", async () => {
    getAnalyticsSchemes.mockResolvedValue({ schemes: [] });
    const res = createResponse();

    await getAnalyticsSchemesRoute({}, res);

    expect(res.json).toHaveBeenCalledWith({ schemes: [] });
  });
});
