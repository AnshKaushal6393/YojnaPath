import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./resources/en";
import hi from "./resources/hi";

const initialLanguage =
  typeof window !== "undefined" ? window.localStorage.getItem("yojnapath_lang") || "en" : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

export default i18n;
