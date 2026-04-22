const {
  createAdminScheme,
  deleteAdminScheme,
  exportAdminSchemesCsv,
  getAdminSchemeById,
  getAdminSchemeFlags,
  listAdminSchemes,
  setAdminSchemeReviewAction,
  updateAdminScheme,
} = require("../services/adminSchemeService");

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeReviewStatus(value) {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  return ["fixed", "moved", "inactive"].includes(normalized) ? normalized : null;
}

function isValidHttpUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function listSchemes(req, res) {
  const payload = await listAdminSchemes({
    page: req.query?.page,
    limit: req.query?.limit,
    state: normalizeOptionalString(req.query?.state),
    category: normalizeOptionalString(req.query?.category),
    active: req.query?.active,
    search: normalizeOptionalString(req.query?.search),
  });

  return res.json(payload);
}

async function getScheme(req, res) {
  const scheme = await getAdminSchemeById(req.params?.id);
  if (!scheme) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json(scheme);
}

async function createScheme(req, res) {
  const scheme = await createAdminScheme(req.body || {}, req.admin?.email || req.admin?.id || null);
  return res.status(201).json(scheme);
}

async function updateScheme(req, res) {
  const scheme = await updateAdminScheme(
    req.params?.id,
    req.body || {},
    req.admin?.email || req.admin?.id || null
  );

  if (!scheme) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json(scheme);
}

async function deleteScheme(req, res) {
  const scheme = await deleteAdminScheme(req.params?.id, req.admin?.email || req.admin?.id || null);

  if (!scheme) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json({
    message: "Scheme deactivated successfully",
    scheme,
  });
}

async function getSchemeFlags(req, res) {
  const flags = await getAdminSchemeFlags();
  return res.json(flags);
}

async function exportSchemes(req, res) {
  const csv = await exportAdminSchemesCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="admin-schemes-export.csv"');
  return res.status(200).send(csv);
}

async function reviewScheme(req, res) {
  const schemeId = normalizeOptionalString(req.params?.id);
  const status = normalizeReviewStatus(req.body?.status);
  const applyUrl = normalizeOptionalString(req.body?.applyUrl);

  if (!schemeId) {
    return res.status(400).json({ message: "Scheme id is required" });
  }

  if (!status) {
    return res.status(400).json({ message: "A valid review status is required" });
  }

  if (applyUrl && !isValidHttpUrl(applyUrl)) {
    return res.status(400).json({ message: "A valid replacement URL is required" });
  }

  if ((status === "fixed" || status === "moved") && !applyUrl) {
    return res.status(400).json({ message: "Replacement URL is required for fixed or moved schemes" });
  }

  const scheme = await setAdminSchemeReviewAction(
    schemeId,
    { status, note: normalizeOptionalString(req.body?.note), applyUrl },
    req.admin?.email || req.admin?.id || null
  );

  if (!scheme) {
    return res.status(404).json({ message: "Scheme not found" });
  }

  return res.json(scheme);
}

module.exports = {
  createScheme,
  deleteScheme,
  exportSchemes,
  getScheme,
  getSchemeFlags,
  listSchemes,
  reviewScheme,
  updateScheme,
};
