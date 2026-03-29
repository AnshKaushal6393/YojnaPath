jest.mock("../../services/profileService", () => ({
  ALLOWED_CASTES: ["sc", "st", "obc", "general"],
  ALLOWED_GENDERS: ["male", "female", "other"],
  ALLOWED_OCCUPATIONS: [
    "farmer",
    "shopkeeper",
    "artisan",
    "daily_wage",
    "student",
    "retired",
    "disabled",
    "migrant_worker",
  ],
  getProfileByUserId: jest.fn(),
  upsertProfile: jest.fn(),
}));

const { getProfileByUserId, upsertProfile } = require("../../services/profileService");
const { getProfile, saveProfile } = require("../profileController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("profileController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getProfile returns empty object with userId when profile does not exist", async () => {
    getProfileByUserId.mockResolvedValue(null);
    const req = { user: { id: "user-1" } };
    const res = createResponse();

    await getProfile(req, res);

    expect(getProfileByUserId).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({ userId: "user-1" });
  });

  test("getProfile returns existing profile", async () => {
    getProfileByUserId.mockResolvedValue({
      userId: "user-1",
      state: "UP",
      occupation: "farmer",
      annualIncome: 120000,
      caste: "obc",
      gender: "male",
      age: 34,
      landAcres: 1.5,
      disabilityPct: 0,
      isStudent: false,
      isMigrant: false,
      district: "Varanasi",
      lang: "hi",
    });
    const req = { user: { id: "user-1" } };
    const res = createResponse();

    await getProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      occupation: "farmer",
      district: "Varanasi",
    }));
  });

  test("saveProfile rejects invalid payload", async () => {
    const req = {
      user: { id: "user-1" },
      body: {
        state: "",
        occupation: "farmer",
      },
    };
    const res = createResponse();

    await saveProfile(req, res);

    expect(upsertProfile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "state is required" });
  });

  test("saveProfile upserts expanded profile and returns result", async () => {
    upsertProfile.mockResolvedValue({
      userId: "user-1",
      state: "MH",
      occupation: "migrant_worker",
      annualIncome: 90000,
      caste: "sc",
      gender: "male",
      age: 29,
      landAcres: 0,
      disabilityPct: 40,
      isStudent: false,
      isMigrant: true,
      district: "Mumbai",
      lang: "en",
    });
    const req = {
      user: { id: "user-1" },
      body: {
        state: "mh",
        occupation: "migrant_worker",
        annual_income: 90000,
        caste: "SC",
        gender: "male",
        age: 29,
        land_acres: 0,
        disability_pct: 40,
        is_student: false,
        is_migrant: true,
        district: "Mumbai",
        lang: "en",
      },
    };
    const res = createResponse();

    await saveProfile(req, res);

    expect(upsertProfile).toHaveBeenCalledWith("user-1", {
      state: "MH",
      occupation: "migrant_worker",
      annualIncome: 90000,
      caste: "sc",
      gender: "male",
      age: 29,
      landAcres: 0,
      disabilityPct: 40,
      isStudent: false,
      isMigrant: true,
      district: "Mumbai",
      lang: "en",
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      state: "MH",
      lang: "en",
    }));
  });
});
