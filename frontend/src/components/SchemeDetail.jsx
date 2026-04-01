import { toSentenceCase } from "../lib/schemeText";
import ActionButtons from "./ActionButtons";
import ChecklistGenerator from "./ChecklistGenerator";
import DocumentList from "./DocumentList";

function renderMetaValue(label, value) {
  if (!value) {
    return null;
  }

  return (
    <div className="detail-card__meta-item">
      <p className="type-label">{label}</p>
      <p className="type-caption">{value}</p>
    </div>
  );
}

export default function SchemeDetail({
  scheme,
  schemeUrl,
  isSaved,
  isSavePending,
  onToggleSave,
  onTrackApplication,
  isTrackPending,
}) {
  return (
    <section className="detail-card">
      <div className="detail-card__top">
        <div className="detail-card__chips">
          <span className={`scheme-card__category-chip category-${scheme.category}`}>
            <span className="category-badge__text">{toSentenceCase(scheme.category)}</span>
          </span>
          <span className="scheme-card__scope-chip">
            <span className="type-micro">{scheme.state === "central" ? "Central" : scheme.state}</span>
          </span>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{scheme.benefitAmount}</p>
        </div>
      </div>

      {scheme.ministry ? <p className="type-caption">{scheme.ministry}</p> : null}
      <h1 className="type-h1">{scheme.schemeName}</h1>
      {scheme.schemeNameHi ? (
        <p className="detail-card__title-hi hi" lang="hi">
          {scheme.schemeNameHi}
        </p>
      ) : null}

      {scheme.description ? <p className="type-body-en">{scheme.description}</p> : null}
      {scheme.descriptionHi ? (
        <p className="type-body-hi hi" lang="hi">
          {scheme.descriptionHi}
        </p>
      ) : null}

      <div className="detail-card__meta-grid">
        {renderMetaValue("Benefit type", scheme.benefitType ? toSentenceCase(scheme.benefitType) : "")}
        {renderMetaValue("Apply mode", scheme.applyMode ? toSentenceCase(scheme.applyMode) : "")}
        {renderMetaValue("Applications open", scheme.deadline.opens)}
        {renderMetaValue("Applications close", scheme.deadline.closes)}
      </div>

      {scheme.eligibilityItems.length ? (
        <div className="detail-card__section">
          <div className="detail-section__header">
            <h2 className="type-h2">Eligibility criteria</h2>
            <p className="type-caption">Check these conditions before starting your application.</p>
          </div>
          <div className="detail-eligibility">
            {scheme.eligibilityItems.map((item) => (
              <div key={item} className="detail-eligibility__item">
                <span className="detail-eligibility__dot" aria-hidden="true" />
                <span className="type-body-en">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {scheme.officeAddress.en || scheme.officeAddress.hi ? (
        <div className="detail-card__section">
          <div className="detail-section__header">
            <h2 className="type-h2">Office address</h2>
          </div>
          {scheme.officeAddress.en ? <p className="type-body-en">{scheme.officeAddress.en}</p> : null}
          {scheme.officeAddress.hi ? (
            <p className="type-body-hi hi" lang="hi">
              {scheme.officeAddress.hi}
            </p>
          ) : null}
        </div>
      ) : null}

      <DocumentList documents={scheme.documents} />
      <ChecklistGenerator
        schemeName={scheme.schemeName}
        documents={scheme.documents}
        eligibilityItems={scheme.eligibilityItems}
      />
      <ActionButtons
        schemeName={scheme.schemeName}
        applyUrl={scheme.applyUrl}
        documents={scheme.documents}
        schemeUrl={schemeUrl}
        isSaved={isSaved}
        isSavePending={isSavePending}
        onToggleSave={onToggleSave}
        onTrackApplication={onTrackApplication}
        isTrackPending={isTrackPending}
      />
    </section>
  );
}
