require("./env");

const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

let pool;
let schemaInitializationPromise;

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
  if (!schemaInitializationPromise) {
    schemaInitializationPromise = (async () => {
      const sqlPath = path.join(__dirname, "..", "db", "schema.sql");
      const schemaSql = await fs.readFile(sqlPath, "utf8");
      await getPool().query(schemaSql);
    })().catch((error) => {
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
