require("../config/env");

const jwt = require("jsonwebtoken");

const { getRequiredEnv } = require("../config/env");

function requireAuth(req, res, next) {
  const authorization = String(req.headers?.authorization || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    const payload = jwt.verify(token, jwtSecret);

    req.user = {
      id: payload.userId ?? payload.kioskId ?? null,
      phone: payload.phone,
      kioskId: payload.kioskId ?? null,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
