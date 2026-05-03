jest.mock("../../config/postgres", () => ({
  ensureDatabaseSchema: jest.fn().mockResolvedValue(),
}));

jest.mock("../analyticsService", () => ({
  ensureAnalyticsSchema: jest.fn().mockResolvedValue(),
}));

jest.mock("../funnelService", () => ({
  ensureFunnelSchema: jest.fn().mockResolvedValue(),
}));

jest.mock("../profileService", () => ({
  ensureProfilesSchema: jest.fn().mockResolvedValue(),
}));

jest.mock("../userService", () => ({
  ensureUserColumns: jest.fn().mockResolvedValue(),
}));

const { ensureDatabaseSchema } = require("../../config/postgres");
const { ensureAnalyticsSchema } = require("../analyticsService");
const { ensureFunnelSchema } = require("../funnelService");
const { ensureProfilesSchema } = require("../profileService");
const { ensureUserColumns } = require("../userService");
const { runStartupSchemaBootstrap } = require("../schemaBootstrapService");

describe("schemaBootstrapService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("runs runtime schema migrations during startup", async () => {
    const result = await runStartupSchemaBootstrap();

    expect(ensureDatabaseSchema).toHaveBeenCalled();
    expect(ensureUserColumns).toHaveBeenCalled();
    expect(ensureProfilesSchema).toHaveBeenCalled();
    expect(ensureAnalyticsSchema).toHaveBeenCalled();
    expect(ensureFunnelSchema).toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      failures: [],
    });
  });
});
