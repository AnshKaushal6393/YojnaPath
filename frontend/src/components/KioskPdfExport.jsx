import { recordKioskPdfDownload } from "../lib/kioskApi";

function buildPrintableMarkup(pdfData) {
  const schemes = pdfData?.schemes || [];
  const rows = schemes
    .map(
      (scheme, index) => `
        <section style="padding:16px;border:1px solid #d9e8e1;border-radius:12px;margin-bottom:12px;">
          <h2 style="margin:0 0 8px;color:#1a1a1a;font:700 18px/1.3 sans-serif;">${index + 1}. ${scheme.name?.en || "Scheme"}</h2>
          <p style="margin:0 0 8px;color:#555;font:400 14px/1.6 sans-serif;">Benefit: ${scheme.benefitAmount || "Benefit available"}</p>
          <p style="margin:0 0 8px;color:#555;font:400 14px/1.6 sans-serif;">Apply mode: ${scheme.applyMode || "Check details"}</p>
          ${scheme.applyUrl ? `<p style="margin:0;color:#085041;font:600 13px sans-serif;">Apply: ${scheme.applyUrl}</p>` : ""}
        </section>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Kiosk result sheet</title>
        <meta charset="utf-8" />
      </head>
      <body style="margin:24px;background:#f7f7f5;color:#1a1a1a;font-family:sans-serif;">
        <h1 style="margin:0 0 8px;">YojnaPath kiosk result sheet</h1>
        <p style="margin:0 0 8px;color:#555;">Kiosk ID: ${pdfData?.kioskId || "Unknown"}</p>
        <p style="margin:0 0 8px;color:#555;">Generated at: ${new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(pdfData?.generatedAt || Date.now()))}</p>
        <p style="margin:0 0 24px;color:#555;">Matched: ${pdfData?.summary?.matched || 0} | Near misses: ${pdfData?.summary?.nearMisses || 0}</p>
        ${rows}
      </body>
    </html>
  `;
}

export default function KioskPdfExport({ pdfData, disabled = false }) {
  return (
    <button
      type="button"
      className="saved-export-button"
      disabled={disabled}
      onClick={() => {
        recordKioskPdfDownload().catch(() => null);
        const popup = window.open("", "_blank", "width=960,height=720");
        if (!popup) {
          return;
        }

        popup.document.open();
        popup.document.write(buildPrintableMarkup(pdfData));
        popup.document.close();
        popup.focus();
        popup.print();
      }}
    >
      Export kiosk PDF
    </button>
  );
}
