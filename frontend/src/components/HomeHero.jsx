export default function HomeHero({
  language,
  onLanguageChange,
  hasProfile,
  onProfileModeChange,
  savedProfileLabel = "Saved profile",
}) {
  return (
    <section className="home-hero">
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
        <p className="eyebrow">Schemes for you</p>
        <h1 className="type-h1 hi" lang="hi">
          {"\u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0916\u094b\u091c\u0947\u0902"}
        </h1>
        <p className="type-body-en">
          Fill your details once. Get every scheme you qualify for with documents and direct apply
          links.
        </p>
        <p className="type-body-hi hi" lang="hi">
          {
            "\u090f\u0915 \u092c\u093e\u0930 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u092d\u0930\u0947\u0902\u0964 \u0938\u092d\u0940 \u092a\u093e\u0924\u094d\u0930 \u0938\u0930\u0915\u093e\u0930\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0926\u0947\u0916\u0947\u0902 - \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0914\u0930 \u0906\u0935\u0947\u0926\u0928 \u0932\u093f\u0902\u0915 \u0915\u0947 \u0938\u093e\u0925\u0964"
          }
        </p>
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
