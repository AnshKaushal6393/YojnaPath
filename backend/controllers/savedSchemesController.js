const {
  deleteSavedSchemeForUser,
  getSavedSchemesForUser,
  saveSchemeForUser,
} = require("../services/savedSchemesService");

function normalizeSchemeId(value) {
  return String(value || "").trim().toUpperCase();
}

async function getSavedSchemes(req, res) {
  const savedSchemes = await getSavedSchemesForUser(req.user.id);
  return res.json(savedSchemes);
}

async function saveScheme(req, res) {
  const schemeId = normalizeSchemeId(req.params.schemeId);

  if (!schemeId) {
    return res.status(400).json({ message: "schemeId is required" });
  }

  const result = await saveSchemeForUser(req.user.id, schemeId);
  return res.json(result);
}

async function deleteSavedScheme(req, res) {
  const schemeId = normalizeSchemeId(req.params.schemeId);

  if (!schemeId) {
    return res.status(400).json({ message: "schemeId is required" });
  }

  const deleted = await deleteSavedSchemeForUser(req.user.id, schemeId);
  if (!deleted) {
    return res.status(404).json({ message: "Saved scheme not found" });
  }

  return res.json({ deleted: true });
}

module.exports = {
  deleteSavedScheme,
  getSavedSchemes,
  saveScheme,
};
