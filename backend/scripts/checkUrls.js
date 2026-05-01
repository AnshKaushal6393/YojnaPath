require("../config/env");

const mongoose = require("mongoose");

const { Scheme } = require("../models/Scheme");

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_BATCH_DELAY_MS = 500;
const DEFAULT_DB_RETRIES = 4;
const DEFAULT_DB_RETRY_DELAY_MS = 2500;
const MYSCHEME_SEARCH_BASE_URL = "https://www.myscheme.gov.in/search";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    batchSize: Number(process.env.URL_CHECK_BATCH_SIZE || DEFAULT_BATCH_SIZE),
    timeoutMs: Number(process.env.URL_CHECK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    batchDelayMs: Number(process.env.URL_CHECK_BATCH_DELAY_MS || DEFAULT_BATCH_DELAY_MS),
    dbRetries: Number(process.env.URL_CHECK_DB_RETRIES || DEFAULT_DB_RETRIES),
    dbRetryDelayMs: Number(process.env.URL_CHECK_DB_RETRY_DELAY_MS || DEFAULT_DB_RETRY_DELAY_MS),
    force: false,
    limit: Number(process.env.URL_CHECK_LIMIT || 0),
  };

  argv.forEach((arg) => {
    if (arg === "--force") {
      options.force = true;
      return;
    }

    if (arg.startsWith("--batch-size=")) {
      options.batchSize = Number(arg.slice("--batch-size=".length)) || DEFAULT_BATCH_SIZE;
      return;
    }

    if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number(arg.slice("--timeout-ms=".length)) || DEFAULT_TIMEOUT_MS;
      return;
    }

    if (arg.startsWith("--delay-ms=")) {
      options.batchDelayMs = Number(arg.slice("--delay-ms=".length)) || DEFAULT_BATCH_DELAY_MS;
      return;
    }

    if (arg.startsWith("--db-retries=")) {
      options.dbRetries = Number(arg.slice("--db-retries=".length)) || DEFAULT_DB_RETRIES;
      return;
    }

    if (arg.startsWith("--db-retry-delay-ms=")) {
      options.dbRetryDelayMs = Number(arg.slice("--db-retry-delay-ms=".length)) || DEFAULT_DB_RETRY_DELAY_MS;
      return;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length)) || 0;
    }
  });

  return {
    batchSize: Math.max(options.batchSize, 1),
    timeoutMs: Math.max(options.timeoutMs, 1000),
    batchDelayMs: Math.max(options.batchDelayMs, 0),
    dbRetries: Math.max(options.dbRetries, 0),
    dbRetryDelayMs: Math.max(options.dbRetryDelayMs, 0),
    force: Boolean(options.force),
    limit: Math.max(options.limit, 0),
  };
}

async function fetchWithTimeout(url, { method, timeout }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YojnaPath/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url, timeout = DEFAULT_TIMEOUT_MS) {
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", timeout });

    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, { method: "GET", timeout });
    }

    return {
      alive: res.status < 400,
      status: res.status,
      finalUrl: res.url,
    };
  } catch (err) {
    return {
      alive: false,
      status: 0,
      error: err?.name === "AbortError" ? `Timed out after ${timeout}ms` : err?.message,
    };
  }
}

function buildFallbackUrl(scheme = {}) {
  const name = scheme?.name?.en || scheme?.name?.hi || scheme?.schemeId || "";
  const params = new URLSearchParams();

  if (name) {
    params.set("keyword", name);
  }

  return params.toString() ? `${MYSCHEME_SEARCH_BASE_URL}?${params.toString()}` : MYSCHEME_SEARCH_BASE_URL;
}

function isMySchemeSearchUrl(value) {
  return String(value || "").startsWith(MYSCHEME_SEARCH_BASE_URL);
}

