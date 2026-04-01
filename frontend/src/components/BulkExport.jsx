function buildPrintableMarkup(savedSchemes) {
  const rows = savedSchemes
    .map(
      (scheme, index) => `
        <section style="padding:16px;border:1px solid #d9e8e1;border-radius:12px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <p style="margin:0 0 6px;color:#085041;font:700 12px sans-serif;letter-spacing:.08em;text-transform:uppercase;">${scheme.categoryLabel}</p>
              <h2 style="margin:0 0 6px;color:#1a1a1a;font:700 20px/1.3 sans-serif;">${index + 1}. ${scheme.schemeName}</h2>
              ${scheme.schemeNameHi ? `<p style="margin:0 0 6px;color:#555;font:400 15px/1.7 sans-serif;">${scheme.schemeNameHi}</p>` : ""}
            </div>
            <div style="padding:10px 14px;border-radius:20px;background:#E1F5EE;color:#085041;font:700 18px sans-serif;white-space:nowrap;">${scheme.benefitAmount}</div>
          </div>
          <p style="margin:8px 0;color:#555;font:400 14px/1.6 sans-serif;">${scheme.description}</p>
          <p style="margin:4px 0;color:#777;font:400 12px/1.45 sans-serif;">Saved on ${new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(scheme.savedAt))}</p>
          ${scheme.isDiscontinued ? `<p style="margin:8px 0 0;color:#E24B4A;font:600 12px sans-serif;">This scheme may no longer be open.</p>` : ""}
        </section>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Saved schemes</title>
        <meta charset="utf-8" />
      </head>
      <body style="margin:24px;background:#f7f7f5;color:#1a1a1a;font-family:sans-serif;">
        <h1 style="margin:0 0 8px;">Saved schemes</h1>
        <p style="margin:0 0 24px;color:#555;">Exported from YojnaPath</p>
        ${rows}
      </body>
    </html>
  `;
}

export default function BulkExport({ savedSchemes }) {
  function handleExport() {
    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintableMarkup(savedSchemes));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <button type="button" className="saved-export-button" onClick={handleExport}>
      Export all as PDF
    </button>
  );
}
