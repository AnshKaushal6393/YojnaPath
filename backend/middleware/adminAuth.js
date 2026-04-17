require("../config/env");

const jwt = require("jsonwebtoken");

const { getRequiredEnv } = require("../config/env");

function requireAdminAuth(req, res, next) {
  const authorization = String(req.headers?.authorization || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const jwtSecret = getRequiredEnv("ADMIN_JWT_SECRET");
    const payload = jwt.verify(token, jwtSecret);
    const isAdmin = payload.role === "admin" || payload.isAdmin === true;

    if (!isAdmin || !payload.adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.admin = {
      id: payload.adminId,
      email: payload.email || "",
      role: payload.role || "admin",
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = {
  requireAdminAuth,
  verifyAdmin: requireAdminAuth,
};
