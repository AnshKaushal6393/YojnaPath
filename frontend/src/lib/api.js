import { clearActiveProfileId } from "./activeProfile";
import { clearAuthToken, getAuthToken } from "./authStorage";
import { clearStoredPhone, clearToken } from "../utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
let hasHandledUnauthorized = false;

function handleUnauthorizedResponse() {
  if (typeof window === "undefined" || hasHandledUnauthorized) {
    return;
  }

  hasHandledUnauthorized = true;
  clearAuthToken();
  clearToken();
  clearStoredPhone();
  clearActiveProfileId();

  const publicAuthPaths = ["/login", "/verify", "/register"];
  if (!publicAuthPaths.includes(window.location.pathname)) {
    window.location.replace("/login");
    return;
  }

  window.setTimeout(() => {
    hasHandledUnauthorized = false;
  }, 0);
}

async function parseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function apiRequest(path, options = {}) {
  const { token, headers, ...restOptions } = options;
  const authToken = token || getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      Accept: "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorizedResponse();
    }

    const error = new Error(payload?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function apiGet(path, options) {
  return apiRequest(path, options);
}

export function apiPost(path, body, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "DELETE",
  });
}

export function apiPatch(path, body, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
}
