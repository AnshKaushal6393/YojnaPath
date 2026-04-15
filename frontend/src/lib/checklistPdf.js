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

function buildChecklistItems(scheme) {
  const eligibilityRows = (scheme.eligibilityItems || [])
    .filter(Boolean)
    .map((item) => ({ en: item, hi: "" }));
  const documentRows = (scheme.documents || [])
    .filter((document) => document.en || document.hi)
    .map((document) => ({
      en: document.en || document.hi,
      hi: document.hi || "",
    }));

  return [...eligibilityRows, ...documentRows];
}

export function getChecklistItemCount(scheme) {
  return buildChecklistItems(scheme).length;
}

export async function generateChecklistPdf(scheme, options = {}) {
  const { lang = "en", labels = {} } = options;
  const items = buildChecklistItems(scheme);

  if (!items.length) {
    return;
  }

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
  const primaryLanguage = lang === "hi" ? "hi" : "en";
  const secondaryLanguage = primaryLanguage === "hi" ? "en" : "hi";
  const title = primaryLanguage === "hi" && scheme.schemeNameHi ? scheme.schemeNameHi : scheme.schemeName;
  const secondaryTitle =
    primaryLanguage === "hi"
      ? scheme.schemeName
      : scheme.schemeNameHi && scheme.schemeNameHi !== scheme.schemeName
        ? scheme.schemeNameHi
        : "";

  doc.setFillColor(29, 158, 117);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(labels.brandTitle || "YojnaPath checklist", left, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(labels.generatedInBrowser || "Generated in your browser", right, 14, { align: "right" });

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = splitLine(doc, title, contentWidth - 44);
  doc.text(titleLines, left, 36);
  let cursorY = 36 + titleLines.length * 7;

  if (secondaryTitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const secondaryTitleLines = splitLine(doc, secondaryTitle, contentWidth - 44);
    doc.text(secondaryTitleLines, left, cursorY);
    cursorY += secondaryTitleLines.length * 5 + 2;
  }

  doc.setTextColor(8, 80, 65);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(scheme.benefitAmount || (labels.benefitFallback || "Benefit available"), left, cursorY + 2);

  if (scheme.applyUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(scheme.applyUrl, { width: 100, margin: 1 });
      doc.addImage(qrDataUrl, "PNG", right - 28, 30, 24, 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(92, 103, 112);
      doc.text(labels.scanToApply || "Scan to apply", right - 16, 58, { align: "center" });
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
  doc.text(labels.documentsAndChecks || "Documents and checks", left, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of items) {
    if (cursorY > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }

    drawCheckbox(doc, left, cursorY);
    const primaryText = item[primaryLanguage] || item[secondaryLanguage] || "";
    const secondaryText =
      item[secondaryLanguage] && item[secondaryLanguage] !== primaryText ? item[secondaryLanguage] : "";

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
    doc.text(labels.officialApplyLink || "Official apply link", left, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(8, 80, 65);
    const linkLines = splitLine(doc, scheme.applyUrl, contentWidth);
    doc.text(linkLines, left, cursorY);
  }

  doc.save(`${sanitizeFileName(scheme.id || scheme.schemeName)}-checklist.pdf`);
}
