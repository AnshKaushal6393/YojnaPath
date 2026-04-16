import { getActiveProfileId } from "./activeProfile";
import { getStoredPhone } from "../utils/auth";

const PROFILE_DRAFT_KEY = "yojnapath_profile_drafts";
export const OWNER_PROFILE_DRAFT_ID = "__owner__";

function getDefaultDraftId() {
  return getActiveProfileId() || OWNER_PROFILE_DRAFT_ID;
}

function normalizeDraftId(draftId, value) {
  if (typeof draftId === "string" && draftId.trim()) {
    return draftId;
  }

  if (typeof value?.id === "string" && value.id.trim()) {
    return value.id;
  }

  return getDefaultDraftId();
}

function parseDraftStore() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(PROFILE_DRAFT_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const currentPhone = getStoredPhone();

    if (parsed?.ownerPhone && currentPhone && parsed.ownerPhone !== currentPhone) {
      return null;
    }

    return {
      drafts: parsed?.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {},
      ownerPhone: parsed?.ownerPhone || "",
    };
  } catch {
    return null;
  }
}

function writeDraftStore(store) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROFILE_DRAFT_KEY,
    JSON.stringify({
      drafts: store?.drafts || {},
      ownerPhone: getStoredPhone() || "",
    })
  );
}

export function getProfileDraft(draftId) {
  const store = parseDraftStore();
  if (!store) {
    return null;
  }

  const resolvedDraftId = normalizeDraftId(draftId);
  return store.drafts[resolvedDraftId] || null;
}

export function saveProfileDraft(value, draftId) {
  if (typeof window === "undefined") {
    return;
  }

  const store = parseDraftStore() || { drafts: {}, ownerPhone: "" };
  const resolvedDraftId = normalizeDraftId(draftId, value);

  store.drafts[resolvedDraftId] = {
    ...value,
    id: value?.id || (resolvedDraftId === OWNER_PROFILE_DRAFT_ID ? "" : resolvedDraftId),
  };

  writeDraftStore(store);
}

export function clearProfileDraft(draftId) {
  if (typeof window === "undefined") {
    return;
  }

  if (!draftId) {
    window.localStorage.removeItem(PROFILE_DRAFT_KEY);
    return;
  }

  const store = parseDraftStore();
  if (!store) {
    return;
  }

  delete store.drafts[draftId];

  if (!Object.keys(store.drafts).length) {
    window.localStorage.removeItem(PROFILE_DRAFT_KEY);
    return;
  }

  writeDraftStore(store);
}

export function hasProfileDraft(draftId) {
  return Boolean(getProfileDraft(draftId));
}

export function getProfileDraftStorageMode(draftId) {
  return getProfileDraft(draftId)?.storageMode || "draft_only";
}
