import { apiGet, apiPost } from "./api";
import { getAuthToken } from "./authStorage";

const INCOME_MAP = {
  under_50000: 40000,
  "50000_120000": 85000,
  "120000_200000": 160000,
  "200000_500000": 350000,
  above_500000: 600000,
};

const LAND_MAP = {
  none: 0,
  under_2: 1,
  "2_5": 3.5,
  "5_10": 7.5,
  above_10: 12,
};

const AGE_MAP = {
  under_18: 16,
  "18_35": 28,
  "36_59": 45,
  "60_plus": 65,
};

function mapState(value) {
  if (!value) {
    return "";
  }

  return value === "Central" ? "CENTRAL" : value.toUpperCase();
}

function unmapState(value) {
  if (!value) {
    return "";
  }

  return value === "CENTRAL" ? "Central" : value;
}

function pickClosestBand(value, lookup) {
  const numericValue = Number(value ?? 0);
  const entries = Object.entries(lookup);

  return entries.reduce(
    (closest, [bandKey, bandValue]) => {
      const difference = Math.abs(numericValue - bandValue);
      if (difference < closest.difference) {
        return { key: bandKey, difference };
      }

      return closest;
    },
    { key: entries[0]?.[0] || "", difference: Number.POSITIVE_INFINITY }
  ).key;
}

function mapProfileToFormState(profile) {
  return {
    state: unmapState(profile?.state || ""),
    gender: profile?.gender || "",
    caste: profile?.caste || "",
    ageBand: profile?.age != null ? pickClosestBand(profile.age, AGE_MAP) : "",
    incomeBand: pickClosestBand(profile?.annualIncome ?? 0, INCOME_MAP),
    landBand: pickClosestBand(profile?.landAcres ?? 0, LAND_MAP),
    notes: "",
  };
}

export function buildOnboardDraft(selectedUserType, formState, storageMode = "draft_only") {
  return {
    selectedUserType,
    formState,
    storageMode,
    updatedAt: new Date().toISOString(),
  };
}

export function buildProfilePayload(selectedUserType, formState, lang = "hi") {
  return {
    state: mapState(formState.state),
    occupation: selectedUserType,
    annualIncome: INCOME_MAP[formState.incomeBand] ?? 0,
    caste: formState.caste || null,
    gender: formState.gender || null,
    age: AGE_MAP[formState.ageBand] ?? null,
    landAcres: LAND_MAP[formState.landBand] ?? 0,
    disabilityPct: selectedUserType === "disability" ? 40 : 0,
    isStudent: selectedUserType === "student",
    isMigrant: selectedUserType === "worker",
    district: null,
    lang,
  };
}

export async function fetchSavedProfile() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const profile = await apiGet("/api/profile", { token });

  if (!profile?.state || !profile?.occupation) {
    return null;
  }

  return {
    selectedUserType: profile.occupation,
    formState: mapProfileToFormState(profile),
    storageMode: "synced",
  };
}

export async function saveProfileToBackend(selectedUserType, formState, lang = "hi") {
  const token = getAuthToken();

  if (!token) {
    return {
      mode: "draft_only",
      profile: null,
    };
  }

  const profile = await apiPost(
    "/api/profile",
    buildProfilePayload(selectedUserType, formState, lang),
    { token }
  );

  return {
    mode: "synced",
    profile,
  };
}
