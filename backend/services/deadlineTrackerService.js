require("../config/env");

const Redis = require("ioredis");
const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");

const URGENT_CACHE_KEY = "urgent-schemes:v1";
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_LOOKAHEAD_DAYS = Number(process.env.URGENT_DEADLINE_LOOKAHEAD_DAYS || 7);
const DEFAULT_SCHEDULE_HOUR_IST = Number(process.env.DEADLINE_TRACKER_HOUR_IST || 6);
const DAY_MS = 24 * 60 * 60 * 1000;

class MemoryUrgentSchemesStore {
  constructor() {
    this.record = null;
  }

  get() {
    if (!this.record) {
      return null;
    }

    if (Date.now() > this.record.expiresAt) {
      this.record = null;
      return null;
    }

    return this.record.value;
  }

  set(value) {
    this.record = {
      value,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    };
  }
}

let redis;
let memoryStore;
let redisUnavailable = false;
let hasLoggedRedisError = false;
let scheduleTimeout = null;
let scheduleInterval = null;

function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = new MemoryUrgentSchemesStore();
  }

  return memoryStore;
}

async function getRedisClient() {
  if (!process.env.REDIS_URL || redisUnavailable) {
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    redis.on("error", (error) => {
      if (process.env.NODE_ENV === "development" && !hasLoggedRedisError) {
        hasLoggedRedisError = true;
        console.warn(`[redis] ${error.message}`);
      }
    });
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    return redis;
  } catch (error) {
    redisUnavailable = true;
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("[deadline] Falling back to memory deadline cache because Redis is unavailable.");
    }
    return null;
  }
}

async function getCachedUrgentSchemes() {
  const client = await getRedisClient();

  if (!client) {
    return getMemoryStore().get();
  }

  const value = await client.get(URGENT_CACHE_KEY);
  return value ? JSON.parse(value) : null;
}

