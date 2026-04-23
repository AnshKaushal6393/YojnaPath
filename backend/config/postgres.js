require("./env");

const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

let pool;
let schemaInitializationPromise;
let schemaInitializationFailed = false;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

async function ensureDatabaseSchema() {
  if (schemaInitializationFailed) {
    return;
  }

  if (!schemaInitializationPromise) {
    schemaInitializationPromise = (async () => {
      const sqlPath = path.join(__dirname, "..", "db", "schema.sql");
      const schemaSql = await fs.readFile(sqlPath, "utf8");
      await getPool().query(schemaSql);
    })().catch((error) => {
      const code = String(error?.code || "");
      const message = String(error?.message || "");
      const isBootstrapPermissionError =
        code === "42501" ||
        code === "42P07" ||
        code === "23505" ||
        code === "EACCES" ||
        message.toLowerCase().includes("permission denied") ||
        message.toLowerCase().includes("must be owner") ||
        message.toLowerCase().includes("already exists");

      if (isBootstrapPermissionError) {
        schemaInitializationFailed = true;
        return;
      }

      schemaInitializationPromise = null;
      throw error;
    });
  }

  return schemaInitializationPromise;
}

module.exports = {
  ensureDatabaseSchema,
  getPool,
};
