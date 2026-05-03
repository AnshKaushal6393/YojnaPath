const {
  buildDataGovApiUrl,
  datagovRowToScheme,
  extractDataGovRecords,
} = require("../seedSchemes");

describe("seedSchemes data.gov.in helpers", () => {
  test("extractDataGovRecords supports common response envelopes", () => {
    expect(extractDataGovRecords({ records: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(extractDataGovRecords({ result: { records: [{ id: 2 }] } })).toEqual([{ id: 2 }]);
    expect(extractDataGovRecords([{ id: 3 }])).toEqual([{ id: 3 }]);
  });

  test("datagovRowToScheme maps a typical row into normalized scheme shape", () => {
    const scheme = datagovRowToScheme({
      scheme_name: "Farmer Support Scheme",
      description: "Financial assistance for small farmers",
      ministry: "Ministry of Agriculture",
      eligibility_criteria: "Farmers with income below 2 lakh",
      benefits: "Rs 6000 per year",
      documents_required: "Aadhaar\nBank account proof",
      official_website: "https://example.gov.in/farmer-support",
      state: "Uttar Pradesh",
      tags: "farmer, agriculture",
      category: "agriculture",
    });

    expect(scheme).toMatchObject({
      schemeId: "DATAGOV_UP_FARMER_SUPPORT_SCHEME",
      ministry: "Ministry of Agriculture",
      state: "UP",
      source: "datagov",
      applyUrl: "https://example.gov.in/farmer-support",
      benefitAmount: 6000,
    });
    expect(scheme.name.en).toBe("Farmer Support Scheme");
    expect(scheme.documents).toHaveLength(2);
  });

  test("buildDataGovApiUrl returns blank when no endpoint is configured", () => {
    expect(typeof buildDataGovApiUrl(0, 10)).toBe("string");
  });
});
