export default function LastMatchSummary() {
  return (
    <section className="home-section">
      <div className="summary-card status-border-matched">
        <div className="summary-card__top">
          <div>
            <p className="type-micro">Last match</p>
            <h2 className="type-h2">12 schemes matched</h2>
          </div>
          <div className="scheme-card__benefit-chip">
            <p className="type-benefit">₹11,000+</p>
          </div>
        </div>

        <p className="type-body-en">
          Your saved profile has active matches in agriculture, health, and women-focused support.
        </p>
        <p className="type-caption">Updated on March 25</p>

        <button type="button" className="summary-card__button btn-primary tap-target">
          <span className="type-label">View last match</span>
        </button>
      </div>
    </section>
  );
}
