const TOKEN_KEY = "yojnapath_auth_token";
const PHONE_KEY = "yojnapath_auth_phone";

export function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getStoredPhone() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PHONE_KEY) || "";
}

export function setStoredPhone(phone) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PHONE_KEY, phone);
}

export function clearStoredPhone() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PHONE_KEY);
}
