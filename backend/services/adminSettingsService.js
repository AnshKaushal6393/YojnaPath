require("../config/env");

const bcrypt = require("bcryptjs");

const { ensureDatabaseSchema, getPool } = require("../config/postgres");
const {
  findAdminAuthById,
  updateAdminPasswordHash,
} = require("./adminService");

const DEFAULT_SETTINGS = {
  loginWindowMinutes: 15,
  loginAttempts: 5,
  adminRequestsPerMinute: 60,
  usersPageSize: 25,
  schemesPageSize: 25,
  searchMaxResults: 100,
};

const SETTINGS_LIMITS = {
  loginWindowMinutes: { min: 1, max: 240 },
  loginAttempts: { min: 1, max: 20 },
  adminRequestsPerMinute: { min: 10, max: 1000 },
  usersPageSize: { min: 10, max: 500 },
  schemesPageSize: { min: 10, max: 500 },
  searchMaxResults: { min: 25, max: 5000 },
};

let adminSettingsInitializationPromise;
let cachedSettings = null;
let cachedAt = 0;
const SETTINGS_CACHE_MS = 5000;

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function clampSetting(key, value) {
  const limits = SETTINGS_LIMITS[key];
  const normalized = normalizeInteger(value, DEFAULT_SETTINGS[key]);

  if (!limits) {
    return normalized;
  }

  return Math.min(Math.max(normalized, limits.min), limits.max);
}

function mapSettingsRow(row = {}) {
  return {
    loginWindowMinutes: clampSetting("loginWindowMinutes", row.login_window_minutes),
    loginAttempts: clampSetting("loginAttempts", row.login_attempts),
    adminRequestsPerMinute: clampSetting("adminRequestsPerMinute", row.admin_requests_per_minute),
    usersPageSize: clampSetting("usersPageSize", row.users_page_size),
    schemesPageSize: clampSetting("schemesPageSize", row.schemes_page_size),
    searchMaxResults: clampSetting("searchMaxResults", row.search_max_results),
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
  };
}

async function ensureAdminSettingsTable() {
  if (!adminSettingsInitializationPromise) {
    adminSettingsInitializationPromise = (async () => {
      await ensureDatabaseSchema();
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
          login_window_minutes INTEGER NOT NULL DEFAULT 15,
          login_attempts INTEGER NOT NULL DEFAULT 5,
          admin_requests_per_minute INTEGER NOT NULL DEFAULT 60,
          users_page_size INTEGER NOT NULL DEFAULT 25,
          schemes_page_size INTEGER NOT NULL DEFAULT 25,
          search_max_results INTEGER NOT NULL DEFAULT 100,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by VARCHAR(120)
        )
      `);
      await pool.query(`
        INSERT INTO admin_settings (
          singleton,
          login_window_minutes,
          login_attempts,
          admin_requests_per_minute,
          users_page_size,
          schemes_page_size,
          search_max_results
        )
        VALUES (TRUE, 15, 5, 60, 25, 25, 100)
        ON CONFLICT (singleton) DO NOTHING
      `);
    })().catch((error) => {
      adminSettingsInitializationPromise = null;
      throw error;
    });
  }

  return adminSettingsInitializationPromise;
}

async function readAdminSettingsFromDb() {
  await ensureAdminSettingsTable();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        login_window_minutes,
        login_attempts,
        admin_requests_per_minute,
        users_page_size,
        schemes_page_size,
        search_max_results,
        updated_at,
        updated_by
      FROM admin_settings
      WHERE singleton = TRUE
      LIMIT 1
    `
  );

  return mapSettingsRow(result.rows[0] || {});
}

async function getAdminSettings(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedSettings && now - cachedAt < SETTINGS_CACHE_MS) {
    return cachedSettings;
  }

  const settings = await readAdminSettingsFromDb();
  cachedSettings = settings;
  cachedAt = now;
  return settings;
}

function clearAdminSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
}

function validatePasswordChange({ currentPassword, nextPassword, confirmPassword }) {
  const current = normalizeOptionalString(currentPassword);
  const next = normalizeOptionalString(nextPassword);
  const confirm = normalizeOptionalString(confirmPassword);

  if (!current && !next && !confirm) {
    return null;
  }

  if (!current || !next || !confirm) {
    const error = new Error("Current password, new password, and confirmation are required");
    error.status = 400;
    throw error;
  }

  if (next.length < 8) {
    const error = new Error("New password must be at least 8 characters");
    error.status = 400;
    throw error;
  }

  if (next !== confirm) {
    const error = new Error("New password and confirmation do not match");
    error.status = 400;
    throw error;
  }

  return {
    currentPassword: current,
    nextPassword: next,
  };
}

async function changeAdminPassword(adminId, passwordChange) {
  if (!passwordChange) {
    return false;
  }

  const admin = await findAdminAuthById(adminId);
  if (!admin) {
    const error = new Error("Admin not found");
    error.status = 404;
    throw error;
  }

  const isValid = await bcrypt.compare(passwordChange.currentPassword, admin.password_hash);
  if (!isValid) {
    const error = new Error("Current password is incorrect");
    error.status = 400;
    throw error;
  }

  const nextMatchesCurrent = await bcrypt.compare(passwordChange.nextPassword, admin.password_hash);
  if (nextMatchesCurrent) {
    const error = new Error("New password must be different from the current password");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(passwordChange.nextPassword, 10);
  await updateAdminPasswordHash(adminId, passwordHash);
  return true;
}

async function updateAdminSettings(input = {}, actor = null, adminId = null) {
  await ensureAdminSettingsTable();
  const pool = getPool();
  const passwordChange = validatePasswordChange(input);

  const nextSettings = {
    loginWindowMinutes: clampSetting("loginWindowMinutes", input.loginWindowMinutes),
    loginAttempts: clampSetting("loginAttempts", input.loginAttempts),
    adminRequestsPerMinute: clampSetting("adminRequestsPerMinute", input.adminRequestsPerMinute),
    usersPageSize: clampSetting("usersPageSize", input.usersPageSize),
    schemesPageSize: clampSetting("schemesPageSize", input.schemesPageSize),
    searchMaxResults: clampSetting("searchMaxResults", input.searchMaxResults),
  };

  const updatedBy = normalizeOptionalString(actor);

  const result = await pool.query(
    `
      UPDATE admin_settings
      SET
        login_window_minutes = $1,
        login_attempts = $2,
        admin_requests_per_minute = $3,
        users_page_size = $4,
        schemes_page_size = $5,
        search_max_results = $6,
        updated_at = NOW(),
        updated_by = $7
      WHERE singleton = TRUE
      RETURNING
        login_window_minutes,
        login_attempts,
        admin_requests_per_minute,
        users_page_size,
        schemes_page_size,
        search_max_results,
        updated_at,
        updated_by
    `,
    [
      nextSettings.loginWindowMinutes,
      nextSettings.loginAttempts,
      nextSettings.adminRequestsPerMinute,
      nextSettings.usersPageSize,
      nextSettings.schemesPageSize,
      nextSettings.searchMaxResults,
      updatedBy,
    ]
  );

  const passwordChanged = adminId ? await changeAdminPassword(adminId, passwordChange) : false;
  clearAdminSettingsCache();
  const settings = mapSettingsRow(result.rows[0] || {});

  return {
    ...settings,
    passwordChanged,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  clearAdminSettingsCache,
  getAdminSettings,
  updateAdminSettings,
};
