export default function LanguageToggle({ value, onChange, disabled = false }) {
  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">Language preference</h2>
        <p className="type-caption hi" lang="hi">
          {
            "\u0905\u092a\u0928\u0940 \u092a\u0938\u0902\u0926 \u0915\u0940 \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902 \u0924\u093e\u0915\u093f \u090f\u092a \u0909\u0938\u0940 \u092e\u0947\u0902 \u0926\u093f\u0916\u0947\u0964"
          }
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
          {"\u0939\u093f\u0902\u0926\u0940"}
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
