const {
  getAdminActivity,
  getAdminFunnel,
  getAdminOverview,
  getAdminStats,
} = require("../services/adminDashboardService");
const {
  deleteAdminUserById,
  exportAdminUsersCsv,
  getAdminUserById,
  getAdminUserLiveMatches,
  getAdminUserMatches,
  listAdminUsers,
} = require("../services/adminUserService");

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

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

async function getUsers(req, res) {
  const payload = await listAdminUsers({
    page: req.query?.page,
    limit: req.query?.limit,
    state: normalizeOptionalString(req.query?.state),
    userType: normalizeOptionalString(req.query?.userType),
    search: normalizeOptionalString(req.query?.search),
    hasPhoto: req.query?.hasPhoto,
    sortBy: normalizeOptionalString(req.query?.sortBy),
    sortDir: normalizeOptionalString(req.query?.sortDir),
  });

  return res.json(payload);
}

async function getUserById(req, res) {
  const userId = normalizeOptionalString(req.params?.id);

  if (!userId) {
    return res.status(400).json({ message: "User id is required" });
  }

  const user = await getAdminUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
}

async function getUserMatches(req, res) {
  const userId = normalizeOptionalString(req.params?.id);

  if (!userId) {
    return res.status(400).json({ message: "User id is required" });
  }

  const user = await getAdminUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const matches = await getAdminUserMatches(userId);
  return res.json({ userId, matches });
}

async function getUserLiveMatches(req, res) {
  const userId = normalizeOptionalString(req.params?.id);

  if (!userId) {
    return res.status(400).json({ message: "User id is required" });
  }

  const user = await getAdminUserById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const liveMatches = await getAdminUserLiveMatches(userId);
  return res.json(liveMatches);
}

async function deleteUserById(req, res) {
  const userId = normalizeOptionalString(req.params?.id);

  if (!userId) {
    return res.status(400).json({ message: "User id is required" });
  }

  const deletedUser = await deleteAdminUserById(userId);

  if (!deletedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    message: "User deleted successfully",
    user: deletedUser,
  });
}

async function exportUsers(req, res) {
  const csv = await exportAdminUsersCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="admin-users-export.csv"');
  return res.status(200).send(csv);
}

module.exports = {
  deleteUserById,
  exportUsers,
  getActivity,
  getDashboard,
  getFunnel,
  getStats,
  getUserById,
  getUserLiveMatches,
  getUserMatches,
  getUsers,
};
