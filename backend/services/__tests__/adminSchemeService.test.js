jest.mock("../../config/postgres", () => ({
  ensureDatabaseSchema: jest.fn().mockResolvedValue(),
  getPool: jest.fn(),
}));

jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => true),
}));

jest.mock("../../models/Scheme", () => ({
  Scheme: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { getPool } = require("../../config/postgres");
const { Scheme } = require("../../models/Scheme");

function loadAdminSchemeService() {
  let service;
  jest.isolateModules(() => {
    service = require("../adminSchemeService");
  });
  return service;
}

describe("adminSchemeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listAdminSchemes returns match counts and review reasons", async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          schemeId: "SCHEME-1",
          name: { en: "Scheme One", hi: "" },
          description: { en: "Desc", hi: "" },
          applyUrl: "notaurl",
          eligibility: {},
          active: true,
        },
      ]),
    };
    Scheme.find.mockReturnValue(findChain);
    Scheme.countDocuments.mockResolvedValue(1);
    getPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({
        rows: [{ scheme_id: "SCHEME-1", count: 4 }],
      }),
    });

    const { listAdminSchemes } = loadAdminSchemeService();
    const payload = await listAdminSchemes({ page: 1, limit: 10 });

    expect(payload).toMatchObject({
      total: 1,
      totalPages: 1,
      schemes: [
        {
          schemeId: "SCHEME-1",
          matchCount: 4,
          reviewReasons: ["missing_hindi", "dead_url", "empty_eligibility"],
        },
      ],
    });
  });

  test("getAdminSchemeFlags returns only schemes needing review", async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          schemeId: "SCHEME-1",
          name: { en: "Scheme One", hi: "" },
          description: { en: "Desc", hi: "" },
          applyUrl: "notaurl",
          eligibility: {},
          active: true,
        },
        {
          schemeId: "SCHEME-2",
          name: { en: "Scheme Two", hi: "योजना दो" },
          description: { en: "Desc", hi: "विवरण" },
          applyUrl: "https://example.com",
          eligibility: { occupation: ["farmer"] },
          tags: ["user-reported"],
          active: true,
        },
      ]),
    };
    Scheme.find.mockReturnValue(findChain);
    getPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    });

    const { getAdminSchemeFlags } = loadAdminSchemeService();
    const flags = await getAdminSchemeFlags();

    expect(flags.schemes).toHaveLength(2);
    expect(flags.schemes[0].reviewReasons).toContain("missing_hindi");
    expect(flags.schemes[0].reviewReasons).toContain("dead_url");
    expect(flags.schemes[1].reviewReasons).toContain("user_reported");
  });

  test("getAdminSchemeFlags omits dead_url after a resolved review action", async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          schemeId: "SCHEME-1",
          name: { en: "Scheme One", hi: "" },
          description: { en: "Desc", hi: "" },
          applyUrl: "notaurl",
          eligibility: {},
          active: true,
        },
      ]),
    };
    Scheme.find.mockReturnValue(findChain);
    getPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            scheme_id: "SCHEME-1",
            status: "fixed",
            note: "Replaced with a new official link",
            reviewed_by: "admin@example.com",
            reviewed_at: "2026-04-22T10:00:00.000Z",
          },
        ],
      }),
    });

    const { getAdminSchemeFlags } = loadAdminSchemeService();
    const flags = await getAdminSchemeFlags();

    expect(flags.schemes).toHaveLength(1);
    expect(flags.schemes[0].reviewAction).toMatchObject({
      status: "fixed",
      note: "Replaced with a new official link",
      reviewedBy: "admin@example.com",
    });
    expect(flags.schemes[0].reviewReasons).toContain("missing_hindi");
    expect(flags.schemes[0].reviewReasons).not.toContain("dead_url");
  });
});
