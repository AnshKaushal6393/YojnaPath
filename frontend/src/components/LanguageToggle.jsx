export default function LanguageToggle({ value, onChange, disabled = false }) {
  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">Language preference</h2>
        <p className="type-caption hi" lang="hi">
          अपनी पसंद की भाषा चुनें ताकि ऐप उसी में दिखे।
        </p>
      </div>

      <div className="language-toggle" role="radiogroup" aria-label="Language preference">
        <button
          type="button"
          className={`lt-btn ${value === "hi" ? "on" : ""}`}
          onClick={() => onChange("hi")}
          disabled={disabled}
          aria-pressed={value === "hi"}
        >
          हिंदी
        </button>
        <button
          type="button"
          className={`lt-btn ${value === "en" ? "on" : ""}`}
          onClick={() => onChange("en")}
          disabled={disabled}
          aria-pressed={value === "en"}
        >
          EN
        </button>
      </div>
    </section>
  );
}
