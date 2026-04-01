import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import HomeHero from "../components/HomeHero";
import LastMatchSummary from "../components/LastMatchSummary";
import RecentMatches from "../components/RecentMatches";
import UrgencyBanner from "../components/UrgencyBanner";
import UserTypeGrid from "../components/UserTypeGrid";
import { getAuthToken } from "../lib/authStorage";
import { fetchHomeData } from "../lib/homeApi";
import { fetchSavedProfile } from "../lib/onboardApi";
import { getProfileDraft, getProfileDraftStorageMode, hasProfileDraft } from "../lib/profileDraft";

function formatCachedDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function HomePage() {
  const navigate = useNavigate();
  const authToken = getAuthToken();
  const localDraft = getProfileDraft();
  const [language, setLanguage] = useState("en");
  const [hasProfile, setHasProfile] = useState(() => hasProfileDraft());
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const cachedDateLabel = useMemo(() => formatCachedDate(new Date("2026-03-25")), []);
  const draftStorageMode = getProfileDraftStorageMode();

  const homeQuery = useQuery({
    queryKey: ["home-data"],
    queryFn: fetchHomeData,
  });

  const savedProfileQuery = useQuery({
    queryKey: ["home-saved-profile"],
    queryFn: fetchSavedProfile,
    enabled: Boolean(authToken),
  });

  const hasSyncedProfile = Boolean(savedProfileQuery.data);
  const hasDeviceDraft = Boolean(localDraft);
  const shouldShowSavedProfile = hasSyncedProfile || hasDeviceDraft;
  const savedProfileLabel = hasSyncedProfile
    ? "Saved profile"
    : draftStorageMode === "draft_only"
      ? "Saved on device"
      : "Saved profile";

  useEffect(() => {
    if (shouldShowSavedProfile) {
      setHasProfile(true);
    }
  }, [shouldShowSavedProfile]);

  return (
    <main className="app-shell">
      <div className="home-page">
        <HomeHero
          language={language}
          onLanguageChange={setLanguage}
          hasProfile={hasProfile && shouldShowSavedProfile}
          onProfileModeChange={setHasProfile}
          savedProfileLabel={savedProfileLabel}
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
              {"\u00d7"}
            </button>
          </div>
        ) : null}

        {hasProfile ? (
          <LastMatchSummary
            impact={homeQuery.data?.impact}
            health={homeQuery.data?.health}
            isLoading={homeQuery.isLoading}
            error={homeQuery.error}
            onExplore={() => navigate("/results")}
          />
        ) : (
          <UserTypeGrid />
        )}

        <UrgencyBanner text="Deadline in 3 days - apply soon" />

        <RecentMatches
          schemes={homeQuery.data?.recentMatches || []}
          isLoading={homeQuery.isLoading}
          error={homeQuery.error}
        />
      </div>

      <BottomNav active="home" />
    </main>
  );
}
