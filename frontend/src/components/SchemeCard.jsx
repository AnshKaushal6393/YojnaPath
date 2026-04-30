import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getCategoryMeta } from "../lib/categoryMeta";
import { generateChecklistPdf } from "../lib/checklistPdf";
import { explainSchemeInHindi } from "../lib/schemeExplainApi";
import { reportSchemeIssue } from "../lib/schemeReportApi";
import { fetchSchemeDetail } from "../lib/schemeDetailApi";

const ISSUE_OPTIONS = [
  { value: "wrong_url", label: "Wrong URL" },
  { value: "scheme_closed", label: "Scheme is closed" },
  { value: "wrong_eligibility", label: "Wrong eligibility info" },
  { value: "other", label: "Other" },
];

function cleanExplanationMarkup(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[*-]\s+/gm, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createSpeechChunks(value) {
  const cleanText = cleanExplanationMarkup(value);
  const pieces = cleanText
    .split(/(?<=[\u0964.!?])\s+|\n+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";

  pieces.forEach((piece) => {
    if (piece.length > 220) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      const lastLine = piece.split(/\s+/).reduce((line, word) => {
        const next = line ? `${line} ${word}` : word;
        if (next.length > 180) {
          if (line) {
            chunks.push(line);
          }
          return word;
        }
        return next;
      }, "");
      if (lastLine) {
        chunks.push(lastLine);
      }
      return;
    }

    const next = current ? `${current} ${piece}` : piece;
    if (next.length > 220) {
      chunks.push(current);
      current = piece;
    } else {
      current = next;
    }
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function getPreferredHindiVoice(voices) {
  return (
    voices.find((voice) => voice.lang?.toLowerCase() === "hi-in") ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("hi")) ||
    voices.find((voice) => /hindi|kalpana|hemant/i.test(voice.name || "")) ||
    voices.find((voice) => voice.lang?.toLowerCase().includes("in")) ||
    null
  );
}

function renderExplanationText(value) {
  const lines = String(value ?? "").replace(/\r/g, "").split("\n");
  const nodes = [];
  let paragraph = [];
  let bullets = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    nodes.push(
      <p className="scheme-explain-sheet__paragraph" key={`p-${nodes.length}`}>
        {cleanExplanationMarkup(paragraph.join(" "))}
      </p>
    );
    paragraph = [];
  }

  function flushBullets() {
    if (!bullets.length) {
      return;
    }

    nodes.push(
      <ul className="scheme-explain-sheet__list" key={`ul-${nodes.length}`}>
        {bullets.map((item, index) => (
          <li key={`${item}-${index}`}>{cleanExplanationMarkup(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushBullets();
      return;
    }

    const bulletMatch = trimmed.match(/^[*-]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
      return;
    }

    const headingMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (headingMatch) {
      flushParagraph();
      flushBullets();
      nodes.push(
        <h4 className="scheme-explain-sheet__heading" key={`h-${nodes.length}`}>
          {cleanExplanationMarkup(headingMatch[1])}
        </h4>
      );
      return;
    }

    flushBullets();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushBullets();

  return nodes.length ? nodes : <p className="scheme-explain-sheet__paragraph">{cleanExplanationMarkup(value)}</p>;
}

export default function SchemeCard({
  schemeId,
  schemeName,
  schemeNameHi,
  benefitAmount,
  category,
  state,
  ministry,
  matchStatus,
  description,
  descriptionHi,
  matchScorePercent,
  matchedCriteria,
  totalCriteria,
  isCompareSelectable = false,
  isCompareSelected = false,
  isCompareDisabled = false,
  onCompareToggle = null,
  staggerIndex = 0,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isDownloadingChecklist, setIsDownloadingChecklist] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [schemeExplanation, setSchemeExplanation] = useState("");
  const [isSpeakingExplanation, setIsSpeakingExplanation] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState("wrong_url");
  const [reportNote, setReportNote] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState("");
  const speechChunksRef = useRef([]);
  const speechStopRequestedRef = useRef(false);
  const speechVoiceRetryRef = useRef(false);
  const speechStartTimerRef = useRef(null);

  function toSentenceCase(value) {
    return String(value ?? "")
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function isMeaningful(value) {
    const text = String(value ?? "").trim();
    if (!text) {
      return false;
    }

    if (
      /[{}[\]]/.test(text) ||
      /\bvalue\b/i.test(text) ||
      /\blabel\b/i.test(text)
    ) {
      return false;
    }

    return true;
  }

  const statusClassMap = {
    matched: "status-border-matched",
    "near-miss": "status-border-near-miss",
    expired: "status-border-expired",
    discontinued: "status-border-expired",
  };

  const statusClass = statusClassMap[matchStatus] || "";
  const categoryClass = `category-${category}`;
  const categoryLabel = toSentenceCase(category);
  const categoryMeta = getCategoryMeta(category, categoryLabel);
  const scopeLabel = state === "central" ? "Central" : state;
  const showMinistry = isMeaningful(ministry);
  const showHindiName = isMeaningful(schemeNameHi);
  const showHindiDescription = isMeaningful(descriptionHi);
  const matchScore =
    typeof matchScorePercent === "number" && Number.isFinite(matchScorePercent)
      ? Math.max(0, Math.min(100, Math.round(matchScorePercent)))
      : null;
  const matchToneClass =
    matchScore == null
      ? ""
      : matchScore >= 80
        ? "scheme-card__match-summary--strong"
        : matchScore >= 60
          ? "scheme-card__match-summary--medium"
          : "scheme-card__match-summary--weak";
  const hasCriteriaCount =
    typeof matchedCriteria === "number" &&
    Number.isFinite(matchedCriteria) &&
    typeof totalCriteria === "number" &&
    Number.isFinite(totalCriteria) &&
    totalCriteria > 0;
  const matchExplanation = hasCriteriaCount
    ? matchStatus === "near-miss"
      ? `${matchedCriteria} of ${totalCriteria} eligibility checks matched`
      : `Matched after checking ${totalCriteria} eligibility rules`
    : null;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return undefined;
    }

    function loadVoices() {
      setAvailableVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechStopRequestedRef.current = true;
      if (speechStartTimerRef.current) {
        window.clearTimeout(speechStartTimerRef.current);
      }
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  function openDetail(event) {
    event?.preventDefault();
    event?.stopPropagation();
    navigate(`/schemes/${schemeId}`);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openExplainSheet();
    }
  }

  function handleCompareToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    onCompareToggle?.(schemeId);
  }

  async function handleChecklistDownload(event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      setIsDownloadingChecklist(true);
      const scheme = await fetchSchemeDetail(schemeId);
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
    } catch (error) {
      window.alert(error?.message || t("checklist.error"));
    } finally {
      setIsDownloadingChecklist(false);
    }
  }

  async function openExplainSheet(event) {
    event?.preventDefault();
    event?.stopPropagation();

    try {
      setIsExplainOpen(true);
      setIsExplaining(true);
      setSchemeExplanation("");
      const payload = await explainSchemeInHindi(schemeId);
      setSchemeExplanation(payload?.explanation || "Abhi simple explanation available nahi hai.");
    } catch (error) {
      setSchemeExplanation(error?.message || "Scheme explanation load nahi ho paya.");
    } finally {
      setIsExplaining(false);
    }
  }

  function closeExplainSheet() {
    if (isExplaining) {
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechStopRequestedRef.current = true;
      if (speechStartTimerRef.current) {
        window.clearTimeout(speechStartTimerRef.current);
        speechStartTimerRef.current = null;
      }
      window.speechSynthesis.cancel();
    }
    setIsSpeakingExplanation(false);
    setIsExplainOpen(false);
  }

  function handleSpeakExplanation() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !schemeExplanation.trim()) {
      window.alert("Voice playback is not available on this device.");
      return;
    }

    if (isSpeakingExplanation || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      speechStopRequestedRef.current = true;
      if (speechStartTimerRef.current) {
        window.clearTimeout(speechStartTimerRef.current);
        speechStartTimerRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeakingExplanation(false);
      return;
    }

    const chunks = createSpeechChunks(schemeExplanation);
    if (!chunks.length) {
      return;
    }

    const latestVoices = window.speechSynthesis.getVoices();
    const preferredVoice = getPreferredHindiVoice(latestVoices.length ? latestVoices : availableVoices);

    speechChunksRef.current = chunks;
    speechStopRequestedRef.current = false;
    speechVoiceRetryRef.current = false;

    function speakChunk(index, useDefaultVoice = false) {
      if (speechStopRequestedRef.current) {
        setIsSpeakingExplanation(false);
        return;
      }

      const text = speechChunksRef.current[index];
      if (!text) {
        setIsSpeakingExplanation(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = preferredVoice?.lang || "hi-IN";
      if (preferredVoice && !useDefaultVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeakingExplanation(true);
      utterance.onend = () => speakChunk(index + 1, useDefaultVoice);
      utterance.onerror = (event) => {
        const errorName = event?.error || "";
        if (speechStopRequestedRef.current || errorName === "canceled" || errorName === "interrupted") {
          setIsSpeakingExplanation(false);
          return;
        }

        if (preferredVoice && !useDefaultVoice && !speechVoiceRetryRef.current) {
          speechVoiceRetryRef.current = true;
          speakChunk(index, true);
          return;
        }

        setIsSpeakingExplanation(false);
        window.alert("Voice playback start nahi ho paya.");
      };
      window.speechSynthesis.speak(utterance);
    }

    try {
      window.speechSynthesis.cancel();
      setIsSpeakingExplanation(true);
      speechStartTimerRef.current = window.setTimeout(() => {
        speechStartTimerRef.current = null;
        speakChunk(0);
      }, 80);
    } catch (error) {
      setIsSpeakingExplanation(false);
      window.alert("Voice playback start nahi ho paya.");
    }
  }

  function openReportSheet(event) {
    event.preventDefault();
    event.stopPropagation();
    setReportSuccessMessage("");
    setSelectedIssue("wrong_url");
    setReportNote("");
    setIsReportOpen(true);
  }

  function closeReportSheet() {
    if (isSubmittingReport) {
      return;
    }

    setIsReportOpen(false);
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      setIsSubmittingReport(true);
      await reportSchemeIssue(schemeId, {
        reason: selectedIssue,
        note: reportNote,
        lang: i18n.resolvedLanguage,
      });
      setReportSuccessMessage("Thanks. We sent this to the admin review queue.");
      setIsReportOpen(false);
    } catch (error) {
      window.alert(error?.message || "Could not submit issue report.");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <article
      className={`scheme-card ${statusClass}`.trim()}
      style={{ "--stagger-index": staggerIndex }}
      role="button"
      tabIndex={0}
      aria-label={`Explain ${schemeName} in simple Hindi`}
      onClick={openExplainSheet}
      onKeyDown={handleKeyDown}
    >
      <div className="scheme-card__top">
        <div className="scheme-card__meta-chips">
          <div className={`scheme-card__category-chip ${categoryClass}`}>
            <span className="category-badge__text">{categoryLabel}</span>
          </div>
          <div className="scheme-card__scope-chip">
            <span className="type-micro">{scopeLabel}</span>
          </div>
        </div>
        <div className="scheme-card__benefit-chip">
          <p className="type-benefit">{benefitAmount}</p>
        </div>
      </div>
      {isCompareSelectable ? (
        <div className="scheme-card__compare-row" onClick={(event) => event.stopPropagation()}>
          <label className="scheme-card__compare-toggle">
            <input
              type="checkbox"
              checked={isCompareSelected}
              disabled={isCompareDisabled}
              onChange={handleCompareToggle}
              aria-label={`Select ${schemeName} for comparison`}
            />
            <span>Compare</span>
          </label>
        </div>
      ) : null}

      <div className="scheme-card__content">
        <div className="scheme-card__identity">
          <div className={`scheme-card__icon-box ${categoryMeta.tone}`} aria-hidden="true">
            {categoryMeta.icon}
          </div>
          <div className="scheme-card__title-block">
            <h3 className="scheme-card__title-en">{schemeName}</h3>
            {showHindiName ? <p className="scheme-card__title-hi hi">{schemeNameHi}</p> : null}
            {showMinistry ? <p className="scheme-card__ministry type-caption">{ministry}</p> : null}
          </div>
        </div>
        <p className="scheme-description scheme-description--en">{description}</p>
        {showHindiDescription ? (
          <p className="scheme-description scheme-description--hi hi">{descriptionHi}</p>
        ) : null}
        {matchScore != null || matchExplanation ? (
          <div className="scheme-card__match-block" aria-hidden="true">
            {matchExplanation ? (
              <div className={`scheme-card__match-summary ${matchToneClass}`.trim()}>
                {matchExplanation}
              </div>
            ) : null}
            {matchScore != null ? (
              <div className="scheme-card__match-track">
                <span className="scheme-card__match-fill" style={{ width: `${matchScore}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="scheme-card__actions" onClick={(event) => event.stopPropagation()}>
          <div className="scheme-card__action-stack">
            <button
              type="button"
              className="detail-card__secondary-button scheme-card__explain-button"
              onClick={openExplainSheet}
              disabled={isExplaining}
            >
              {isExplaining ? "Samjha rahe hain..." : "Samjhao"}
            </button>
            <button
              type="button"
              className="detail-card__secondary-button"
              onClick={handleChecklistDownload}
              disabled={isDownloadingChecklist}
            >
              {isDownloadingChecklist ? t("checklist.generating") : t("checklist.download")}
            </button>
            <div className="scheme-card__report-row">
              <button type="button" className="scheme-card__report-link" onClick={openReportSheet}>
                Report an issue
              </button>
              {reportSuccessMessage ? (
                <span className="scheme-card__report-feedback" role="status">
                  {reportSuccessMessage}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="scheme-card__expand-row"
          onClick={openDetail}
          aria-label={`View full details for ${schemeName}`}
        >
          <span className="scheme-card__expand-label">View full details</span>
          <span className="card-expand-icon">{"\u2197"}</span>
        </button>
      </div>
      {isReportOpen ? (
        <div className="app-modal-backdrop app-modal-backdrop--sheet" role="presentation" onClick={closeReportSheet}>
          <div
            className="app-modal scheme-report-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`scheme-report-title-${schemeId}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <form className="scheme-report-sheet__form" onSubmit={handleReportSubmit}>
              <div className="scheme-report-sheet__header">
                <div>
                  <p className="type-label">Report issue</p>
                  <h3 id={`scheme-report-title-${schemeId}`} className="type-h3">
                    {schemeName}
                  </h3>
                </div>
                <button
                  type="button"
                  className="scheme-report-sheet__close"
                  onClick={closeReportSheet}
                  aria-label="Close report issue dialog"
                >
                  x
                </button>
              </div>

              <div className="scheme-report-sheet__options">
                {ISSUE_OPTIONS.map((option) => (
                  <label key={option.value} className="scheme-report-sheet__option">
                    <input
                      type="radio"
                      name={`scheme-issue-${schemeId}`}
                      value={option.value}
                      checked={selectedIssue === option.value}
                      onChange={() => setSelectedIssue(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <label className="scheme-report-sheet__field">
                <span className="type-label">Note</span>
                <textarea
                  className="scheme-report-sheet__textarea"
                  rows={4}
                  value={reportNote}
                  onChange={(event) => setReportNote(event.target.value)}
                  placeholder="Optional details for the admin team"
                />
              </label>

              <div className="scheme-report-sheet__actions">
                <button
                  type="button"
                  className="scheme-report-sheet__ghost"
                  onClick={closeReportSheet}
                  disabled={isSubmittingReport}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="detail-card__secondary-button"
                  disabled={isSubmittingReport || (selectedIssue === "other" && !reportNote.trim())}
                >
                  {isSubmittingReport ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isExplainOpen ? (
        <div className="app-modal-backdrop app-modal-backdrop--sheet" role="presentation" onClick={closeExplainSheet}>
          <div
            className="app-modal scheme-report-sheet scheme-explain-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`scheme-explain-title-${schemeId}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div className="scheme-report-sheet__form">
              <div className="scheme-report-sheet__header">
                <div>
                  <p className="type-label">AI scheme explainer</p>
                  <h3 id={`scheme-explain-title-${schemeId}`} className="type-h3">
                    {schemeName}
                  </h3>
                </div>
                <button
                  type="button"
                  className="scheme-report-sheet__close"
                  onClick={closeExplainSheet}
                  aria-label="Close explainer dialog"
                >
                  x
                </button>
              </div>

              <div className="scheme-explain-sheet__content">
                {isExplaining ? (
                  <p className="type-body-en">Simple Hindi explanation aa raha hai...</p>
                ) : (
                  <>
                    <div className="scheme-explain-sheet__actions">
                      <button
                        type="button"
                        className="detail-card__secondary-button"
                        onClick={handleSpeakExplanation}
                        disabled={!schemeExplanation.trim()}
                      >
                        {isSpeakingExplanation ? "Roko" : "Suno"}
                      </button>
                    </div>
                    <div className="scheme-explain-sheet__text">{renderExplanationText(schemeExplanation)}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
