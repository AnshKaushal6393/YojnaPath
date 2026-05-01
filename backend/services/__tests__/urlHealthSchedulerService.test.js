jest.mock("../../config/mongo", () => ({
  isMongoReady: jest.fn(() => true),
}));

jest.mock("../../models/Scheme", () => ({
  Scheme: {
    find: jest.fn(),
  },
}));

jest.mock("../../scripts/checkUrls", () => ({
  buildSchemeUrlUpdate: jest.fn(),
  checkUrl: jest.fn(),
  updateSchemeUrlStatus: jest.fn(),
}));

const {
  buildStaleUrlQuery,
  getNextWeeklyRunDelayMs,
} = require("../urlHealthSchedulerService");

describe("urlHealthSchedulerService", () => {
  test("buildStaleUrlQuery selects schemes with apply URLs that are unchecked or older than 7 days", () => {
    const now = new Date("2026-05-02T00:00:00.000Z");
    const query = buildStaleUrlQuery(now);

    expect(query).toEqual({
      applyUrl: { $exists: true, $nin: [null, ""] },
      $or: [
        { urlCheckedAt: { $lt: new Date("2026-04-25T00:00:00.000Z") } },
        { urlCheckedAt: { $exists: false } },
        { urlCheckedAt: null },
      ],
    });
  });

  test("getNextWeeklyRunDelayMs schedules the next Sunday 3am IST run", () => {
    const now = new Date("2026-05-02T00:00:00.000Z");

    expect(getNextWeeklyRunDelayMs(now)).toBe(77400000);
  });
});
