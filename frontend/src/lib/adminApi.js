import { apiGet, apiPost } from "./api";
import { clearAdminToken, getAdminToken, setAdminToken } from "./adminAuthStorage";

export async function loginAdmin(email, password) {
  const payload = await apiPost("/api/admin/auth/login", { email, password }, { token: "" });
  if (payload?.token) {
    setAdminToken(payload.token);
  }

  return payload?.admin || null;
}

async function withAdminSession(request) {
  const token = getAdminToken();
  if (!token) {
    return null;
  }

  try {
    return await request(token);
  } catch (error) {
    if (error?.status === 401) {
      clearAdminToken();
      return null;
    }

    throw error;
  }
}

export async function fetchCurrentAdmin() {
  return withAdminSession(async (token) => {
    const payload = await apiGet("/api/admin/auth/me", { token });
    return payload?.admin || null;
  });
}

export async function fetchAdminStats() {
  return withAdminSession(async (token) => {
    return apiGet("/api/admin/stats", { token });
  });
}

export async function fetchAdminDashboard() {
  return withAdminSession(async (token) => {
    return apiGet("/api/admin/dashboard", { token });
  });
}

export async function fetchAdminActivity() {
  return withAdminSession(async (token) => {
    return apiGet("/api/admin/activity", { token });
  });
}

export async function fetchAdminFunnel() {
  return withAdminSession(async (token) => {
    return apiGet("/api/admin/funnel", { token });
  });
}
