require("../config/env");

const http = require("http");
const https = require("https");
const mongoose = require("mongoose");

const { Scheme } = require("../models/Scheme");

const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_LIMIT = 0;
const MAX_REDIRECTS = 5;
const FALLBACK_BASE_URL = "https://www.myscheme.gov.in/search";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    includeInactive: false,
    repair: false,
    limit: DEFAULT_LIMIT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  argv.forEach((arg) => {
    if (arg === "--dry-run") {
      options.dryRun = true;
      return;
    }

    if (arg === "--include-inactive") {
      options.includeInactive = true;
      return;
    }

    if (arg === "--repair") {
      options.repair = true;
      return;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Math.max(Number(arg.slice("--limit=".length)) || 0, 0);
      return;
    }

    if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Math.max(Number(arg.slice("--timeout-ms=".length)) || DEFAULT_TIMEOUT_MS, 1000);
    }
  });

  return options;
}

function buildFallbackUrl(scheme) {
  const name = scheme?.name?.en || scheme?.name?.hi || scheme?.schemeId || "";
  const params = new URLSearchParams();

  if (name) {
    params.set("keyword", name);
  }

  return params.toString() ? `${FALLBACK_BASE_URL}?${params.toString()}` : FALLBACK_BASE_URL;
}

function normalizeErrorMessage(error) {
  const message = String(error?.message || error || "URL check failed").trim();
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function isDeadStatus(statusCode) {
  return statusCode === 400 || statusCode === 404 || statusCode === 410 || statusCode >= 500;
}

function isBlockedStatus(statusCode) {
  return statusCode === 401 || statusCode === 403 || statusCode === 429;
}

function requestUrl(url, { method = "HEAD", timeoutMs = DEFAULT_TIMEOUT_MS, redirects = 0 } = {}) {
  return new Promise((resolve) => {
    let parsed;

    try {
      parsed = new URL(url);
    } catch (error) {
      resolve({
        status: "dead",
        statusCode: null,
        finalUrl: url,
        error: "Invalid URL",
      });
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      resolve({
        status: "dead",
        statusCode: null,
        finalUrl: parsed.toString(),
        error: `Unsupported protocol: ${parsed.protocol}`,
      });
      return;
    }

    const transport = parsed.protocol === "http:" ? http : https;
    const request = transport.request(
      parsed,
      {
        method,
        timeout: timeoutMs,
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-IN,en;q=0.9",
          "user-agent": "Mozilla/5.0 (compatible; YojnaPathBot/1.0; +https://www.myscheme.gov.in)",
          ...(method === "GET" ? { range: "bytes=0-0" } : {}),
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;
        response.resume();

        if (statusCode >= 300 && statusCode < 400 && location && redirects < MAX_REDIRECTS) {
          const nextUrl = new URL(location, parsed).toString();
          requestUrl(nextUrl, { method, timeoutMs, redirects: redirects + 1 }).then((result) => {
            resolve({
              ...result,
              status: result.status === "ok" ? "redirected" : result.status,
            });
          });
          return;
        }

        if (method === "HEAD" && (statusCode === 405 || statusCode === 501)) {
          requestUrl(url, { method: "GET", timeoutMs, redirects }).then(resolve);
          return;
        }

        if (statusCode >= 200 && statusCode < 400) {
          resolve({
            status: redirects > 0 ? "redirected" : "ok",
            statusCode,
            finalUrl: parsed.toString(),
            error: null,
          });
          return;
        }

        if (isBlockedStatus(statusCode)) {
          resolve({
            status: "blocked",
            statusCode,
            finalUrl: parsed.toString(),
            error: `HTTP ${statusCode}`,
          });
          return;
        }

        resolve({
          status: isDeadStatus(statusCode) ? "dead" : "unknown",
          statusCode,
          finalUrl: parsed.toString(),
          error: `HTTP ${statusCode}`,
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });

    request.on("error", (error) => {
      if (method === "HEAD") {
        requestUrl(url, { method: "GET", timeoutMs, redirects }).then(resolve);
        return;
      }

      resolve({
        status: "dead",
        statusCode: null,
        finalUrl: parsed.toString(),
        error: normalizeErrorMessage(error),
      });
    });

    request.end();
  });
}

async function auditSchemeUrls(options = parseArgs()) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to audit scheme URLs");
  }

  await mongoose.connect(mongoUri);

  const query = options.includeInactive ? {} : { active: true };
  let cursor = Scheme.find(query).sort({ schemeId: 1 });
  if (options.limit > 0) {
    cursor = cursor.limit(options.limit);
  }

  const schemes = await cursor;
  const summary = {
    scanned: schemes.length,
    ok: 0,
    redirected: 0,
    blocked: 0,
    dead: 0,
    fallback: 0,
    unknown: 0,
    updated: 0,
  };

  try {
    for (const scheme of schemes) {
      const result = await requestUrl(scheme.applyUrl, { timeoutMs: options.timeoutMs });
      const fallbackUrl = buildFallbackUrl(scheme);
      const shouldRepair = options.repair && result.status === "dead";
      const nextStatus = shouldRepair ? "fallback" : result.status;
      const errorSuffix = result.statusCode ? ` (${result.statusCode})` : "";

      summary[nextStatus] = (summary[nextStatus] || 0) + 1;

      console.log(
        [
          `[${nextStatus}]`,
          scheme.schemeId,
          shouldRepair ? `${scheme.applyUrl} => fallback ${fallbackUrl}` : scheme.applyUrl,
          result.error ? `- ${result.error}${errorSuffix}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (!options.dryRun) {
        const update = {
          applyUrlStatus: nextStatus,
          applyUrlCheckedAt: new Date(),
          applyUrlFinal: shouldRepair ? fallbackUrl : result.finalUrl,
          applyUrlError: result.error || null,
        };

        if (shouldRepair) {
          update.originalApplyUrl = scheme.originalApplyUrl || scheme.applyUrl;
        }

        await Scheme.updateOne({ _id: scheme._id }, { $set: update });
        summary.updated += 1;
      }
    }

    return summary;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  auditSchemeUrls()
    .then((summary) => {
      console.log("Scheme URL audit completed");
      console.table(summary);
    })
    .catch((error) => {
      console.error("Scheme URL audit failed");
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  auditSchemeUrls,
  buildFallbackUrl,
  requestUrl,
};
