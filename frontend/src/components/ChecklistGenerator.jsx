import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateChecklistPdf, getChecklistItemCount } from "../lib/checklistPdf";

export default function ChecklistGenerator({ scheme }) {
  const { t, i18n } = useTranslation();
  const { schemeName, documents, eligibilityItems } = scheme;
  const checklistItems = useMemo(() => {
    const eligibilityRows = eligibilityItems
      .filter(Boolean)
      .map((item) => ({ en: item, hi: "" }));
    const documentRows = documents
      .filter((document) => document.en || document.hi)
      .map((document) => ({
        en: document.en || document.hi,
        hi: document.hi || "",
      }));

    return [...eligibilityRows, ...documentRows];
  }, [documents, eligibilityItems]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  if (!getChecklistItemCount(scheme)) {
    return null;
  }

  function toggleItem(item) {
    setCheckedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item]
    );
  }

  async function handleExport() {
    try {
      setIsExporting(true);
      await generateChecklistPdf(scheme, {
        lang: i18n.resolvedLanguage,
        labels: {
          brandTitle: t("checklist.brandTitle"),
          generatedInBrowser: t("checklist.generatedInBrowser"),
          benefitFallback: t("checklist.benefitFallback"),
          scanToApply: t("checklist.scanToApply"),
          documentsAndChecks: t("checklist.documentsAndChecks"),
          officialApplyLink: t("checklist.officialApplyLink"),
        },
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="detail-card__section">
      <div className="detail-section__header">
        <h2 className="type-h2">{t("checklist.title")}</h2>
        <p className="type-caption">{t("checklist.subtitle")}</p>
      </div>
      <div className="detail-checklist">
        {checklistItems.map((item, index) => {
          const isChecked = checkedItems.includes(item);
          return (
            <label
              key={`${index}-${item.en}-${item.hi}`}
              className={`detail-checklist__item ${isChecked ? "is-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(item)}
              />
              <span className="detail-checklist__copy">
                <span className="type-body-en">{item.en}</span>
                {item.hi && item.hi !== item.en ? (
                  <span className="type-caption hi" lang="hi">
                    {item.hi}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? t("checklist.generating") : t("checklist.download")}
      </button>
    </div>
  );
}
