import { Link } from "react-router-dom";
import DiscontinuedBadge from "./DiscontinuedBadge";

function formatSavedDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function SavedList({ savedSchemes, onRemove, removingSchemeId }) {
  return (
    <div className="saved-list">
      {savedSchemes.map((scheme) => (
        <article key={scheme.id} className="saved-card">
          <div className="saved-card__top">
            <div className="saved-card__chips">
              <span className={`scheme-card__category-chip category-${scheme.category}`}>
                <span className="category-badge__text">{scheme.categoryLabel}</span>
              </span>
              <span className="scheme-card__scope-chip">
                <span className="type-micro">
                  {scheme.state === "central" ? "Central" : scheme.state}
                </span>
              </span>
              {scheme.isDiscontinued ? <DiscontinuedBadge /> : null}
            </div>
            <div className="scheme-card__benefit-chip">
              <p className="type-benefit">{scheme.benefitAmount}</p>
            </div>
          </div>

          {scheme.ministry ? <p className="type-caption">{scheme.ministry}</p> : null}
          <h2 className="type-h2">{scheme.schemeName}</h2>
          {scheme.schemeNameHi ? (
            <p className="type-caption hi" lang="hi">
              {scheme.schemeNameHi}
            </p>
          ) : null}
          <p className="type-body-en">{scheme.description}</p>
          <p className="type-caption">Saved on {formatSavedDate(scheme.savedAt)}</p>

          <div className="saved-card__actions">
            <Link to={`/schemes/${scheme.id}`} className="detail-card__secondary-button">
              View details
            </Link>
            <button
              type="button"
              className="saved-remove-button"
              onClick={() => onRemove(scheme.id)}
              disabled={removingSchemeId === scheme.id}
            >
              {removingSchemeId === scheme.id ? "Removing..." : "Remove"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
