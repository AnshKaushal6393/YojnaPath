const { getAdminOverview, getAdminStats } = require("../services/adminDashboardService");

async function getDashboard(req, res) {
  const overview = await getAdminOverview();

  return res.json({
    admin: req.admin,
    overview,
  });
}

async function getStats(req, res) {
  const stats = await getAdminStats();
  return res.json(stats);
}

module.exports = {
  getDashboard,
  getStats,
};
