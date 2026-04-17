require("../config/env");

const bcrypt = require("bcryptjs");

const { ensureAdminTable, findAdminByEmail } = require("../services/adminService");
const { getPool } = require("../config/postgres");

function printUsage() {
  console.log("Usage: npm run create:admin -- <email> <password>");
}

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  const email = String(emailArg || "").trim().toLowerCase();
  const password = String(passwordArg || "");

  if (!email || !password) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exitCode = 1;
    return;
  }

  await ensureAdminTable();

  const existingAdmin = await findAdminByEmail(email);
  if (existingAdmin) {
    console.error(`Admin already exists for ${email}.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const pool = getPool();
  const result = await pool.query(
    `
      INSERT INTO admins (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `,
    [email, passwordHash]
  );

  const admin = result.rows[0];
  console.log(`Admin created: ${admin.email}`);
  console.log(`Admin id: ${admin.id}`);
  console.log(`Created at: ${admin.created_at}`);
}

main()
  .catch((error) => {
    console.error("Failed to create admin.");
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPool().end();
    } catch (error) {
      // Ignore pool shutdown errors on exit.
    }
  });
