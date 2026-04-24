const { getAdminReport } = require("../services/adminReportService");

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

async function getReports(req, res) {
  const payload = await getAdminReport({
    reportType: normalizeOptionalString(req.query?.reportType),
    startDate: normalizeOptionalString(req.query?.startDate),
    endDate: normalizeOptionalString(req.query?.endDate),
  });

  return res.json(payload);
}

module.exports = {
  getReports,
};
