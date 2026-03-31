import { apiGet, apiPost } from "./api";
import { getAuthToken } from "./authStorage";
import { fetchSavedProfile } from "./onboardApi";

function getTokenOrThrow() {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please log in again.");
  }

  return token;
}

export async function fetchCurrentUser() {
  const token = getTokenOrThrow();
  const payload = await apiGet("/api/auth/me", { token });
  return payload.user || null;
}

export async function completeRegistration({ name, lang }) {
  const token = getTokenOrThrow();
  const payload = await apiPost(
    "/api/auth/register",
    {
      name,
      lang,
    },
    { token }
  );

  return payload.user || null;
}

export async function getPostRegistrationDestination() {
  const savedProfile = await fetchSavedProfile();
  return savedProfile ? "/results" : "/onboard";
}
