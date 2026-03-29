jest.mock("../../services/applicationsService", () => ({
  APPLICATION_STATUSES: ["applied", "pending", "approved", "rejected"],
  getApplicationsForUser: jest.fn(),
  upsertApplicationForUser: jest.fn(),
  updateApplicationForUser: jest.fn(),
}));

const {
  getApplicationsForUser,
  upsertApplicationForUser,
  updateApplicationForUser,
} = require("../../services/applicationsService");
const {
  computeRemindAt,
  getApplications,
  patchApplication,
  saveApplication,
} = require("../applicationsController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("applicationsController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("computeRemindAt sets reminder 30 days after applied date", () => {
    expect(computeRemindAt("2026-03-01")).toBe("2026-03-31");
  });

  test("getApplications returns tracked applications for user", async () => {
    getApplicationsForUser.mockResolvedValue([
      { schemeId: "PM_KISAN_001", status: "applied" },
    ]);
    const req = { user: { id: "user-1" } };
    const res = createResponse();

    await getApplications(req, res);

    expect(getApplicationsForUser).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith([
      { schemeId: "PM_KISAN_001", status: "applied" },
    ]);
  });

  test("saveApplication creates or updates tracked application", async () => {
    upsertApplicationForUser.mockResolvedValue({
      schemeId: "PM_KISAN_001",
      status: "applied",
      remindAt: "2026-04-30",
    });
    const req = {
      user: { id: "user-1" },
      body: {
        schemeId: "pm_kisan_001",
        appliedAt: "2026-03-31",
        notes: "Applied at CSC",
      },
    };
    const res = createResponse();

    await saveApplication(req, res);

    expect(upsertApplicationForUser).toHaveBeenCalledWith("user-1", {
      schemeId: "PM_KISAN_001",
      appliedAt: "2026-03-31",
      status: "applied",
      notes: "Applied at CSC",
      remindAt: "2026-04-30",
    });
    expect(res.json).toHaveBeenCalledWith({
      schemeId: "PM_KISAN_001",
      status: "applied",
      remindAt: "2026-04-30",
    });
  });

  test("patchApplication validates status values", async () => {
    const req = {
      user: { id: "user-1" },
      params: { schemeId: "PM_KISAN_001" },
      body: { status: "done" },
    };
    const res = createResponse();

    await patchApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "status must be applied, pending, approved, or rejected",
    });
  });

  test("patchApplication updates existing application", async () => {
    updateApplicationForUser.mockResolvedValue({
      schemeId: "PM_KISAN_001",
      status: "approved",
      notes: "Approved by department",
    });
    const req = {
      user: { id: "user-1" },
      params: { schemeId: "pm_kisan_001" },
      body: { status: "approved", notes: "Approved by department" },
    };
    const res = createResponse();

    await patchApplication(req, res);

    expect(updateApplicationForUser).toHaveBeenCalledWith("user-1", "PM_KISAN_001", {
      status: "approved",
      notes: "Approved by department",
    });
    expect(res.json).toHaveBeenCalledWith({
      schemeId: "PM_KISAN_001",
      status: "approved",
      notes: "Approved by department",
    });
  });
});
