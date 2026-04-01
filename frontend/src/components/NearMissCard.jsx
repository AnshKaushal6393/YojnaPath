import { useNavigate } from "react-router-dom";
import { getCategoryMeta } from "../lib/categoryMeta";

export default function NearMissCard({
  schemeId,
  schemeName,
  schemeNameHi,
  benefitAmount,
  category,
  categoryKey,
  state,
  gapLabel,
  gapLabelHi,
}) {
  const navigate = useNavigate();
  const categoryMeta = getCategoryMeta(categoryKey || "agriculture", category);

  function openDetail() {
    navigate(`/schemes/${schemeId}`);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  }

  return (
    <article
      className="near-miss-card status-border-near-miss"
      role="link"
      tabIndex={0}
      aria-label={`Open near-miss details for ${schemeName}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
    >
      <div className="scheme-card__top">
        <div className="scheme-card__meta-chips">
          <div className={`scheme-card__category-chip category-${categoryKey || "agriculture"}`}>
            <span className="category-badge__text">{category}</span>
          </div>
          <div className="scheme-card__scope-chip">
            <span className="type-micro">{state === "central" ? "Central" : state}</span>
          </div>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{benefitAmount}</p>
        </div>
      </div>

      <div className="scheme-card__content">
        <div className="scheme-card__status-badge status-border-near-miss">
          <span className="type-micro">Almost qualifies</span>
        </div>
        <div className="scheme-card__identity">
          <div className={`scheme-card__icon-box ${categoryMeta.tone}`} aria-hidden="true">
            {categoryMeta.icon}
          </div>
          <div className="scheme-card__title-block">
            <h3 className="scheme-card__title-en">{schemeName}</h3>
            {schemeNameHi ? <p className="scheme-card__title-hi hi">{schemeNameHi}</p> : null}
          </div>
        </div>
        <p className="scheme-description scheme-description--en">{gapLabel}</p>
        {gapLabelHi ? <p className="scheme-description scheme-description--hi hi">{gapLabelHi}</p> : null}
        <span className="scheme-card__expand-row" aria-hidden="true">
          <span className="scheme-card__expand-label">Review details</span>
          <span className="card-expand-icon">{"\u2197"}</span>
        </span>
      </div>
    </article>
  );
}
