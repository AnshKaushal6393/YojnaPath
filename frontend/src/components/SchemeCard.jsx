export default function SchemeCard({
  schemeName,
  schemeNameHi,
  benefitAmount,
  category,
  ministry,
  matchStatus,
  description,
  descriptionHi,
  staggerIndex = 0,
  isOpen = false,
  onToggle,
}) {
  const statusClassMap = {
    matched: "status-border-matched",
    "near-miss": "status-border-near-miss",
    expired: "status-border-expired",
    discontinued: "status-border-expired",
  };

  const statusClass = statusClassMap[matchStatus] || "";
  const categoryClass = `category-${category}`;
  const statusLabelMap = {
    matched: "Matched",
    "near-miss": "Almost qualifies",
    expired: "Expired",
    discontinued: "Discontinued",
  };
  const statusLabel = statusLabelMap[matchStatus] || "Status unavailable";

  return (
    <article
      className={`scheme-card ${statusClass}`.trim()}
      style={{ "--stagger-index": staggerIndex }}
    >
      <div className="scheme-card__top">
        <div className={`scheme-card__category-chip ${categoryClass}`}>
          <span className="type-micro">{category}</span>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{benefitAmount}</p>
        </div>
      </div>

      <div className="scheme-card__content">
        <div className="scheme-card__status-row">
          <span className={`scheme-card__status-badge type-micro ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="type-caption">{ministry}</p>
        <h3 className="scheme-card__title-en">{schemeName}</h3>
        <p className="scheme-card__title-hi hi">{schemeNameHi}</p>
        <p className="type-body-en">{description}</p>
        <p className="type-body-hi hi">{descriptionHi}</p>
        <button
          type="button"
          className="scheme-card__toggle btn-primary tap-target"
          onClick={onToggle}
        >
          <span className="type-label">{isOpen ? "Hide details" : "Show details"}</span>
        </button>
        <div className={`sc-expanded ${isOpen ? "open" : ""}`}>
          <div className="scheme-card__details">
            <p className="type-label">Documents</p>
            <p className="type-caption">Aadhaar card, bank passbook, land records</p>
          </div>
        </div>
      </div>
    </article>
  );
}
