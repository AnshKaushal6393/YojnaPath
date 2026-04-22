require("../config/env");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { getNearMisses, matchScheme } = require("../engine/matcher");
const { recordKioskPdfDownload } = require("./analyticsService");

const PHOTO_TYPES = ["camera", "upload", "generated", "none"];

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function formatDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateSeries(days = 30) {
  const series = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    series.push(formatDayKey(day));
  }

  return series;
}

async function getAnalyticsOverview() {
  await ensureDatabaseSchema();
  const pool = getPool();
  const [dailyMatches, userTypes, states, languages, totals] = await Promise.all([
    pool.query(`
      SELECT
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::INT AS count
      FROM match_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
    `),
    pool.query(`
      SELECT COALESCE(occupation, 'unknown') AS key, COUNT(*)::INT AS count
      FROM match_logs
      GROUP BY COALESCE(occupation, 'unknown')
      ORDER BY count DESC, key ASC
    `),
    pool.query(`
      SELECT COALESCE(state, 'unknown') AS key, COUNT(*)::INT AS count
      FROM match_logs
      GROUP BY COALESCE(state, 'unknown')
      ORDER BY count DESC, key ASC
    `),
    pool.query(`
      SELECT COALESCE(lang, 'unknown') AS key, COUNT(*)::INT AS count
      FROM match_logs
      GROUP BY COALESCE(lang, 'unknown')
      ORDER BY count DESC, key ASC
    `),
    pool.query(`
      SELECT
        COUNT(*)::INT AS matches,
        COALESCE(SUM(near_miss_count), 0)::INT AS near_misses
      FROM match_logs
    `),
  ]);

  const dailyMap = new Map(dailyMatches.rows.map((row) => [row.day, Number(row.count || 0)]));
  const days = buildDateSeries(30);

  return {
    generatedAt: new Date().toISOString(),
    matchesByDay: days.map((day) => ({
      day,
      count: dailyMap.get(day) || 0,
    })),
    userTypes: userTypes.rows.map((row) => ({
      key: row.key || "unknown",
      count: Number(row.count || 0),
    })),
    states: states.rows.map((row) => ({
      key: row.key || "unknown",
      count: Number(row.count || 0),
    })),
    languages: languages.rows.map((row) => ({
      key: row.key || "unknown",
      count: Number(row.count || 0),
    })),
    totals: {
      matches: Number(totals.rows[0]?.matches || 0),
      nearMisses: Number(totals.rows[0]?.near_misses || 0),
    },
  };
}