function buildSchemeUrlUpdate(scheme, result, checkedAt = new Date()) {
  const redirected = result.finalUrl && result.finalUrl !== scheme.applyUrl;
  const fallbackUrl = buildFallbackUrl(scheme);
  const hasFallback =
    scheme?.applyUrlStatus === "fallback" ||
    isMySchemeSearchUrl(scheme?.applyUrlFinal) ||
    Boolean(scheme?.originalApplyUrl);
  const shouldKeepFallback = !result.alive && hasFallback;
  const applyUrlStatus = shouldKeepFallback
    ? "fallback"
    : result.alive
      ? (redirected ? "redirected" : "ok")
      : "dead";
  const applyUrlFinal = shouldKeepFallback
    ? fallbackUrl
    : result.finalUrl || null;

  return {
    urlStatus: result.alive ? "live" : "dead",
    urlCheckedAt: checkedAt,
    urlHttpStatus: result.status,
    applyUrlStatus,
    applyUrlCheckedAt: checkedAt,
    applyUrlFinal,
    applyUrlError: result.error || null,
    originalApplyUrl: scheme?.originalApplyUrl || (shouldKeepFallback ? scheme?.applyUrl || null : null),
    ...(redirected ? { applyUrlRedirect: result.finalUrl } : { applyUrlRedirect: null }),
  };
}

function isRetryableMongoError(error) {
  const message = String(error?.message || "");
  return (
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongoNetworkTimeoutError" ||
    error?.name === "MongoNetworkError" ||
    /timed out|ECONNRESET|ReplicaSetNoPrimary|connection/i.test(message)
  );
}

async function updateSchemeUrlStatus(schemeId, update, options) {
  let attempt = 0;

  while (true) {
    try {
      return await Scheme.updateOne({ schemeId }, update);
    } catch (error) {
      attempt += 1;
      if (attempt > options.dbRetries || !isRetryableMongoError(error)) {
        throw error;
      }

      const delay = options.dbRetryDelayMs * attempt;
      console.warn(
        `Mongo update retry ${attempt}/${options.dbRetries} for ${schemeId}: ${error.message}. Waiting ${delay}ms...`
      );
      await wait(delay);
    }
  }
}

async function runUrlCheck(options = parseArgs()) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);

  try {
    const filter = {
      applyUrl: { $exists: true, $nin: [null, ""] },
      ...(options.force
        ? {}
        : {
            $or: [
              { urlCheckedAt: { $exists: false } },
              { urlCheckedAt: null },
            ],
          }),
    };

    let query = Scheme.find(
      filter,
      { schemeId: 1, name: 1, applyUrl: 1, originalApplyUrl: 1, applyUrlStatus: 1, applyUrlFinal: 1 }
    ).sort({ schemeId: 1 });

    if (options.limit > 0) {
      query = query.limit(options.limit);
    }

    const schemes = await query.lean();
    console.log(
      options.force
        ? `Checking ${schemes.length} URLs...`
        : `Resuming URL check for ${schemes.length} unchecked URLs...`
    );

    let dead = 0;
    let alive = 0;

    for (let i = 0; i < schemes.length; i += options.batchSize) {
      const batch = schemes.slice(i, i + options.batchSize);
      const results = await Promise.all(batch.map((scheme) => checkUrl(scheme.applyUrl, options.timeoutMs)));

      for (let j = 0; j < batch.length; j += 1) {
        const scheme = batch[j];
        const result = results[j];
        const checkedAt = new Date();

        await updateSchemeUrlStatus(
          scheme.schemeId,
          {
            $set: buildSchemeUrlUpdate(scheme, result, checkedAt),
          },
          options
        );

        if (result.alive) {
          alive += 1;
        } else {
          dead += 1;
          console.log(`DEAD: ${scheme.schemeId} | ${scheme.applyUrl} | ${result.error || result.status}`);
        }
      }

      const processed = Math.min(i + options.batchSize, schemes.length);
      console.log(`Progress: ${processed}/${schemes.length} | Live: ${alive} | Dead: ${dead}`);

      if (processed < schemes.length && options.batchDelayMs > 0) {
        await wait(options.batchDelayMs);
      }
    }

    console.log(`\nDone. Live: ${alive}, Dead: ${dead}`);
    return { total: schemes.length, live: alive, dead };
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runUrlCheck().catch((error) => {
    console.error("URL check failed");
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildFallbackUrl,
  buildSchemeUrlUpdate,
  checkUrl,
  isMySchemeSearchUrl,
  parseArgs,
  runUrlCheck,
  updateSchemeUrlStatus,
};
