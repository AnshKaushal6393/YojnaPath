const {
  getMatchingSchemes,
  matchScheme,
} = require("../matcher");

function createProfile(overrides = {}) {
  return {
    occupation: "farmer",
    annual_income: 200000,
    caste: "general",
    gender: "male",
    age: 35,
    landAcres: 1,
    disabilityPct: 0,
    isStudent: false,
    hasBankAccount: true,
    hasAadhaar: true,
    state: "MH",
    ...overrides,
  };
}

function createScheme(overrides = {}) {
  return {
    schemeId: "TEST_SCHEME",
    state: "MH",
    active: true,
    benefitAmount: 1000,
    eligibility: {
      occupation: ["farmer"],
      beneficiaryType: [],
      caste: [],
      gender: [],
      maxAnnualIncome: null,
      minAge: null,
      maxAge: null,
      landOwned: null,
      minDisabilityPct: null,
      minEducation: null,
      mustBeStudent: null,
      mustHaveBankAccount: null,
      mustHaveAadhaar: null,
    },
    ...overrides,
  };
}

describe("Phase 1 matcher required tests", () => {
  test("1. Farmer at income limit", () => {
    const profile = createProfile({ occupation: "farmer", annual_income: 200000 });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        maxAnnualIncome: 200000,
      },
    });

    expect(matchScheme(profile, scheme)).toBe(true);
  });

  test("2. Farmer 1 rupee over", () => {
    const profile = createProfile({ occupation: "farmer", annual_income: 200001 });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        maxAnnualIncome: 200000,
      },
    });

    expect(matchScheme(profile, scheme)).toBe(false);
  });

  test("3. SC for general-only scheme", () => {
    const profile = createProfile({ caste: "sc" });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        caste: ["general"],
      },
    });

    expect(matchScheme(profile, scheme)).toBe(false);
  });

  test("4. Central scheme any state", () => {
    const profile = createProfile({ state: "MH" });
    const scheme = createScheme({ state: "central" });

    expect(matchScheme(profile, scheme)).toBe(true);
  });

  test("5. Empty occupation array", () => {
    const profile = createProfile({ occupation: "shopkeeper" });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        occupation: [],
      },
    });

    expect(matchScheme(profile, scheme)).toBe(true);
  });

  test("6. Near-miss: 1 fail", async () => {
    const profile = createProfile({ annual_income: 220000 });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        maxAnnualIncome: 200000,
      },
    });
    const schemeModel = {
      find: () => ({
        lean: async () => [scheme],
      }),
    };

    const result = await getMatchingSchemes(profile, { schemeModel });

    expect(result.nearMissCount).toBe(1);
    expect(result.nearMisses).toHaveLength(1);
  });

  test("7. Near-miss: 2 fails", async () => {
    const profile = createProfile({ annual_income: 220000, caste: "sc" });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        maxAnnualIncome: 200000,
        caste: ["general"],
      },
    });
    const schemeModel = {
      find: () => ({
        lean: async () => [scheme],
      }),
    };

    const result = await getMatchingSchemes(profile, { schemeModel });

    expect(result.nearMissCount).toBe(0);
    expect(result.nearMisses).toHaveLength(0);
  });

  test("8. Student scheme", () => {
    const profile = createProfile({ isStudent: true, occupation: "student" });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        occupation: [],
        mustBeStudent: true,
      },
    });

    expect(matchScheme(profile, scheme)).toBe(true);
  });

  test("9. Disability 40% vs 80% required", () => {
    const profile = createProfile({ disabilityPct: 40 });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        minDisabilityPct: 80,
      },
    });

    expect(matchScheme(profile, scheme)).toBe(false);
  });

  test("10. Age 58 for 60+ scheme", async () => {
    const profile = createProfile({ age: 58 });
    const scheme = createScheme({
      eligibility: {
        ...createScheme().eligibility,
        minAge: 60,
      },
    });
    const schemeModel = {
      find: () => ({
        lean: async () => [scheme],
      }),
    };

    const result = await getMatchingSchemes(profile, { schemeModel });

    expect(matchScheme(profile, scheme)).toBe(false);
    expect(result.nearMissCount).toBe(1);
  });
});
