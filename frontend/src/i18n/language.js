import i18n, { ensureLanguageResources } from "./index";

export const APP_LANGUAGE_KEY = "yojnapath_lang";

const HINDI_FIRST_STATES = new Set([
  "UP",
  "UTTAR PRADESH",
  "MP",
  "MADHYA PRADESH",
  "RJ",
  "RAJASTHAN",
  "BR",
  "BIHAR",
]);

function normalizeState(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function getStoredAppLanguage() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(APP_LANGUAGE_KEY) || "";
}

export function hasStoredAppLanguage() {
  return Boolean(getStoredAppLanguage());
}

export function detectLanguageFromState(state) {
  return HINDI_FIRST_STATES.has(normalizeState(state)) ? "hi" : "en";
}

export function resolvePreferredLanguage({ explicitLang = "", state = "", fallback = "en" } = {}) {
  if (explicitLang === "hi" || explicitLang === "en") {
    return explicitLang;
  }

  if (state) {
    return detectLanguageFromState(state);
  }

  return fallback;
}

export async function setAppLanguage(lang) {
  const nextLang = lang === "hi" ? "hi" : "en";
  await ensureLanguageResources(nextLang);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LANGUAGE_KEY, nextLang);
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = nextLang;
  }

  if (i18n.resolvedLanguage !== nextLang) {
    await i18n.changeLanguage(nextLang);
  }

  return nextLang;
}

export async function syncAppLanguage({
  explicitLang = "",
  state = "",
  fallback = "en",
  force = false,
} = {}) {
  const stored = getStoredAppLanguage();

  if (stored && !force) {
    if (typeof document !== "undefined") {
      document.documentElement.lang = stored;
    }
    if (i18n.resolvedLanguage !== stored) {
      await i18n.changeLanguage(stored);
    }
    return stored;
  }

  const resolved = resolvePreferredLanguage({ explicitLang, state, fallback });
  return setAppLanguage(resolved);
}
