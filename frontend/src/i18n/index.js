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

i18n.addResourceBundle(
  "en",
  "translation",
  {
    common: {
      language: {
        hindi: "हिंदी",
        shortHi: "हिं",
      },
    },
    profile: {
      languageTitle: "Language preference",
      languageSubtitle:
        "Choose your preferred language so the app appears the same way throughout.",
    },
    auth: {
      register: {
        eyebrow: "Welcome",
        title: "Complete your account",
        subtitle:
          "Add your name once so the app can greet you properly and save your account.",
        nameLabel: "Your name",
        namePlaceholder: "Enter your full name",
        preferredLanguage: "Preferred language",
        continue: "Continue",
        saving: "Saving...",
        loading: "Loading...",
        nameError: "Please enter your name.",
        loadError: "Could not load your account.",
        saveError: "Could not save your details.",
      },
    },
  },
  true,
  true
);

i18n.addResourceBundle(
  "hi",
  "translation",
  {
    common: {
      language: {
        english: "English",
        hindi: "हिंदी",
        shortEn: "EN",
        shortHi: "हिं",
        ready2g: "तैयार",
      },
    },
    profile: {
      languageTitle: "भाषा पसंद",
      languageSubtitle: "अपनी पसंद की भाषा चुनें ताकि ऐप उसी में दिखाई दे।",
    },
    auth: {
      register: {
        eyebrow: "स्वागत है",
        title: "अपना अकाउंट पूरा करें",
        subtitle:
          "अपना नाम एक बार भर दें ताकि ऐप आपका स्वागत कर सके और अकाउंट को सही तरह से सहेज सके।",
        nameLabel: "आपका नाम",
        namePlaceholder: "अपना पूरा नाम भरें",
        preferredLanguage: "पसंदीदा भाषा",
        continue: "आगे बढ़ें",
        saving: "सेव हो रहा है...",
        loading: "लोड हो रहा है...",
        nameError: "कृपया अपना नाम भरें।",
        loadError: "अकाउंट लोड नहीं हो सका।",
        saveError: "आपकी जानकारी सेव नहीं हो सकी।",
      },
    },
  },
  true,
  true
);

export default i18n;
