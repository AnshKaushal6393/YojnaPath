jest.mock("../../config/postgres", () => ({
  ensureDatabaseSchema: jest.fn().mockResolvedValue(),
  getPool: jest.fn(),
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => false),
}));

jest.mock("../../engine/matcher", () => ({
  getMatchingSchemes: jest.fn(),
}));

jest.mock("../../config/cloudinary", () => ({
  configureCloudinary: jest.fn(),
}));

const { getPool } = require("../../config/postgres");

function loadAdminUserService() {
  let service;
  jest.isolateModules(() => {
    service = require("../adminUserService");
  });
  return service;
}

describe("adminUserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listAdminUsers returns normalized display photo and display profile", async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: "user-1",
            phone: "9999999999",
            name: "Sanjay Kumar",
            photo_url: null,
            photo_type: "upload",
            onboarding_done: true,
            lang: "hi",
            created_at: "2026-04-17T10:00:00.000Z",
            last_login: "2026-04-18T10:00:00.000Z",
            registration_completed_at: "2026-04-17T09:30:00.000Z",
            profile_name: "Sanjay Kumar",
            relation: null,
            profile_photo_url: "https://cdn.example.com/profile.jpg",
            state: "UP",
            occupation: "farmer",
            district: "Varanasi",
            match_runs: 3,
            total_matches: 12,
            total_near_misses: 4,
            total_count: 1,
          },
        ],
      }),
    };
    getPool.mockReturnValue(pool);

    const { listAdminUsers } = loadAdminUserService();
    const payload = await listAdminUsers({ page: 1, limit: 10 });

    expect(payload.users[0]).toMatchObject({
      photoUrl: null,
      displayPhotoUrl: "https://cdn.example.com/profile.jpg",
      primaryProfile: {
        profileName: "Sanjay Kumar",
        photoUrl: "https://cdn.example.com/profile.jpg",
        userType: "farmer",
      },
      displayProfile: {
        profileName: "Sanjay Kumar",
        photoUrl: "https://cdn.example.com/profile.jpg",
        userType: "farmer",
      },
    });
  });

  test("listAdminUsers prefers the most complete profile for list data", async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: "user-2",
            phone: "8888888888",
            name: "Asha",
            photo_url: null,
            photo_type: "none",
            onboarding_done: true,
            lang: "hi",
            created_at: "2026-04-17T10:00:00.000Z",
            last_login: "2026-04-18T10:00:00.000Z",
            registration_completed_at: "2026-04-17T09:30:00.000Z",
            profile_name: "Asha Devi",
            relation: "self",
            profile_photo_url: "https://cdn.example.com/asha.jpg",
            state: "UP",
            user_type: "farmer",
            occupation: "farmer",
            district: "Varanasi",
            match_runs: 1,
            total_matches: 2,
            total_near_misses: 0,
            total_count: 1,
          },
        ],
      }),
    };
    getPool.mockReturnValue(pool);

    const { listAdminUsers } = loadAdminUserService();
    const payload = await listAdminUsers({ page: 1, limit: 10 });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CASE WHEN p.state IS NOT NULL AND p.state <> '' THEN 100 ELSE 0 END DESC"),
      [null, null, null, null, 10, 0]
    );
    expect(payload.users[0].displayProfile).toMatchObject({
      profileName: "Asha Devi",
      state: "UP",
      userType: "farmer",
      photoUrl: "https://cdn.example.com/asha.jpg",
    });
  });

  test("getAdminUserById returns display profile and display photo fallback", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              name: "Account Owner",
              lang: "hi",
              photo_url: "https://cdn.example.com/account.jpg",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "profile-1",
              user_id: "user-1",
              profile_name: "Sanjay Kumar",
              relation: null,
              photo_url: null,
              is_primary: true,
              state: "UP",
              occupation: "farmer",
              annual_income: 120000,
              caste: "obc",
              gender: "male",
              age: 24,
              land_acres: 1.5,
              disability_pct: 0,
              is_student: false,
              is_migrant: false,
              district: "Varanasi",
              account_photo_url: "https://cdn.example.com/account.jpg",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              match_runs: 0,
              total_matches: 0,
              total_near_misses: 0,
              last_match_at: null,
            },
          ],
        }),
    };
    getPool.mockReturnValue(pool);

    const { getAdminUserById } = loadAdminUserService();
    const user = await getAdminUserById("user-1");

    expect(user).toMatchObject({
      photoUrl: "https://cdn.example.com/account.jpg",
      displayPhotoUrl: "https://cdn.example.com/account.jpg",
      primaryProfile: {
        profileName: "Sanjay Kumar",
        photoUrl: null,
        userType: "farmer",
      },
      displayProfile: {
        profileName: "Sanjay Kumar",
        displayPhotoUrl: "https://cdn.example.com/account.jpg",
        userType: "farmer",
      },
    });
  });
});
