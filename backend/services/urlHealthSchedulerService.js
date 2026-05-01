const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { buildSchemeUrlUpdate, checkUrl, updateSchemeUrlStatus } = require("../scripts/checkUrls");

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DEFAULT_WEEKLY_LIMIT = 500;
const DEFAULT_RATE_LIMIT_MS = 200;
const DEFAULT_SCHEDULE_DAY_IST = 0;
const DEFAULT_SCHEDULE_HOUR_IST = 3;

let scheduleTimeout = null;
let scheduleInterval = null;
let isRunning = false;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getNextWeeklyRunDelayMs(
  now = new Date(),
  scheduleDayIst = DEFAULT_SCHEDULE_DAY_IST,
  scheduleHourIst = DEFAULT_SCHEDULE_HOUR_IST
) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now.getTime() + istOffsetMs);
  const nextIst = new Date(nowIst);

  nextIst.setUTCHours(scheduleHourIst, 0, 0, 0);

  const daysUntilSchedule = (scheduleDayIst - nextIst.getUTCDay() + 7) % 7;
  nextIst.setUTCDate(nextIst.getUTCDate() + daysUntilSchedule);

  if (nextIst <= nowIst) {
    nextIst.setUTCDate(nextIst.getUTCDate() + 7);
  }

  const nextUtc = new Date(nextIst.getTime() - istOffsetMs);
  return nextUtc.getTime() - now.getTime();
}

function buildStaleUrlQuery(now = new Date()) {
  const staleBefore = new Date(now.getTime() - WEEK_MS);

  return {
    applyUrl: { $exists: true, $nin: [null, ""] },
    $or: [
      { urlCheckedAt: { $lt: staleBefore } },
      { urlCheckedAt: { $exists: false } },
      { urlCheckedAt: null },
    ],
  };
}

async function runWeeklyUrlHealthCheck(options = {}) {
  if (!isMongoReady()) {
    console.warn("[url-health] MongoDB is not connected; skipping weekly URL check");
    return { checked: 0, live: 0, dead: 0, skipped: true };
  }

  if (isRunning) {
    console.warn("[url-health] Previous URL check is still running; skipping this run");
    return { checked: 0, live: 0, dead: 0, skipped: true };
  }

  const limit = Math.max(Number(options.limit || process.env.URL_HEALTH_WEEKLY_LIMIT || DEFAULT_WEEKLY_LIMIT), 1);
  const rateLimitMs = Math.max(
    Number(options.rateLimitMs || process.env.URL_HEALTH_RATE_LIMIT_MS || DEFAULT_RATE_LIMIT_MS),
    0
  );

  isRunning = true;

  try {
    const schemes = await Scheme.find(
      buildStaleUrlQuery(new Date()),
      { schemeId: 1, name: 1, applyUrl: 1, originalApplyUrl: 1, applyUrlStatus: 1, applyUrlFinal: 1 }
    )
      .sort({ urlCheckedAt: 1, schemeId: 1 })
      .limit(limit)
      .lean();

    let live = 0;
    let dead = 0;

    console.log(`[url-health] Checking ${schemes.length} stale scheme URL(s)`);

    for (const scheme of schemes) {
      const result = await checkUrl(scheme.applyUrl);
      const checkedAt = new Date();

      await updateSchemeUrlStatus(
        scheme.schemeId,
        {
          $set: buildSchemeUrlUpdate(scheme, result, checkedAt),
        },
        {
          dbRetries: 4,
          dbRetryDelayMs: 2500,
        }
      );

      if (result.alive) {
        live += 1;
      } else {
        dead += 1;
      }

      if (rateLimitMs > 0) {
        await wait(rateLimitMs);
      }
    }

    console.log(`[url-health] Done. Checked: ${schemes.length}, Live: ${live}, Dead: ${dead}`);
    return { checked: schemes.length, live, dead, skipped: false };
  } catch (error) {
    console.warn(`[url-health] ${error.message}`);
    return { checked: 0, live: 0, dead: 0, skipped: true, error };
  } finally {
    isRunning = false;
  }
}

function startUrlHealthScheduler() {
  if (scheduleTimeout || scheduleInterval) {
    return;
  }

  const run = async () => {
    await runWeeklyUrlHealthCheck();
  };

  scheduleTimeout = setTimeout(() => {
    run();
    scheduleInterval = setInterval(run, WEEK_MS);
  }, getNextWeeklyRunDelayMs(new Date()));
}

module.exports = {
  buildStaleUrlQuery,
  getNextWeeklyRunDelayMs,
  runWeeklyUrlHealthCheck,
  startUrlHealthScheduler,
};
