import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import SchemeCard from "./components/SchemeCard";
import { INCOME_BANDS, LAND_BANDS } from "./data/profileOptions";

function formatCachedDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function fakeMatchRequest() {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ ok: true });
    }, 2200);
  });
}

export default function App() {
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const cachedDateLabel = useMemo(() => formatCachedDate(new Date("2026-03-25")), []);
  const searchMutation = useMutation({
    mutationFn: fakeMatchRequest,
  });

  return (
    <main className="app-shell">
      <section className="token-preview-card">
        <p className="type-display">YojnaPath</p>
        <h1 className="type-h1 hi" lang="hi">
          योजनाएं खोजें
        </h1>
        <p className="type-body-en">
          React + Vite scaffold is set up and your design tokens are now available globally.
        </p>
        <p className="type-body-hi hi" lang="hi">
          एक बार जानकारी भरें। सभी पात्र सरकारी योजनाएं देखें — दस्तावेज़ और आवेदन लिंक के साथ।
        </p>

        {!offlineBannerDismissed ? (
          <div className="offline-banner state-info" role="status" aria-live="polite">
            <span className="type-caption">Offline - cached results from {cachedDateLabel}</span>
            <button
              type="button"
              className="offline-banner__dismiss icon-hitbox"
              onClick={() => setOfflineBannerDismissed(true)}
              aria-label="Dismiss offline banner"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="demo-field-grid">
          <label className="demo-field">
            <span className="type-label">वार्षिक आय / Annual income</span>
            <select className="demo-select" defaultValue="">
              <option value="" disabled>
                Select income band
              </option>
              {INCOME_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelHi} / {band.labelEn}
                </option>
              ))}
            </select>
          </label>

          <label className="demo-field">
            <span className="type-label">भूमि का आकार / Land size</span>
            <select className="demo-select" defaultValue="">
              <option value="" disabled>
                Select land band
              </option>
              {LAND_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelHi} / {band.labelEn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="demo-submit-button tap-target"
          onClick={() => searchMutation.mutate()}
          disabled={searchMutation.isPending}
        >
          {searchMutation.isPending ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              <span className="type-label hi" lang="hi">
                खोज रहे हैं...
              </span>
            </>
          ) : (
            <span className="type-label">Search schemes</span>
          )}
        </button>

        <div className="scheme-preview-stack">
          <SchemeCard
            schemeName="PM Kisan Samman Nidhi"
            schemeNameHi="पीएम किसान सम्मान निधि"
            benefitAmount="₹6,000 / year"
            category="agriculture"
            ministry="Ministry of Agriculture"
            matchStatus="matched"
            description="Income support for eligible farming households with direct transfer benefit."
            descriptionHi="पात्र किसान परिवारों के लिए प्रत्यक्ष आय सहायता उपलब्ध कराई जाती है।"
          />
        </div>
      </section>
    </main>
  );
}
