import { apiDelete, apiGet, apiPost } from "./api";
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

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchAdminUsers(params = {}) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/users${buildQueryString(params)}`, { token });
  });
}

export async function fetchAdminUser(userId) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/users/${userId}`, { token });
  });
}

export async function fetchAdminUserMatches(userId) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/users/${userId}/matches`, { token });
  });
}

export async function fetchAdminUserLiveMatches(userId) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/users/${userId}/live-matches`, { token });
  });
}

export async function deleteAdminUser(userId) {
  return withAdminSession(async (token) => {
    return apiDelete(`/api/admin/users/${userId}`, { token });
  });
}

export async function downloadAdminUsersExport() {
  const token = getAdminToken();
  if (!token) {
    clearAdminToken();
    return null;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${apiBaseUrl}/api/admin/users/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAdminToken();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  return response.blob();
}

export async function fetchAdminSchemes(params = {}) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/schemes${buildQueryString(params)}`, { token });
  });
}

export async function fetchAdminSchemeFlags() {
  return withAdminSession(async (token) => {
    return apiGet("/api/admin/schemes/flags", { token });
  });
}

export async function fetchAdminScheme(schemeId) {
  return withAdminSession(async (token) => {
    return apiGet(`/api/admin/schemes/${schemeId}`, { token });
  });
}

export async function reviewAdminScheme(schemeId, body) {
  return withAdminSession(async (token) => {
    return apiPost(`/api/admin/schemes/${schemeId}/review`, body, { token });
  });
}

export async function downloadAdminSchemesExport() {
  const token = getAdminToken();
  if (!token) {
    clearAdminToken();
    return null;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${apiBaseUrl}/api/admin/schemes/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAdminToken();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  return response.blob();
}
