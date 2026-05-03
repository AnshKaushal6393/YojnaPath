import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./resources/en";

const initialLanguage =
  typeof window !== "undefined" ? window.localStorage.getItem("yojnapath_lang") || "en" : "en";

const loadedLanguages = new Set(["en"]);

async function loadLanguageModule(lang) {
  if (lang === "hi") {
    const module = await import("./resources/hi");
    return module.default;
  }

  return en;
}

export async function ensureLanguageResources(lang) {
  const nextLang = lang === "hi" ? "hi" : "en";

  if (loadedLanguages.has(nextLang)) {
    return;
  }

  const translation = await loadLanguageModule(nextLang);
  i18n.addResourceBundle(nextLang, "translation", translation, true, true);
  loadedLanguages.add(nextLang);
}

export const i18nReady = (async () => {
  if (initialLanguage === "hi") {
    await ensureLanguageResources("hi");
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ...(loadedLanguages.has("hi")
        ? { hi: { translation: i18n.getResourceBundle("hi", "translation") } }
        : {}),
    },
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
})();

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

export default i18n;
