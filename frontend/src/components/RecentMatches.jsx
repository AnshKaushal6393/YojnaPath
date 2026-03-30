import SchemeCard from "./SchemeCard";

export default function RecentMatches({ schemes, isLoading, error, openCard, onToggle }) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2 className="type-h2">Recent matches</h2>
        <p className="type-caption">Live scheme cards fetched from the backend.</p>
      </div>

      {isLoading ? (
        <p className="type-body-en">Loading live schemes...</p>
      ) : null}

      {error ? <p className="type-caption">Could not load schemes: {error.message}</p> : null}

      {!isLoading && !error ? (
        <div className="recent-matches">
          {schemes.map((scheme, index) => (
            <SchemeCard
              key={scheme.id}
              schemeName={scheme.schemeName}
              schemeNameHi={scheme.schemeNameHi}
              benefitAmount={scheme.benefitAmount}
              category={scheme.category}
              ministry={scheme.ministry}
              matchStatus={scheme.matchStatus}
              description={scheme.description}
              descriptionHi={scheme.descriptionHi}
              staggerIndex={index}
              isOpen={openCard === scheme.id}
              onToggle={() => onToggle((current) => (current === scheme.id ? "" : scheme.id))}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
