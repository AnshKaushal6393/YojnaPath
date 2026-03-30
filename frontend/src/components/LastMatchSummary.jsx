function formatTimestamp(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function LastMatchSummary({ impact, health, isLoading, error }) {
  if (isLoading) {
    return (
      <section className="home-section">
        <div className="summary-card status-border-matched">
          <p className="type-micro">Live backend summary</p>
          <h2 className="type-h2">Loading latest snapshot...</h2>
          <p className="type-caption">Fetching public data from the backend service.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-section">
        <div className="summary-card status-border-expired">
          <p className="type-micro">Live backend summary</p>
          <h2 className="type-h2">Could not reach backend</h2>
          <p className="type-caption">{error.message}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="home-section">
      <div className="summary-card status-border-matched">
        <div className="summary-card__top">
          <div>
            <p className="type-micro">Live backend summary</p>
            <h2 className="type-h2">{impact?.schemesInDatabase || 0} schemes available</h2>
          </div>
          <div className="scheme-card__benefit-chip">
            <p className="type-benefit">v{health?.version || "0.0.0"}</p>
          </div>
        </div>

        <p className="type-body-en">
          Backend is connected. Public impact data and active scheme inventory are loading from the
          live API.
        </p>
        <p className="type-caption">Updated on {formatTimestamp(impact?.lastUpdated)}</p>

        <button type="button" className="summary-card__button btn-primary tap-target">
          <span className="type-label">Explore live schemes</span>
        </button>
      </div>
    </section>
  );
}
