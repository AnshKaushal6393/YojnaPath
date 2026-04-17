require("../config/env");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { ADMIN_JWT_EXPIRES_IN } = require("../config/constants");
const { getRequiredEnv } = require("../config/env");
const { findAdminByEmail, findAdminById, recordAdminLogin } = require("../services/adminService");

function serializeAdmin(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    lastLogin: admin.last_login || null,
  };
}

async function login(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  await recordAdminLogin(admin.id);
  const jwtSecret = getRequiredEnv("ADMIN_JWT_SECRET");
  const token = jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      isAdmin: true,
      role: "admin",
    },
    jwtSecret,
    { expiresIn: ADMIN_JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    admin: serializeAdmin({
      ...admin,
      last_login: new Date().toISOString(),
    }),
  });
}

async function me(req, res) {
  const admin = await findAdminById(req.admin.id);
  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  return res.json({
    admin: serializeAdmin(admin),
  });
}

module.exports = {
  login,
  me,
};
