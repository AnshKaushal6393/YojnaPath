const PROFILE_DRAFT_KEY = "yojnapath_profile_draft";

export function getProfileDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(PROFILE_DRAFT_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function saveProfileDraft(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(value));
}

export function clearProfileDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PROFILE_DRAFT_KEY);
}

export function hasProfileDraft() {
  return Boolean(getProfileDraft());
}

export function getProfileDraftStorageMode() {
  return getProfileDraft()?.storageMode || "draft_only";
}
