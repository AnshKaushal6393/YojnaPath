const ACTIVE_PROFILE_KEY = "yojnapath_active_profile_id";

export function getActiveProfileId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
}

export function setActiveProfileId(profileId) {
  if (typeof window === "undefined") {
    return;
  }

  if (!profileId) {
    window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function clearActiveProfileId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
}
