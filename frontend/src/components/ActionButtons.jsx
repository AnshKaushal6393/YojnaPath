import { useTranslation } from "react-i18next";

export default function ActionButtons({
  schemeName,
  benefitAmount,
  applyUrl,
  applyUrlFinal,
  applyUrlRedirect,
  applyUrlStatus,
  urlStatus,
  documents,
  schemeUrl,
  isSaved,
  isSavePending,
  onToggleSave,
  onTrackApplication,
  isTrackPending,
}) {
  const { t, i18n } = useTranslation();
  const useFallback = applyUrlStatus === "fallback" || urlStatus === "dead";
  const resolvedApplyUrl = getApplyUrl({
    schemeName,
    applyUrl,
    applyUrlFinal,
    applyUrlRedirect,
    applyUrlStatus,
    urlStatus,
  });
  const isHindi = i18n.resolvedLanguage?.toLowerCase().startsWith("hi");

  function getApplyUrl(scheme) {
    if (scheme.applyUrlStatus === "fallback") {
      return scheme.applyUrlFinal || buildMySchemeSearchUrl(scheme.schemeName);
    }

    if (scheme.urlStatus === "dead") {
      return buildMySchemeSearchUrl(scheme.schemeName);
    }

    if (scheme.applyUrlFinal && scheme.applyUrlStatus === "redirected") {
      return scheme.applyUrlFinal;
    }

    if (scheme.applyUrlRedirect) {
      return scheme.applyUrlRedirect;
    }

    return scheme.applyUrl;
  }

  function buildMySchemeSearchUrl(name) {
    if (!name) {
      return "https://www.myscheme.gov.in/search";
    }

    const searchQuery = encodeURIComponent(name);
    return `https://www.myscheme.gov.in/search?keyword=${searchQuery}`;
  }

  function getFallbackWarning() {
    if (isHindi) {
      return t("actions.fallbackWarningHi");
    }

    return t("actions.fallbackWarning");
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
      resolvedApplyUrl ? t("actions.whatsappApply", { url: resolvedApplyUrl }) : "",
      schemeUrl ? t("actions.whatsappDetails", { url: schemeUrl }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="detail-actions">
      {useFallback ? (
        <p className="detail-actions__url-warning" role="status">
          <span aria-hidden="true">{"\u26A0\uFE0F"}</span>{" "}
          {getFallbackWarning()}
        </p>
      ) : null}
      {resolvedApplyUrl ? (
        <a
          href={resolvedApplyUrl}
          target="_blank"
          rel="noreferrer"
          className="detail-card__apply btn-primary tap-target"
        >
          <span className="type-label">
            {useFallback ? t("actions.findOnMyScheme") : t("actions.applyNow")}
          </span>
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
    </div>
  );
}
