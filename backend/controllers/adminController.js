const {
  getAdminActivity,
  getAdminFunnel,
  getAdminOverview,
  getAdminStats,
} = require("../services/adminDashboardService");

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

async function getActivity(req, res) {
  const activity = await getAdminActivity();
  return res.json({ events: activity });
}

async function getFunnel(req, res) {
  const funnel = await getAdminFunnel();
  return res.json(funnel);
}

module.exports = {
  getActivity,
  getDashboard,
  getFunnel,
  getStats,
};
