export default function ResultsHeader({ count, nearMissCount = 0, isLoading }) {
  const hasMatches = !isLoading && count > 0;

  return (
    <section className={`results-header ${hasMatches ? "results-header--success" : ""}`.trim()}>
      <div className="matching-hero-shape matching-hero-shape--one" aria-hidden="true" />
      <div className="matching-hero-shape matching-hero-shape--two" aria-hidden="true" />

      <div className="section-heading">
        <p className="eyebrow">RESULTS</p>
        {hasMatches ? (
          <div className="results-header__celebration" aria-hidden="true">
            {"\uD83C\uDF89"}
          </div>
        ) : null}
        <h1 className="type-h1">
          {isLoading ? "Finding schemes for you" : `${count} schemes matched`}
        </h1>
        <p className="type-body-en">
          {isLoading
            ? "We are checking your saved profile against live scheme eligibility."
            : "These are the schemes that best match your saved profile right now."}
        </p>
        <p className="type-body-hi hi" lang="hi">
          {isLoading
            ? "\u0939\u092e \u0906\u092a\u0915\u0940 \u0938\u0947\u0935 \u0915\u0940 \u0917\u0908 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0915\u0947 \u0939\u093f\u0938\u093e\u092c \u0938\u0947 \u0938\u0939\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"
            : "\u092f\u0947 \u0935\u0939 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0939\u0948\u0902 \u091c\u094b \u0905\u092d\u0940 \u0906\u092a\u0915\u0940 \u0938\u0947\u0935 \u0915\u0940 \u0917\u0908 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0938\u0947 \u0938\u092c\u0938\u0947 \u091c\u094d\u092f\u093e\u0926\u093e \u092e\u0947\u0932 \u0916\u093e\u0924\u0940 \u0939\u0948\u0902\u0964"}
        </p>
      </div>
      {!isLoading ? (
        <div className="results-header__stats">
          <div className="results-stat-chip results-stat-chip--matched">
            <span className="type-micro">Matched</span>
            <strong>{count}</strong>
          </div>
          <div className="results-stat-chip results-stat-chip--near-miss">
            <span className="type-micro">Near miss</span>
            <strong>{nearMissCount}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
