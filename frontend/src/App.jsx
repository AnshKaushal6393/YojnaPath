import { useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import HomeHero from "./components/HomeHero";
import LastMatchSummary from "./components/LastMatchSummary";
import RecentMatches from "./components/RecentMatches";
import UrgencyBanner from "./components/UrgencyBanner";
import UserTypeGrid from "./components/UserTypeGrid";

function formatCachedDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [hasProfile, setHasProfile] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [openCard, setOpenCard] = useState("pm-kisan");
  const cachedDateLabel = useMemo(() => formatCachedDate(new Date("2026-03-25")), []);

  return (
    <main className="app-shell">
      <div className="home-page">
        <HomeHero
          language={language}
          onLanguageChange={setLanguage}
          hasProfile={hasProfile}
          onProfileModeChange={setHasProfile}
        />

        {!offlineBannerDismissed ? (
          <div className="offline-banner state-info" role="status" aria-live="polite">
            <span className="type-caption">
              Offline - showing results saved on {cachedDateLabel}. Connect to internet for fresh
              results.
            </span>
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

        {hasProfile ? <LastMatchSummary /> : <UserTypeGrid />}

        <UrgencyBanner text="Deadline in 3 days - apply soon" />

        <RecentMatches openCard={openCard} onToggle={setOpenCard} />
      </div>

      <BottomNav active="home" />
    </main>
  );
}
