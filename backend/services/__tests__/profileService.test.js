jest.mock("../../config/postgres", () => ({
  getPool: jest.fn(),
}));

const { getPool } = require("../../config/postgres");

function loadProfileService() {
  let service;
  jest.isolateModules(() => {
    service = require("../profileService");
  });
  return service;
}

describe("profileService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getProfileByUserId exposes display profile and display photo fallback", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "profile-1",
              user_id: "user-1",
              profile_name: "Mahendra Kumar",
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
              lang: "hi",
            },
          ],
        }),
    };
    getPool.mockReturnValue(pool);

    const { getProfileByUserId } = loadProfileService();
    const profile = await getProfileByUserId("user-1");

    expect(profile).toMatchObject({
      photoUrl: null,
      displayPhotoUrl: "https://cdn.example.com/account.jpg",
      userType: "farmer",
      displayProfile: {
        profileName: "Mahendra Kumar",
        photoUrl: "https://cdn.example.com/account.jpg",
        userType: "farmer",
      },
    });
  });

  test("listProfilesByUserId exposes display photo fallback for every profile", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "profile-1",
              user_id: "user-1",
              profile_name: "Mahendra Kumar",
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
              lang: "hi",
            },
            {
              id: "profile-2",
              user_id: "user-1",
              profile_name: "Sushma Kumar",
              relation: "spouse",
              photo_url: "https://cdn.example.com/profile-2.jpg",
              is_primary: false,
              state: "UP",
              occupation: "women",
              annual_income: 90000,
              caste: "obc",
              gender: "female",
              age: 22,
              land_acres: 0,
              disability_pct: 0,
              is_student: false,
              is_migrant: false,
              district: "Varanasi",
              account_photo_url: "https://cdn.example.com/account.jpg",
              lang: "hi",
            },
          ],
        }),
    };
    getPool.mockReturnValue(pool);

    const { listProfilesByUserId } = loadProfileService();
    const profiles = await listProfilesByUserId("user-1");

    expect(profiles[0]).toMatchObject({
      displayPhotoUrl: "https://cdn.example.com/account.jpg",
      displayProfile: {
        profileName: "Mahendra Kumar",
        photoUrl: "https://cdn.example.com/account.jpg",
      },
    });
    expect(profiles[1]).toMatchObject({
      displayPhotoUrl: "https://cdn.example.com/profile-2.jpg",
      displayProfile: {
        profileName: "Sushma Kumar",
        photoUrl: "https://cdn.example.com/profile-2.jpg",
      },
    });
  });
});
