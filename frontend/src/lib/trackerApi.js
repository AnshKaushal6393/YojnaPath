import { apiGet, apiPatch, apiPost } from "./api";
import { formatBenefitAmount, normalizeText, toSentenceCase } from "./schemeText";

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function isPastDate(value) {
  const normalized = toDateInputValue(value);
  if (!normalized) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  return normalized < today;
}

function normalizeApplication(item) {
  const scheme = item.scheme || {};
  const hasPastReminder = isPastDate(item.remindAt);

  return {
    schemeId: item.schemeId,
    appliedAt: item.appliedAt,
    appliedAtLabel: formatDateLabel(item.appliedAt),
    status: item.status || "applied",
    statusLabel: toSentenceCase(item.status || "applied"),
    notes: normalizeText(item.notes, ""),
    remindAt: hasPastReminder ? "" : toDateInputValue(item.remindAt),
    remindAtLabel: hasPastReminder ? "" : formatDateLabel(item.remindAt),
    reminderEnabled: Boolean(item.remindAt) && !hasPastReminder,
    hasPastReminder,
    schemeName: normalizeText(scheme.name?.en, item.schemeId),
    schemeNameHi: normalizeText(scheme.name?.hi, ""),
    benefitAmount: formatBenefitAmount(scheme.benefitAmount),
    benefitType: normalizeText(scheme.benefitType, ""),
    active: scheme.active !== false,
  };
}

export async function fetchTrackedApplications() {
  const response = await apiGet("/api/applications");
  return response.map(normalizeApplication);
}

export function createTrackedApplication({ schemeId, appliedAt, notes = "" }) {
  return apiPost("/api/applications", {
    schemeId,
    appliedAt,
    notes,
  });
}

export function updateTrackedApplication(schemeId, payload) {
  return apiPatch(`/api/applications/${schemeId}`, payload);
}
