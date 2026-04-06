import { useNavigate } from "react-router-dom";
import { getCategoryMeta } from "../lib/categoryMeta";

export default function SchemeCard({
  schemeId,
  schemeName,
  schemeNameHi,
  benefitAmount,
  category,
  state,
  ministry,
  matchStatus,
  description,
  descriptionHi,
  matchScorePercent,
  staggerIndex = 0,
}) {
  const navigate = useNavigate();

  function toSentenceCase(value) {
    return String(value ?? "")
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function isMeaningful(value) {
    const text = String(value ?? "").trim();
    if (!text) {
      return false;
    }

    if (
      /[{}[\]]/.test(text) ||
      /\bvalue\b/i.test(text) ||
      /\blabel\b/i.test(text)
    ) {
      return false;
    }

    return true;
  }

  const statusClassMap = {
    matched: "status-border-matched",
    "near-miss": "status-border-near-miss",
    expired: "status-border-expired",
    discontinued: "status-border-expired",
  };

  const statusClass = statusClassMap[matchStatus] || "";
  const categoryClass = `category-${category}`;
  const categoryLabel = toSentenceCase(category);
  const categoryMeta = getCategoryMeta(category, categoryLabel);
  const scopeLabel = state === "central" ? "Central" : state;
  const showMinistry = isMeaningful(ministry);
  const showHindiName = isMeaningful(schemeNameHi);
  const showHindiDescription = isMeaningful(descriptionHi);
  const matchScore =
    typeof matchScorePercent === "number" && Number.isFinite(matchScorePercent)
      ? Math.max(0, Math.min(100, Math.round(matchScorePercent)))
      : null;

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
      className={`scheme-card ${statusClass}`.trim()}
      style={{ "--stagger-index": staggerIndex }}
      role="link"
      tabIndex={0}
      aria-label={`Open details for ${schemeName}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
    >
      <div className="scheme-card__top">
        <div className="scheme-card__meta-chips">
          <div className={`scheme-card__category-chip ${categoryClass}`}>
            <span className="category-badge__text">{categoryLabel}</span>
          </div>
          <div className="scheme-card__scope-chip">
            <span className="type-micro">{scopeLabel}</span>
          </div>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{benefitAmount}</p>
        </div>
      </div>

      <div className="scheme-card__content">
        <div className="scheme-card__identity">
          <div className={`scheme-card__icon-box ${categoryMeta.tone}`} aria-hidden="true">
            {categoryMeta.icon}
          </div>
          <div className="scheme-card__title-block">
            <h3 className="scheme-card__title-en">{schemeName}</h3>
            {showHindiName ? <p className="scheme-card__title-hi hi">{schemeNameHi}</p> : null}
            {showMinistry ? <p className="scheme-card__ministry type-caption">{ministry}</p> : null}
          </div>
        </div>
        <p className="scheme-description scheme-description--en">{description}</p>
        {showHindiDescription ? (
          <p className="scheme-description scheme-description--hi hi">{descriptionHi}</p>
        ) : null}
        {matchScore != null ? (
          <div className="scheme-card__match-block" aria-hidden="true">
            <div className="scheme-card__match-label-row">
              <span className="scheme-card__match-label">Match quality</span>
              <span className="scheme-card__match-value">{matchScore}%</span>
            </div>
            <div className="scheme-card__match-track">
              <span className="scheme-card__match-fill" style={{ width: `${matchScore}%` }} />
            </div>
          </div>
        ) : null}
        <span className="scheme-card__expand-row" aria-hidden="true">
          <span className="scheme-card__expand-label">View full details</span>
          <span className="card-expand-icon">{"\u2197"}</span>
        </span>
      </div>
    </article>
  );
}