async function getAnalyticsPhoto() {
  await ensureDatabaseSchema();
  const pool = getPool();
  const result = await pool.query(`
    SELECT photo_type, COUNT(*)::INT AS count
    FROM users
    GROUP BY photo_type
    ORDER BY photo_type ASC
  `);

  const rows = result.rows.map((row) => ({
    key: row.photo_type || "none",
    count: Number(row.count || 0),
  }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    total,
    breakdown: rows.map((row) => ({
      ...row,
      pct: total > 0 ? (row.count / total) * 100 : 0,
      label: row.key === "none" ? "No photo" : row.key,
    })),
  };
}

async function getAnalyticsKiosk() {
  await ensureDatabaseSchema();
  const pool = getPool();
  const [sessions, pdfDownloads, userTypes] = await Promise.all([
    pool.query(`
      SELECT COALESCE(kiosk_id::text, 'unknown') AS key, COUNT(*)::INT AS count
      FROM kiosk_usage_events
      GROUP BY COALESCE(kiosk_id::text, 'unknown')
      ORDER BY count DESC, key ASC
    `),
    pool.query(`
      SELECT COALESCE(kiosk_id::text, 'unknown') AS key, COUNT(*)::INT AS count
      FROM kiosk_pdf_events
      GROUP BY COALESCE(kiosk_id::text, 'unknown')
      ORDER BY count DESC, key ASC
    `),
    pool.query(`
      SELECT COALESCE(occupation, 'unknown') AS key, COUNT(*)::INT AS count
      FROM match_logs
      WHERE session_type = 'kiosk'
      GROUP BY COALESCE(occupation, 'unknown')
      ORDER BY count DESC, key ASC
    `),
  ]);

  const totalSessions = sessions.rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const totalPdfDownloads = pdfDownloads.rows.reduce((sum, row) => sum + Number(row.count || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    totalSessions,
    totalPdfDownloads,
    sessionsByWorker: sessions.rows.map((row) => ({
      key: row.key,
      count: Number(row.count || 0),
    })),
    pdfDownloadsByWorker: pdfDownloads.rows.map((row) => ({
      key: row.key,
      count: Number(row.count || 0),
    })),
    userTypesServed: userTypes.rows.map((row) => ({
      key: row.key || "unknown",
      count: Number(row.count || 0),
    })),
  };
}

async function getAnalyticsSchemes() {
  if (!isMongoReady()) {
    return {
      generatedAt: new Date().toISOString(),
      schemes: [],
      totalMatches: 0,
      totalNearMisses: 0,
      totalApplications: 0,
    };
  }

  await ensureDatabaseSchema();
  const pool = getPool();
  const [schemes, primaryProfiles, applications] = await Promise.all([
    Scheme.find({ active: true }).sort({ schemeId: 1 }).lean(),
    pool.query(`
      SELECT
        p.state,
        p.occupation,
        p.annual_income,
        p.caste,
        p.gender,
        p.age,
        p.land_acres,
        p.disability_pct,
        p.is_student
      FROM profiles p
      WHERE p.is_primary = TRUE
      ORDER BY p.updated_at DESC
    `),
    pool.query(`
      SELECT scheme_id, COUNT(*)::INT AS count
      FROM applications
      GROUP BY scheme_id
    `),
  ]);

  const matchCountsResult = await pool.query(
    `
      SELECT scheme_id, COUNT(*)::INT AS count
      FROM match_logs
      CROSS JOIN LATERAL UNNEST(COALESCE(scheme_ids, ARRAY[]::TEXT[])) AS scheme_id
      GROUP BY scheme_id
    `
  );

  const profileRows = primaryProfiles.rows.length
    ? primaryProfiles.rows
    : await pool.query(`
        SELECT
          p.state,
          p.occupation,
          p.annual_income,
          p.caste,
          p.gender,
          p.age,
          p.land_acres,
          p.disability_pct,
          p.is_student
        FROM profiles p
        ORDER BY p.updated_at DESC
      `).then((result) => result.rows);

  const matchCounts = new Map(matchCountsResult.rows.map((row) => [row.scheme_id, Number(row.count || 0)]));
  const applicationCounts = new Map(applications.rows.map((row) => [row.scheme_id, Number(row.count || 0)]));
  const nearMissCounts = new Map();
  const nearMissCriteriaCounts = new Map();
  const analyzedProfiles = profileRows.length;

  for (const row of profileRows) {
    const profile = {
      state: normalizeOptionalString(row.state)?.toUpperCase() || null,
      occupation: normalizeOptionalString(row.occupation) || null,
      annual_income: Number.isFinite(Number(row.annual_income)) ? Number(row.annual_income) : null,
      caste: normalizeOptionalString(row.caste)?.toLowerCase() || null,
      gender: normalizeOptionalString(row.gender)?.toLowerCase() || null,
      age: Number.isFinite(Number(row.age)) ? Number(row.age) : null,
      landAcres: Number.isFinite(Number(row.land_acres)) ? Number(row.land_acres) : 0,
      disabilityPct: Number.isFinite(Number(row.disability_pct)) ? Number(row.disability_pct) : 0,
      isStudent: Boolean(row.is_student),
    };

    const matchedIds = new Set();
    for (const scheme of schemes) {
      if (matchScheme(profile, scheme)) {
        matchedIds.add(scheme.schemeId);
      }
    }

    const nearMisses = getNearMisses(profile, schemes, matchedIds, { nearMissGap: 1, limitNearMisses: 50 });
    nearMisses.forEach((scheme) => {
      nearMissCounts.set(scheme.schemeId, (nearMissCounts.get(scheme.schemeId) || 0) + 1);
      (scheme.failedCriteria || []).forEach((criterion) => {
        const key = criterion?.type || "unknown";
        nearMissCriteriaCounts.set(key, (nearMissCriteriaCounts.get(key) || 0) + 1);
      });
    });
  }

  const schemeRows = schemes.map((scheme) => {
    const matches = matchCounts.get(scheme.schemeId) || 0;
    const applicationsCount = applicationCounts.get(scheme.schemeId) || 0;
    const nearMisses = nearMissCounts.get(scheme.schemeId) || 0;
    return {
      schemeId: scheme.schemeId,
      name: scheme.name?.en || scheme.name?.hi || "Untitled",
      matches,
      nearMisses,
      applications: applicationsCount,
      applyClickedRate: matches > 0 ? (applicationsCount / matches) * 100 : 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    analyzedProfiles,
    totalMatches: schemeRows.reduce((sum, row) => sum + row.matches, 0),
    totalNearMisses: schemeRows.reduce((sum, row) => sum + row.nearMisses, 0),
    totalApplications: schemeRows.reduce((sum, row) => sum + row.applications, 0),
    nearMissCriteria: Array.from(nearMissCriteriaCounts.entries())
      .map(([key, count]) => ({
        key,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    schemes: schemeRows
      .sort((a, b) => b.matches - a.matches || b.nearMisses - a.nearMisses || a.schemeId.localeCompare(b.schemeId))
      .slice(0, 50),
  };
}

async function recordKioskPdfDownloadEvent(kioskId) {
  await recordKioskPdfDownload(kioskId);
  return { ok: true };
}

module.exports = {
  getAnalyticsOverview,
  getAnalyticsPhoto,
  getAnalyticsKiosk,
  getAnalyticsSchemes,
  recordKioskPdfDownloadEvent,
};
