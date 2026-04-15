import { useState } from "react";
import { useTranslation } from "react-i18next";

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
  return Promise.resolve();
}

export default function ActionButtons({
  schemeName,
  benefitAmount,
  applyUrl,
  documents,
  schemeUrl,
  isSaved,
  isSavePending,
  onToggleSave,
  onTrackApplication,
  isTrackPending,
}) {
  const { t } = useTranslation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  async function handleCopyDocuments() {
    const content = documents
      .map((document, index) => `${index + 1}. ${document.en || document.hi}`)
      .join("\n");

    await copyToClipboard(content || t("actions.noDocuments"));
    setIsMoreOpen(false);
  }

  function handleWhatsappShare() {
    const topDocuments = documents
      .slice(0, 3)
      .map((document) => document.en || document.hi)
      .filter(Boolean)
      .join(", ");

    const message = [
      t("actions.whatsappTitle", { scheme: schemeName }),
      benefitAmount ? t("actions.whatsappBenefit", { benefit: benefitAmount }) : "",
      topDocuments ? t("actions.whatsappDocuments", { documents: topDocuments }) : "",
      applyUrl ? t("actions.whatsappApply", { url: applyUrl }) : "",
      schemeUrl ? t("actions.whatsappDetails", { url: schemeUrl }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setIsMoreOpen(false);
  }

  return (
    <div className="detail-actions">
      {applyUrl ? (
        <a
          href={applyUrl}
          target="_blank"
          rel="noreferrer"
          className="detail-card__apply btn-primary tap-target"
        >
          <span className="type-label">{t("actions.applyNow")}</span>
        </a>
      ) : null}
      <button type="button" className="detail-card__secondary-button" onClick={handleWhatsappShare}>
        {t("actions.shareWhatsapp")}
      </button>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={onToggleSave}
        disabled={isSavePending}
      >
        {isSavePending
          ? t("actions.updating")
          : isSaved
            ? t("actions.removeSaved")
            : t("actions.saveScheme")}
      </button>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={onTrackApplication}
        disabled={isTrackPending}
      >
        {isTrackPending ? t("actions.saving") : t("actions.markApplied")}
      </button>
      <div className={`detail-actions__menu ${isMoreOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="detail-card__secondary-button"
          onClick={() => setIsMoreOpen((current) => !current)}
          aria-expanded={isMoreOpen}
          aria-haspopup="menu"
        >
          {t("actions.more")}
        </button>
        {isMoreOpen ? (
          <div className="detail-actions__dropdown" role="menu">
            <button
              type="button"
              className="detail-actions__dropdown-item"
              onClick={handleWhatsappShare}
            >
              {t("actions.shareWhatsapp")}
            </button>
            <button
              type="button"
              className="detail-actions__dropdown-item"
              onClick={handleCopyDocuments}
            >
              {t("actions.copyDocuments")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
