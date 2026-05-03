import { USER_TYPE_OPTIONS } from "../data/profileOptions";
import { useTranslation } from "react-i18next";
import BrandLogo from "./BrandLogo";
import InstallAppButton from "./InstallAppButton";

export default function HomeHero({
  language,
  onLanguageChange,
  hasProfile,
  onProfileModeChange,
  savedProfileLabel = "Saved profile",
  schemeCount = 0,
  userTypeCount = USER_TYPE_OPTIONS.length,
}) {
  const { t } = useTranslation();

  return (
    <section className="home-hero">
      <div className="home-hero__shape home-hero__shape--one" aria-hidden="true" />
      <div className="home-hero__shape home-hero__shape--two" aria-hidden="true" />
      <div className="home-hero__shape home-hero__shape--three" aria-hidden="true" />

      <div className="home-hero__topbar">
        <BrandLogo variant="gov" alt={t("common.appName")} className="home-hero__brand" />
        <div className="home-hero__controls">
          <div className="language-toggle" aria-label={t("profile.languageTitle")}>
            <button
              type="button"
              className={`lt-btn tap-target ${language === "en" ? "on" : ""}`}
              onClick={() => onLanguageChange("en")}
            >
              {t("common.language.shortEn")}
            </button>
            <button
              type="button"
              className={`lt-btn tap-target ${language === "hi" ? "on" : ""}`}
              onClick={() => onLanguageChange("hi")}
            >
              {t("common.language.shortHi")}
            </button>
          </div>
          <InstallAppButton
            buttonClassName="install-app-button install-app-button--hero"
            hintClassName="install-app__hint--hero"
          />
        </div>
      </div>

      <div className="home-hero__body">
        <p className="eyebrow home-hero__eyebrow">{t("home.eyebrow")}</p>
        <h1 className="type-h1 home-hero__title">{t("home.title")}</h1>
        <p className="type-h2 hi home-hero__subtitle" lang="hi">
          {t("home.subtitle")}
        </p>
        <p className="type-body-en home-hero__lead">
          {t("home.lead")}
        </p>
      </div>

      <div className="home-hero__stats" aria-label="Home hero highlights">
        <div className="home-hero__stat">
          <strong>{new Intl.NumberFormat("en-IN").format(Number(schemeCount || 0))}</strong>
          <span className="type-caption">{t("home.stats.schemes")}</span>
        </div>
        <div className="home-hero__stat">
          <strong>{userTypeCount}</strong>
          <span className="type-caption">{t("home.stats.userTypes")}</span>
        </div>
        <div className="home-hero__stat">
          <strong>2G</strong>
          <span className="type-caption">{t("common.language.ready2g")}</span>
        </div>
      </div>

      <div className="home-mode-toggle" aria-label="Home screen mode">
        <button
          type="button"
          className={`home-mode-toggle__btn tap-target ${!hasProfile ? "on" : ""}`}
          onClick={() => onProfileModeChange(false)}
        >
          <span className="type-label">{t("home.mode.newUser")}</span>

        </button>
        <button
          type="button"
          className={`home-mode-toggle__btn tap-target ${hasProfile ? "on" : ""}`}
          onClick={() => onProfileModeChange(true)}
        >
          <span className="type-label">{savedProfileLabel}</span>
        </button>
      </div>
    </section>
  );
}
