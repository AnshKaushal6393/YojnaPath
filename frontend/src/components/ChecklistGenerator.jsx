import { useMemo, useState } from "react";

function sanitizeFileName(value) {
  return String(value ?? "scheme")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function drawCheckbox(doc, x, y) {
  doc.setDrawColor(29, 158, 117);
  doc.roundedRect(x, y - 3.5, 4.5, 4.5, 0.8, 0.8);
}

function splitLine(doc, text, width) {
  if (!text) {
    return [];
  }

  return doc.splitTextToSize(String(text), width);
}

async function generateChecklistPdf(scheme, items) {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  doc.setFillColor(29, 158, 117);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("YojnaPath checklist", left, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Generated in your browser", right, 14, { align: "right" });

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = splitLine(doc, scheme.schemeName, contentWidth - 44);
  doc.text(titleLines, left, 36);
  let cursorY = 36 + titleLines.length * 7;

  if (scheme.schemeNameHi) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const titleHiLines = splitLine(doc, scheme.schemeNameHi, contentWidth - 44);
    doc.text(titleHiLines, left, cursorY);
    cursorY += titleHiLines.length * 5 + 2;
  }

  doc.setTextColor(8, 80, 65);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(scheme.benefitAmount || "Benefit available", left, cursorY + 2);

  if (scheme.applyUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(scheme.applyUrl, { width: 100, margin: 1 });
      doc.addImage(qrDataUrl, "PNG", right - 28, 30, 24, 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(92, 103, 112);
      doc.text("Scan to apply", right - 16, 58, { align: "center" });
    } catch {
      // Keep PDF generation working even if QR creation fails.
    }
  }

  cursorY += 12;
  doc.setDrawColor(222, 231, 235);
  doc.line(left, cursorY, right, cursorY);
  cursorY += 10;

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Documents and checks", left, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of items) {
    if (cursorY > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }

    drawCheckbox(doc, left, cursorY);
    const primaryText = item.en || item.hi || "";
    const secondaryText =
      item.hi && item.en && item.hi !== item.en ? item.hi : "";

    const primaryLines = splitLine(doc, primaryText, contentWidth - 10);
    doc.setTextColor(26, 26, 26);
    doc.text(primaryLines, left + 8, cursorY);
    cursorY += primaryLines.length * 5;

    if (secondaryText) {
      const secondaryLines = splitLine(doc, secondaryText, contentWidth - 10);
      doc.setFontSize(8.5);
      doc.setTextColor(116, 124, 132);
      doc.text(secondaryLines, left + 8, cursorY);
      cursorY += secondaryLines.length * 4.2;
      doc.setFontSize(10);
    }

    cursorY += 5;
  }

  if (scheme.applyUrl) {
    if (cursorY > pageHeight - 20) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text("Official apply link", left, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(8, 80, 65);
    const linkLines = splitLine(doc, scheme.applyUrl, contentWidth);
    doc.text(linkLines, left, cursorY);
  }

  doc.save(`${sanitizeFileName(scheme.id || scheme.schemeName)}-checklist.pdf`);
}

export default function ChecklistGenerator({ scheme }) {
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

  if (!checklistItems.length) {
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
      await generateChecklistPdf(scheme, checklistItems);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="detail-card__section">
      <div className="detail-section__header">
        <h2 className="type-h2">Checklist generator</h2>
        <p className="type-caption">
          Track what is ready now and download a simple checklist for later.
        </p>
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
        {isExporting ? "Generating PDF..." : "Download checklist PDF"}
      </button>
    </div>
  );
}
