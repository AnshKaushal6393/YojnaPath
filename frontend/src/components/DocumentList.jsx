import { useTranslation } from "react-i18next";

export default function DocumentList({ documents }) {
  const { t } = useTranslation();

  if (!documents.length) {
    return null;
  }

  return (
    <div className="detail-card__section">
      <div className="detail-section__header">
        <h2 className="type-h2">{t("documents.title")}</h2>
        <p className="type-caption">{t("documents.subtitle")}</p>
      </div>
      <div className="detail-card__documents">
        {documents.map((document, index) => (
          <div key={`${document.en}-${index}`} className="detail-card__document">
            <div className="detail-card__document-check" aria-hidden="true">
              <span className="detail-card__document-check-icon">{"\u2713"}</span>
            </div>
            <div className="detail-card__document-copy">
              {document.en ? <p className="type-body-en">{document.en}</p> : null}
              {document.hi ? (
                <p className="type-caption hi" lang="hi">
                  {document.hi}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
