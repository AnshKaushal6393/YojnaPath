require("../config/env");

const jwt = require("jsonwebtoken");

const { getRequiredEnv } = require("../config/env");

function getBearerToken(req) {
  const authorization = String(req.headers?.authorization || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function decodeAuthToken(token) {
  const jwtSecret = getRequiredEnv("JWT_SECRET");
  const payload = jwt.verify(token, jwtSecret);

  return {
    id: payload.userId ?? payload.kioskId ?? null,
    phone: payload.phone,
    kioskId: payload.kioskId ?? null,
    role: payload.role,
  };
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = decodeAuthToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

function attachUserIfPresent(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    req.user = decodeAuthToken(token);
  } catch {
    req.user = null;
  }

  return next();
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
  attachUserIfPresent,
  requireAuth,
  requireRole,
};
