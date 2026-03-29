require("./config/env");

const express = require("express");

const authRoutes = require("./routes/auth");
const applicationsRoutes = require("./routes/applications");
const kioskRoutes = require("./routes/kiosk");
const profileRoutes = require("./routes/profile");
const publicRoutes = require("./routes/public");
const savedRoutes = require("./routes/saved");
const schemesRoutes = require("./routes/schemes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/kiosk", kioskRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/schemes", schemesRoutes);

const port = Number(process.env.PORT || 4000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

module.exports = app;
