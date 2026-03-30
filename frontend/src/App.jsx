import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "./components/BottomNav";
import HomeHero from "./components/HomeHero";
import LastMatchSummary from "./components/LastMatchSummary";
import RecentMatches from "./components/RecentMatches";
import UrgencyBanner from "./components/UrgencyBanner";
import UserTypeGrid from "./components/UserTypeGrid";
import { fetchHomeData } from "./lib/homeApi";

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
  const [openCard, setOpenCard] = useState("");
  const cachedDateLabel = useMemo(() => formatCachedDate(new Date("2026-03-25")), []);

  const homeQuery = useQuery({
    queryKey: ["home-data"],
    queryFn: fetchHomeData,
  });

  return (
    <main className="app-shell">
      <div className="home-page">
        <HomeHero
          language={language}
          onLanguageChange={setLanguage}
          hasProfile={hasProfile}
          onProfileModeChange={setHasProfile}
        />

        {!offlineBannerDismissed && homeQuery.isError ? (
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

        {hasProfile ? (
          <LastMatchSummary
            impact={homeQuery.data?.impact}
            health={homeQuery.data?.health}
            isLoading={homeQuery.isLoading}
            error={homeQuery.error}
          />
        ) : (
          <UserTypeGrid />
        )}

        <UrgencyBanner text="Deadline in 3 days - apply soon" />

        <RecentMatches
          schemes={homeQuery.data?.recentMatches || []}
          isLoading={homeQuery.isLoading}
          error={homeQuery.error}
          openCard={openCard}
          onToggle={setOpenCard}
        />
      </div>

      <BottomNav active="home" />
    </main>
  );
}
