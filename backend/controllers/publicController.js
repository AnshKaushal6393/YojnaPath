const path = require("path");

const { Scheme } = require("../models/Scheme");
const { getImpactStats } = require("../services/analyticsService");

const backendPackageJson = require(path.join(__dirname, "..", "package.json"));

async function getApiHealth(req, res) {
  const schemeCount = await Scheme.countDocuments({});

  return res.json({
    status: "ok",
    uptime: process.uptime(),
    version: backendPackageJson.version,
    schemeCount,
    timestamp: new Date().toISOString(),
  });
}

async function getImpact(req, res) {
  const stats = await getImpactStats();
  return res.json(stats);
}

module.exports = {
  getApiHealth,
  getImpact,
};
