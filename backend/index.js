require("./config/env");

const express = require("express");
const { connectMongo } = require("./config/mongo");
const { startDeadlineTrackerScheduler } = require("./services/deadlineTrackerService");
const { runStartupSchemaBootstrap } = require("./services/schemaBootstrapService");
const { startUrlHealthScheduler } = require("./services/urlHealthSchedulerService");

const adminRoutes = require("./routes/admin");
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

function buildAllowedOriginMatchers() {
  const configuredOrigins = [
    ...parseAllowedOrigins(process.env.CORS_ORIGIN),
    ...parseAllowedOrigins(process.env.FRONTEND_URL),
  ];
  const defaultOrigins = ["http://localhost:5173", "http://localhost:4173"];
  const exactOrigins = new Set([...configuredOrigins, ...defaultOrigins].filter(Boolean));
  const vercelPatterns = [];

  for (const origin of exactOrigins) {
    try {
      const { hostname } = new URL(origin);

      if (hostname.endsWith(".vercel.app")) {
        const escapedHostname = hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        vercelPatterns.push(new RegExp(`^https://${escapedHostname}$`));

        const projectName = hostname.replace(/-git-[^.]+\.vercel\.app$/i, "").replace(/\.vercel\.app$/i, "");
        if (projectName) {
          const escapedProjectName = projectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          vercelPatterns.push(new RegExp(`^https://${escapedProjectName}(?:-[^.]+)?\\.vercel\\.app$`, "i"));
        }
      }
    } catch {
      // Ignore malformed configured origins and continue with the valid entries.
    }
  }

  return { exactOrigins, vercelPatterns };
}

const { exactOrigins: allowedOrigins, vercelPatterns: allowedOriginPatterns } =
  buildAllowedOriginMatchers();

function isAllowedOrigin(origin) {
  return allowedOrigins.has(origin) || allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

app.use((req, res, next) => {
  const requestOrigin = String(req.headers.origin || "").replace(/\/+$/, "");

  if (!requestOrigin) {
    next();
    return;
  }

  if (!allowedOrigins.size || isAllowedOrigin(requestOrigin)) {
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
app.use("/api/admin", adminRoutes);
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
  startUrlHealthScheduler();

  runStartupSchemaBootstrap()
    .then((result) => {
      if (!result.ok) {
        result.failures.forEach(({ name, error }) => {
          console.warn(`[postgres:${name}] ${error?.message || error}`);
        });
        console.warn("[postgres] Backend will continue, but some runtime migrations did not finish.");
      }
    })
    .catch((error) => {
      console.warn(`[postgres] ${error.message}`);
      console.warn("[postgres] Backend will continue, but startup schema bootstrap failed.");
    })
    .finally(() => {
      app.listen(port, () => {
        console.log(`Backend listening on port ${port}`);
      });
    });
}

module.exports = app;
