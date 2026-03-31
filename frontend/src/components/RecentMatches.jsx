import SchemeCard from "./SchemeCard";

export default function RecentMatches({ schemes, isLoading, error }) {
  return (
    <section className="home-section home-section--matches">
      <div className="section-heading">
        <h2 className="type-h2">Recent matches</h2>
        <p className="type-caption">Live scheme cards fetched from the backend.</p>
      </div>

      {isLoading ? (
        <p className="type-body-en">Loading live schemes...</p>
      ) : null}

      {error ? <p className="type-caption">Could not load schemes: {error.message}</p> : null}

      {!isLoading && !error && schemes.length > 0 ? (
        <div className="recent-matches">
          {schemes.map((scheme, index) => (
            <SchemeCard
              key={scheme.id}
              schemeName={scheme.schemeName}
              schemeNameHi={scheme.schemeNameHi}
              benefitAmount={scheme.benefitAmount}
              category={scheme.category}
              state={scheme.state}
              ministry={scheme.ministry}
              matchStatus={scheme.matchStatus}
              description={scheme.description}
              descriptionHi={scheme.descriptionHi}
              staggerIndex={index}
              schemeId={scheme.id}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && schemes.length === 0 ? (
        <div className="empty-state">
          <p className="type-h3">Live matches will appear here</p>
          <p className="type-body-en">
            The backend connection is working, but there are no featured scheme cards ready to show
            yet.
          </p>
          <p className="type-caption">
            Refresh after seeding more schemes or switch to a saved profile to see personalized
            results.
          </p>
        </div>
      ) : null}
    </section>
  );
}