async function setCachedUrgentSchemes(payload) {
  const client = await getRedisClient();

  if (!client) {
    getMemoryStore().set(payload);
    return;
  }

  await client.set(URGENT_CACHE_KEY, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildDateInYear(year, templateDate) {
  return new Date(
    year,
    templateDate.getMonth(),
    templateDate.getDate(),
    templateDate.getHours(),
    templateDate.getMinutes(),
    templateDate.getSeconds(),
    templateDate.getMilliseconds()
  );
}

function buildDateFromMonthDay(year, month, day) {
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function isValidDate(value) {
  if (value == null || value === "") {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function computeRecurringDeadlineInfo(deadline, now = new Date()) {
  const year = now.getFullYear();
  const closesTemplateExists =
    deadline?.recurringMonth != null &&
    deadline?.recurringDay != null &&
    Number.isInteger(deadline.recurringMonth) &&
    Number.isInteger(deadline.recurringDay);

  if (!closesTemplateExists) {
    return {
      isOpen: true,
      opensAt: null,
      closesAt: null,
      recurring: true,
    };
  }

  const openTemplate = isValidDate(deadline?.opens) ? new Date(deadline.opens) : null;
  const buildWindow = (windowYear) => {
    let opensAt = openTemplate ? buildDateInYear(windowYear, openTemplate) : null;
    let closesAt = buildDateFromMonthDay(
      windowYear,
      deadline.recurringMonth,
      deadline.recurringDay
    );

    if (opensAt && closesAt < opensAt) {
      closesAt = buildDateFromMonthDay(
        windowYear + 1,
        deadline.recurringMonth,
        deadline.recurringDay
      );
    }

    return { opensAt, closesAt };
  };

  let windowInfo = buildWindow(year);

  if (windowInfo.opensAt && now < startOfDay(windowInfo.opensAt)) {
    return {
      isOpen: false,
      opensAt: windowInfo.opensAt,
      closesAt: windowInfo.closesAt,
      recurring: true,
    };
  }

  if (now <= endOfDay(windowInfo.closesAt)) {
    return {
      isOpen: true,
      opensAt: windowInfo.opensAt,
      closesAt: windowInfo.closesAt,
      recurring: true,
    };
  }

  windowInfo = buildWindow(year + 1);

  return {
    isOpen: false,
    opensAt: windowInfo.opensAt,
    closesAt: windowInfo.closesAt,
    recurring: true,
  };
}

function getSchemeDeadlineInfo(scheme, now = new Date()) {
  const deadline = scheme?.deadline || {};
  const opensAt = isValidDate(deadline.opens) ? new Date(deadline.opens) : null;
  const closesAt = isValidDate(deadline.closes) ? new Date(deadline.closes) : null;

  if (deadline.recurring) {
    return computeRecurringDeadlineInfo(deadline, now);
  }

  if (!closesAt) {
    return {
      isOpen: true,
      opensAt,
      closesAt: null,
      recurring: false,
    };
  }

  const hasOpened = !opensAt || now >= startOfDay(opensAt);

  return {
    isOpen: hasOpened && now <= endOfDay(closesAt),
    opensAt,
    closesAt,
    recurring: false,
  };
}

function isSchemeOpenForApplications(scheme, now = new Date()) {
  if (!scheme || scheme.active === false) {
    return false;
  }

  return Boolean(getSchemeDeadlineInfo(scheme, now).isOpen);
}

function getDaysRemainingForScheme(scheme, now = new Date()) {
  const deadlineInfo = getSchemeDeadlineInfo(scheme, now);

  if (!deadlineInfo.closesAt) {
    return null;
  }

  const diff = endOfDay(deadlineInfo.closesAt).getTime() - now.getTime();
  return Math.ceil(diff / DAY_MS);
}

function attachDeadlineInfo(scheme, now = new Date()) {
  const deadlineInfo = getSchemeDeadlineInfo(scheme, now);

  return {
    ...scheme,
    effectiveDeadline: {
      opens: deadlineInfo.opensAt ? deadlineInfo.opensAt.toISOString() : null,
      closes: deadlineInfo.closesAt ? deadlineInfo.closesAt.toISOString() : null,
      recurring: Boolean(deadlineInfo.recurring),
      isOpen: Boolean(deadlineInfo.isOpen),
      daysRemaining:
        deadlineInfo.isOpen && deadlineInfo.closesAt ? getDaysRemainingForScheme(scheme, now) : null,
    },
  };
}

function getUrgentSchemesFromList(schemes, now = new Date(), lookaheadDays = DEFAULT_LOOKAHEAD_DAYS) {
  return schemes
    .map((scheme) => attachDeadlineInfo(scheme, now))
    .filter((scheme) => scheme.effectiveDeadline.isOpen)
    .filter((scheme) => typeof scheme.effectiveDeadline.daysRemaining === "number")
    .filter(
      (scheme) =>
        scheme.effectiveDeadline.daysRemaining >= 0 &&
        scheme.effectiveDeadline.daysRemaining <= lookaheadDays
    )
    .sort(
      (a, b) =>
        a.effectiveDeadline.daysRemaining - b.effectiveDeadline.daysRemaining ||
        (b.benefitAmount || 0) - (a.benefitAmount || 0)
    );
}

async function refreshUrgentSchemesCache(now = new Date()) {
  if (!isMongoReady()) {
    return null;
  }

  const activeSchemes = await Scheme.find({ active: true }).lean();
  const urgentSchemes = getUrgentSchemesFromList(activeSchemes, now);

  const payload = {
    generatedAt: now.toISOString(),
    schemeIds: urgentSchemes.map((scheme) => scheme.schemeId),
  };

  await setCachedUrgentSchemes(payload);
  return payload;
}

async function getUrgentSchemeIds(now = new Date()) {
  const cached = await getCachedUrgentSchemes();
  if (cached?.schemeIds?.length) {
    return cached.schemeIds;
  }

  const refreshed = await refreshUrgentSchemesCache(now);
  return refreshed?.schemeIds || [];
}

function getNextRunDelayMs(now = new Date(), scheduleHourIst = DEFAULT_SCHEDULE_HOUR_IST) {
  const next = new Date(now);
  const utcHour = ((scheduleHourIst - 5.5) + 24) % 24;
  const hour = Math.floor(utcHour);
  const minutes = utcHour % 1 === 0.5 ? 30 : 0;

  next.setUTCHours(hour, minutes, 0, 0);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

function startDeadlineTrackerScheduler() {
  if (scheduleTimeout || scheduleInterval) {
    return;
  }

  const run = async () => {
    try {
      const payload = await refreshUrgentSchemesCache(new Date());
      if (payload && process.env.NODE_ENV === "development") {
        console.log(
          `[deadline] urgent scheme cache refreshed: ${payload.schemeIds.length} scheme(s)`
        );
      }
    } catch (error) {
      console.warn(`[deadline] ${error.message}`);
    }
  };

  run();

  scheduleTimeout = setTimeout(() => {
    run();
    scheduleInterval = setInterval(run, DAY_MS);
  }, getNextRunDelayMs(new Date()));
}

module.exports = {
  CACHE_TTL_SECONDS,
  attachDeadlineInfo,
  getDaysRemainingForScheme,
  getSchemeDeadlineInfo,
  getUrgentSchemeIds,
  getUrgentSchemesFromList,
  isSchemeOpenForApplications,
  refreshUrgentSchemesCache,
  startDeadlineTrackerScheduler,
};
