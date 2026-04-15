import { useTranslation } from "react-i18next";

export default function LanguageToggle({ value, onChange, disabled = false }) {
  const { t } = useTranslation();

  function handleLanguageSelect(nextLanguage) {
    if (nextLanguage === value) {
      return;
    }

    onChange(nextLanguage);
  }

  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">{t("profile.languageTitle")}</h2>
        <p className="type-caption hi" lang="hi">
          {t("profile.languageSubtitle")}
        </p>
      </div>

      <div className="language-toggle" role="radiogroup" aria-label={t("profile.languageTitle")}>
        <button
          type="button"
          className={`lt-btn ${value === "hi" ? "on" : ""}`}
          onClick={() => handleLanguageSelect("hi")}
          disabled={disabled}
          aria-pressed={value === "hi"}
        >
          {t("common.language.hindi")}
        </button>
        <button
          type="button"
          className={`lt-btn ${value === "en" ? "on" : ""}`}
          onClick={() => handleLanguageSelect("en")}
          disabled={disabled}
          aria-pressed={value === "en"}
        >
          {t("common.language.shortEn")}
        </button>
      </div>
    </section>
  );
}
