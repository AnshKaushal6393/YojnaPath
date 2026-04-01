import SchemeCard from "./SchemeCard";

export default function KioskResults({ results }) {
  return (
    <section className="kiosk-card">
      <div className="section-heading">
        <h2 className="type-h2">Kiosk results</h2>
        <p className="type-caption">
          {results.count} matched, {results.nearMissCount} near misses, {results.totalScanned} total
          scanned
        </p>
      </div>

      <div className="results-scheme-grid">
        {results.schemes.map((scheme) => (
          <SchemeCard
            key={scheme.id}
            schemeId={scheme.id}
            schemeName={scheme.schemeName}
            schemeNameHi={scheme.schemeNameHi}
            benefitAmount={scheme.benefitAmount}
            category={scheme.category}
            state={scheme.state}
            ministry={scheme.ministry}
            matchStatus={scheme.matchStatus}
            description={scheme.description}
            descriptionHi={scheme.descriptionHi}
          />
        ))}
      </div>
    </section>
  );
}
