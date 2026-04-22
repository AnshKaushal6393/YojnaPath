const { getAdminFunnel } = require("../services/adminDashboardService");
const {
  getAnalyticsKiosk,
  getAnalyticsOverview,
  getAnalyticsPhoto,
  getAnalyticsSchemes,
} = require("../services/adminAnalyticsService");

async function getAnalyticsOverviewRoute(req, res) {
  return res.json(await getAnalyticsOverview());
}

async function getAnalyticsFunnelRoute(req, res) {
  return res.json(await getAdminFunnel());
}

async function getAnalyticsNearMissRoute(req, res) {
  const payload = await getAnalyticsSchemes();
  return res.json({
    generatedAt: payload.generatedAt,
    analyzedProfiles: payload.analyzedProfiles,
    totalNearMisses: payload.totalNearMisses,
    criteria: payload.nearMissCriteria.slice(0, 10),
    schemes: payload.schemes.slice(0, 20).map((scheme) => ({
      schemeId: scheme.schemeId,
      name: scheme.name,
      nearMisses: scheme.nearMisses,
    })),
  });
}

async function getAnalyticsSchemesRoute(req, res) {
  return res.json(await getAnalyticsSchemes());
}

async function getAnalyticsPhotoRoute(req, res) {
  return res.json(await getAnalyticsPhoto());
}

async function getAnalyticsKioskRoute(req, res) {
  return res.json(await getAnalyticsKiosk());
}

module.exports = {
  getAnalyticsFunnelRoute,
  getAnalyticsKioskRoute,
  getAnalyticsNearMissRoute,
  getAnalyticsOverviewRoute,
  getAnalyticsPhotoRoute,
  getAnalyticsSchemesRoute,
};
