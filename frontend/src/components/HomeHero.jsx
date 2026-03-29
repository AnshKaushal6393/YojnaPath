export default function HomeHero({
  language,
  onLanguageChange,
  hasProfile,
  onProfileModeChange,
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
            हिं
          </button>
        </div>
      </div>

      <div className="home-hero__body">
        <p className="eyebrow">Schemes for you</p>
        <h1 className="type-h1 hi" lang="hi">
          योजनाएं खोजें
        </h1>
        <p className="type-body-en">
          Fill your details once. Get every scheme you qualify for with documents and direct apply
          links.
        </p>
        <p className="type-body-hi hi" lang="hi">
          एक बार जानकारी भरें। सभी पात्र सरकारी योजनाएं देखें - दस्तावेज़ और आवेदन लिंक के
          साथ।
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
          <span className="type-label">Saved profile</span>
        </button>
      </div>
    </section>
  );
}
