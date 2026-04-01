const {
  APPLICATION_STATUSES,
  getApplicationsForUser,
  upsertApplicationForUser,
  updateApplicationForUser,
} = require("../services/applicationsService");

function normalizeSchemeId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeOptionalString(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function normalizeStatus(value) {
  return normalizeOptionalString(value)?.toLowerCase() ?? null;
}

function normalizeDate(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalized;
}

function normalizeRemindAt(value) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  return normalizeDate(value);
}

function isPastDate(value) {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed < today;
}

function computeRemindAt(appliedAt) {
  const base = new Date(appliedAt);
  base.setDate(base.getDate() + 30);
  return base.toISOString().slice(0, 10);
}

async function getApplications(req, res) {
  const applications = await getApplicationsForUser(req.user.id);
  return res.json(applications);
}

async function saveApplication(req, res) {
  const schemeId = normalizeSchemeId(req.body?.schemeId);
  const appliedAt = normalizeDate(req.body?.appliedAt ?? req.body?.applied_at);
  const notes = normalizeOptionalString(req.body?.notes);

  if (!schemeId) {
    return res.status(400).json({ message: "schemeId is required" });
  }

  if (!appliedAt) {
    return res.status(400).json({ message: "appliedAt must be a valid date" });
  }

  const record = await upsertApplicationForUser(req.user.id, {
    schemeId,
    appliedAt,
    status: "applied",
    notes,
    remindAt: computeRemindAt(appliedAt),
  });

  return res.json(record);
}

async function patchApplication(req, res) {
  const schemeId = normalizeSchemeId(req.params.schemeId);
  const status = req.body?.status === undefined ? undefined : normalizeStatus(req.body?.status);
  const notes = req.body?.notes === undefined ? undefined : normalizeOptionalString(req.body?.notes);
  const remindAt = normalizeRemindAt(req.body?.remindAt ?? req.body?.remind_at);

  if (!schemeId) {
    return res.status(400).json({ message: "schemeId is required" });
  }

  if (status !== undefined && !APPLICATION_STATUSES.includes(status)) {
    return res.status(400).json({ message: "status must be applied, pending, approved, or rejected" });
  }

  if (req.body?.remindAt !== undefined || req.body?.remind_at !== undefined) {
    const rawRemindAt = req.body?.remindAt ?? req.body?.remind_at;
    if (rawRemindAt !== null && remindAt === null) {
      return res.status(400).json({ message: "remindAt must be a valid date or null" });
    }
    if (remindAt && isPastDate(remindAt)) {
      return res.status(400).json({ message: "remindAt cannot be in the past" });
    }
  }

  if (status === undefined && notes === undefined && remindAt === undefined) {
    return res.status(400).json({ message: "At least one of status, notes, or remindAt is required" });
  }

  const updated = await updateApplicationForUser(req.user.id, schemeId, {
    status,
    notes,
    remindAt,
  });

  if (!updated) {
    return res.status(404).json({ message: "Application not found" });
  }

  return res.json(updated);
}

module.exports = {
  computeRemindAt,
  getApplications,
  patchApplication,
  saveApplication,
};
