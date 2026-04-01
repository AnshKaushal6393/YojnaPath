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
      <div className="empty-state__illustration" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="empty-state__svg">
          <circle cx="60" cy="60" r="38" className="empty-state__svg-bg" />
          <path d="M42 62c10-12 26-12 36 0-10 12-26 12-36 0Z" className="empty-state__svg-leaf" />
          <circle cx="60" cy="60" r="10" className="empty-state__svg-core" />
          <path d="M60 28v10" className="empty-state__svg-ray" />
          <path d="M44 34l4 9" className="empty-state__svg-ray" />
          <path d="M76 34l-4 9" className="empty-state__svg-ray" />
        </svg>
      </div>
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
