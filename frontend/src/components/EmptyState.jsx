export default function EmptyState({ title, description, suggestions }) {
  return (
    <section className="empty-state status-border-near-miss">
      <p className="type-h3 hi" lang="hi">
        {title}
      </p>
      <p className="type-body-en">{description}</p>
      <div className="empty-state__tips">
        {suggestions.map((suggestion) => {
          const titleText = typeof suggestion === "string" ? suggestion : suggestion.title;
          const detailText =
            typeof suggestion === "string"
              ? "Update this part of your profile to unlock more likely matches."
              : suggestion.detail;

          return (
            <div key={titleText} className="empty-state__tip state-warning">
              <p className="type-label hi" lang="hi">
                {titleText}
              </p>
              <p className="type-caption">{detailText}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
