require("./config/env");

const express = require("express");
const { connectMongo } = require("./config/mongo");
const { ensureDatabaseSchema } = require("./config/postgres");
const { startDeadlineTrackerScheduler } = require("./services/deadlineTrackerService");

const adminAuthRoutes = require("./routes/adminAuth");
const authRoutes = require("./routes/auth");
const applicationsRoutes = require("./routes/applications");
const kioskRoutes = require("./routes/kiosk");
const { generalApiLimiter } = require("./middleware/rateLimit");
const profileRoutes = require("./routes/profile");
const publicRoutes = require("./routes/public");
const savedRoutes = require("./routes/saved");
const schemesRoutes = require("./routes/schemes");
const uploadRoutes = require("./routes/upload");

const app = express();
app.set("trust proxy", 1);

function parseAllowedOrigins(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((value) => value.trim())
    .map((value) => value.replace(/\/+$/, ""))
    .filter(Boolean);
}

const allowedOrigins = [
  ...new Set(
    [
      ...parseAllowedOrigins(process.env.CORS_ORIGIN),
      ...parseAllowedOrigins(process.env.FRONTEND_URL),
    ].filter(Boolean)
  ),
];

app.use((req, res, next) => {
  const requestOrigin = String(req.headers.origin || "").replace(/\/+$/, "");

  if (!requestOrigin) {
    next();
    return;
  }

  if (!allowedOrigins.length || allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use("/api", generalApiLimiter);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/kiosk", kioskRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/upload", uploadRoutes);

const port = Number(process.env.PORT || 4000);

if (require.main === module) {
  connectMongo().catch((error) => {
    console.warn(`[mongo] ${error.message}`);
    console.warn("[mongo] Backend will continue with limited functionality until MongoDB is available.");
  });

  startDeadlineTrackerScheduler();

  ensureDatabaseSchema()
    .catch((error) => {
      console.warn(`[postgres] ${error.message}`);
      console.warn("[postgres] Backend will continue, but auth/profile features may fail until schema setup succeeds.");
    })
    .finally(() => {
      app.listen(port, () => {
        console.log(`Backend listening on port ${port}`);
      });
    });
}

module.exports = app;
