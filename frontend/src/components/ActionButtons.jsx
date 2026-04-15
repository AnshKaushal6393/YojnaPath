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
  schemeId,
  schemeName,
  benefitAmount,
  category,
  state,
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

  async function handleShare() {
    const shareData = {
      title: schemeName,
      text: t("actions.shareSchemeText", { scheme: schemeName }),
      url: schemeUrl,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await copyToClipboard(`${shareData.text}\n${shareData.url}`);
  }

  async function handleCopyDocuments() {
    const content = documents
      .map((document, index) => `${index + 1}. ${document.en || document.hi}`)
      .join("\n");

    await copyToClipboard(content || t("actions.noDocuments"));
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
      <button type="button" className="detail-card__secondary-button" onClick={handleCopyDocuments}>
        {t("actions.copyDocuments")}
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
      <button type="button" className="detail-card__secondary-button" onClick={handleShare}>
        {t("actions.shareScheme")}
      </button>
    </div>
  );
}
