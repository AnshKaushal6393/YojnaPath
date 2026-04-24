const { getAdminSettings, updateAdminSettings } = require("../services/adminSettingsService");

async function getSettings(req, res) {
  const settings = await getAdminSettings();
  return res.json(settings);
}

async function updateSettings(req, res) {
  const settings = await updateAdminSettings(
    req.body || {},
    req.admin?.email || req.admin?.id || null,
    req.admin?.id || null
  );

  return res.json({
    message: settings.passwordChanged
      ? "Settings and password updated successfully"
      : "Settings updated successfully",
    settings,
  });
}

module.exports = {
  getSettings,
  updateSettings,
};
