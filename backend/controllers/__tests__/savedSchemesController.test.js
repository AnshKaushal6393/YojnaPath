jest.mock("../../services/savedSchemesService", () => ({
  deleteSavedSchemeForUser: jest.fn(),
  getSavedSchemesForUser: jest.fn(),
  saveSchemeForUser: jest.fn(),
}));

const {
  deleteSavedSchemeForUser,
  getSavedSchemesForUser,
  saveSchemeForUser,
} = require("../../services/savedSchemesService");
const {
  deleteSavedScheme,
  getSavedSchemes,
  saveScheme,
} = require("../savedSchemesController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("savedSchemesController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getSavedSchemes returns saved schemes for current user", async () => {
    getSavedSchemesForUser.mockResolvedValue([
      {
        schemeId: "PM_KISAN_001",
        active: true,
        scheme: { schemeId: "PM_KISAN_001" },
      },
    ]);
    const req = { user: { id: "user-1" } };
    const res = createResponse();

    await getSavedSchemes(req, res);

    expect(getSavedSchemesForUser).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        schemeId: "PM_KISAN_001",
        active: true,
      }),
    ]);
  });

  test("saveScheme stores idempotent saved record", async () => {
    saveSchemeForUser.mockResolvedValue({
      saved: true,
      schemeId: "PM_KISAN_001",
    });
    const req = {
      user: { id: "user-1" },
      params: { schemeId: "pm_kisan_001" },
    };
    const res = createResponse();

    await saveScheme(req, res);

    expect(saveSchemeForUser).toHaveBeenCalledWith("user-1", "PM_KISAN_001");
    expect(res.json).toHaveBeenCalledWith({
      saved: true,
      schemeId: "PM_KISAN_001",
    });
  });

  test("deleteSavedScheme returns 404 when row does not exist", async () => {
    deleteSavedSchemeForUser.mockResolvedValue(false);
    const req = {
      user: { id: "user-1" },
      params: { schemeId: "PM_KISAN_001" },
    };
    const res = createResponse();

    await deleteSavedScheme(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Saved scheme not found" });
  });
});
