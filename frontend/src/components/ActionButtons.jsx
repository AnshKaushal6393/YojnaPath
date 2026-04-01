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
  applyUrl,
  documents,
  schemeUrl,
  isSaved,
  isSavePending,
  onToggleSave,
  onTrackApplication,
  isTrackPending,
}) {
  async function handleShare() {
    const shareData = {
      title: schemeName,
      text: `Check this scheme on YojnaPath: ${schemeName}`,
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

    await copyToClipboard(content || "No documents listed.");
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
          <span className="type-label">Open apply link</span>
        </a>
      ) : null}
      <button type="button" className="detail-card__secondary-button" onClick={handleCopyDocuments}>
        Copy documents list
      </button>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={onToggleSave}
        disabled={isSavePending}
      >
        {isSavePending ? "Updating..." : isSaved ? "Remove from saved" : "Save scheme"}
      </button>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={onTrackApplication}
        disabled={isTrackPending}
      >
        {isTrackPending ? "Saving..." : "Mark as applied"}
      </button>
      <button type="button" className="detail-card__secondary-button" onClick={handleShare}>
        Share scheme
      </button>
    </div>
  );
}
