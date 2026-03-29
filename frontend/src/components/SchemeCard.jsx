export default function SchemeCard({
  schemeName,
  schemeNameHi,
  benefitAmount,
  category,
  ministry,
  matchStatus,
  description,
  descriptionHi,
}) {
  const statusClass =
    matchStatus === "matched"
      ? "status-border-matched"
      : matchStatus === "near-miss"
        ? "status-border-near-miss"
        : "status-border-expired";

  const categoryClass = `category-${category}`;

  return (
    <article className={`scheme-card interactive-card ${statusClass}`}>
      <div className="scheme-card__top">
        <div className={`scheme-card__category-chip ${categoryClass}`}>
          <span className="type-micro">{category}</span>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{benefitAmount}</p>
        </div>
      </div>

      <div className="scheme-card__content">
        <p className="type-caption">{ministry}</p>
        <h3 className="scheme-card__title-en">{schemeName}</h3>
        <p className="scheme-card__title-hi hi">{schemeNameHi}</p>
        <p className="type-body-en">{description}</p>
        <p className="type-body-hi hi">{descriptionHi}</p>
      </div>
    </article>
  );
}
