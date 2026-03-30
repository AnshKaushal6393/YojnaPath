const path = require("path");

const { isMongoReady } = require("../config/mongo");
const { Scheme } = require("../models/Scheme");
const { getImpactStats } = require("../services/analyticsService");

const backendPackageJson = require(path.join(__dirname, "..", "package.json"));

async function getApiHealth(req, res) {
  const schemeCount = isMongoReady() ? await Scheme.countDocuments({}) : 0;

  return res.json({
    status: "ok",
    uptime: process.uptime(),
    version: backendPackageJson.version,
    schemeCount,
    mongoConnected: isMongoReady(),
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
