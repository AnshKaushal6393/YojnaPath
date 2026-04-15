import { useTranslation } from "react-i18next";
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

function buildEligibilitySummary(scheme, t) {
  const summaryLines = [];

  if (scheme.category) {
    summaryLines.push(
      t("schemeDetail.summary.categoryLine", { category: toSentenceCase(scheme.category) })
    );
  }

  if (scheme.eligibilityItems.length > 0) {
    summaryLines.push(t("schemeDetail.summary.criteriaLine"));
  }

  if (scheme.documents.length > 0) {
    summaryLines.push(t("schemeDetail.summary.documentsLine"));
  }

  return summaryLines.slice(0, 3);
}

function buildApplicationGuide(scheme, t) {
  const portalLabel = scheme.applyMode
    ? toSentenceCase(scheme.applyMode)
    : t("schemeDetail.guide.officialPortal");
  const documentStep = scheme.documents.length
    ? t("schemeDetail.guide.keepDocuments", { count: scheme.documents.length })
    : t("schemeDetail.guide.keepKeyDocuments");

  return [
    documentStep,
    t("schemeDetail.guide.visitPortal", {
      portal: portalLabel,
      applySuffix: scheme.applyUrl ? t("schemeDetail.guide.applySuffix") : "",
    }),
    t("schemeDetail.guide.fillDetails"),
    t("schemeDetail.guide.submit"),
  ];
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
  const { t } = useTranslation();
  const eligibilitySummary = buildEligibilitySummary(scheme, t);
  const applicationGuide = buildApplicationGuide(scheme, t);

  return (
    <section className="detail-card">
      <div className="detail-card__top">
        <div className="detail-card__chips">
          <span className={`scheme-card__category-chip category-${scheme.category}`}>
            <span className="category-badge__text">{toSentenceCase(scheme.category)}</span>
          </span>
          <span className="scheme-card__scope-chip">
            <span className="type-micro">
              {scheme.state === "central" ? t("schemeDetail.central") : scheme.state}
            </span>
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
        {renderMetaValue(
          t("schemeDetail.benefitType"),
          scheme.benefitType ? toSentenceCase(scheme.benefitType) : ""
        )}
        {renderMetaValue(
          t("schemeDetail.applyMode"),
          scheme.applyMode ? toSentenceCase(scheme.applyMode) : ""
        )}
        {renderMetaValue(t("schemeDetail.applicationsOpen"), scheme.deadline.opens)}
        {renderMetaValue(t("schemeDetail.applicationsClose"), scheme.deadline.closes)}
      </div>

      {eligibilitySummary.length ? (
        <div className="detail-card__section">
          <div className="detail-section__header">
            <h2 className="type-h2">{t("schemeDetail.whoQualifies")}</h2>
            <p className="type-caption">{t("schemeDetail.whoQualifiesSubtitle")}</p>
          </div>
          <div className="detail-summary">
            {eligibilitySummary.map((item) => (
              <p key={item} className="type-body-hi hi" lang="hi">
                {item}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {scheme.eligibilityItems.length ? (
        <div className="detail-card__section">
          <div className="detail-section__header">
            <h2 className="type-h2">{t("schemeDetail.eligibilityTitle")}</h2>
            <p className="type-caption">{t("schemeDetail.eligibilitySubtitle")}</p>
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

      <div className="detail-card__section">
        <div className="detail-section__header">
          <h2 className="type-h2">{t("schemeDetail.guideTitle")}</h2>
          <p className="type-caption">{t("schemeDetail.guideSubtitle")}</p>
        </div>
        <div className="detail-guide">
          {applicationGuide.map((step, index) => (
            <div key={step} className="detail-guide__step">
              <div className="detail-guide__step-index">{index + 1}</div>
              <p className="type-body-en">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {scheme.officeAddress.en || scheme.officeAddress.hi ? (
        <div className="detail-card__section">
          <div className="detail-section__header">
            <h2 className="type-h2">{t("schemeDetail.officeAddress")}</h2>
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
      <ChecklistGenerator scheme={scheme} />
      <ActionButtons
        schemeId={scheme.id}
        schemeName={scheme.schemeName}
        benefitAmount={scheme.benefitAmount}
        category={scheme.category}
        state={scheme.state}
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
