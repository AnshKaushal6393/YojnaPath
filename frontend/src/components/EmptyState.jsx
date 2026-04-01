export default function EmptyState({
  title,
  titleHi = "",
  description,
  suggestions,
  tips,
}) {
  const items = Array.isArray(suggestions)
    ? suggestions
    : Array.isArray(tips)
      ? tips
      : [];

  return (
    <section className="empty-state status-border-near-miss">
      <p className="type-h3 hi" lang="hi">
        {titleHi || title}
      </p>
      <p className="type-body-en">{description}</p>
      {items.length ? (
        <div className="empty-state__tips">
          {items.map((item, index) => {
            const titleText = typeof item === "string" ? item : item.title;
            const detailText =
              typeof item === "string"
                ? "Update this part of your profile to unlock more likely matches."
                : item.detail;

            return (
              <div key={`${titleText}-${index}`} className="empty-state__tip state-warning">
                <p className="type-label hi" lang="hi">
                  {titleText}
                </p>
                <p className="type-caption">{detailText}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
