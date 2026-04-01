export default function HomeHero({
  language,
  onLanguageChange,
  hasProfile,
  onProfileModeChange,
  savedProfileLabel = "Saved profile",
  schemeCount = 0,
  userTypeCount = 8,
}) {
  return (
    <section className="home-hero">
      <div className="home-hero__shape home-hero__shape--one" aria-hidden="true" />
      <div className="home-hero__shape home-hero__shape--two" aria-hidden="true" />
      <div className="home-hero__shape home-hero__shape--three" aria-hidden="true" />

      <div className="home-hero__topbar">
        <p className="type-display">YojnaPath</p>
        <div className="language-toggle" aria-label="Language toggle">
          <button
            type="button"
            className={`lt-btn tap-target ${language === "en" ? "on" : ""}`}
            onClick={() => onLanguageChange("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`lt-btn tap-target ${language === "hi" ? "on" : ""}`}
            onClick={() => onLanguageChange("hi")}
          >
            {"\u0939\u093f\u0902"}
          </button>
        </div>
      </div>

      <div className="home-hero__body">
        <p className="eyebrow home-hero__eyebrow">Schemes for you</p>
        <h1 className="type-h1 home-hero__title">Find your schemes</h1>
        <p className="type-h2 hi home-hero__subtitle" lang="hi">
          {"\u0905\u092a\u0928\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0916\u094b\u091c\u0947\u0902"}
        </p>
        <p className="type-body-en home-hero__lead">
          Your path to every government scheme you qualify for.
        </p>
      </div>

      <div className="home-hero__stats" aria-label="Home hero highlights">
        <div className="home-hero__stat">
          <strong>{new Intl.NumberFormat("en-IN").format(Number(schemeCount || 0))}</strong>
          <span className="type-caption">Schemes</span>
        </div>
        <div className="home-hero__stat">
          <strong>{userTypeCount}</strong>
          <span className="type-caption">User types</span>
        </div>
        <div className="home-hero__stat">
          <strong>2G</strong>
          <span className="type-caption">Ready</span>
        </div>
      </div>

      <div className="home-mode-toggle" aria-label="Home screen mode">
        <button
          type="button"
          className={`home-mode-toggle__btn tap-target ${!hasProfile ? "on" : ""}`}
          onClick={() => onProfileModeChange(false)}
        >
          <span className="type-label">New user</span>
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
