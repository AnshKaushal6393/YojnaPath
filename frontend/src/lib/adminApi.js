import { apiGet, apiPost } from "./api";
import { clearAdminToken, getAdminToken, setAdminToken } from "./adminAuthStorage";

export async function loginAdmin(email, password) {
  const payload = await apiPost("/api/admin/auth/login", { email, password }, { token: "" });
  if (payload?.token) {
    setAdminToken(payload.token);
  }

  return payload?.admin || null;
}

export async function fetchCurrentAdmin() {
  const token = getAdminToken();
  if (!token) {
    return null;
  }

  try {
    const payload = await apiGet("/api/admin/auth/me", { token });
    return payload?.admin || null;
  } catch (error) {
    if (error?.status === 401) {
      clearAdminToken();
      return null;
    }

    throw error;
  }
}
