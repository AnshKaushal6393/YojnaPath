export default function EmptyState({ suggestions }) {
  return (
    <section className="empty-state status-border-near-miss">
      <p className="type-h3 hi" lang="hi">
        कोई योजना नहीं मिली — अपनी जानकारी बदलें
      </p>
      <p className="type-body-en">
        Try adjusting the profile fields below to unlock likely matches.
      </p>
      <div className="empty-state__tips">
        {suggestions.map((suggestion) => (
          <div key={suggestion.title} className="empty-state__tip state-warning">
            <p className="type-label hi" lang="hi">
              {suggestion.title}
            </p>
            <p className="type-caption">{suggestion.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
