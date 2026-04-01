import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import CategoryHighlights from "../components/CategoryHighlights";
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

function buildUrgencyText(urgentSchemes) {
  const [firstScheme] = urgentSchemes || [];

  if (!firstScheme) {
    return "";
  }

  const schemeName = firstScheme.schemeName || "A saved scheme";
  const daysRemaining = Number(firstScheme.daysRemaining);

  if (Number.isFinite(daysRemaining) && daysRemaining <= 0) {
    return `${schemeName} closes today`;
  }

  if (Number.isFinite(daysRemaining) && daysRemaining === 1) {
    return `${schemeName} closes tomorrow`;
  }

  if (Number.isFinite(daysRemaining)) {
    return `${schemeName} closes in ${daysRemaining} days`;
  }

  return `${schemeName} needs your attention soon`;
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
  const urgentSchemes = homeQuery.data?.urgent || [];
  const urgencyText = buildUrgencyText(urgentSchemes);
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

  function handleCategorySelect(categoryKey) {
    if (hasProfile && shouldShowSavedProfile) {
      navigate(`/results?category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    navigate("/onboard");
  }

  return (
    <main className="app-shell">
      <div className="home-page">
        <HomeHero
          language={language}
          onLanguageChange={setLanguage}
          hasProfile={hasProfile && shouldShowSavedProfile}
          onProfileModeChange={setHasProfile}
          savedProfileLabel={savedProfileLabel}
          schemeCount={homeQuery.data?.health?.schemeCount || homeQuery.data?.impact?.schemesInDatabase || 0}
        />

        <div className="home-public-links">
          <button
            type="button"
            className="detail-card__secondary-button"
            onClick={() => navigate("/impact")}
          >
            View public impact
          </button>
          <button
            type="button"
            className="detail-card__secondary-button"
            onClick={() => navigate("/kiosk")}
          >
            Kiosk mode
          </button>
        </div>

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

        <CategoryHighlights
          items={homeQuery.data?.categoryHighlights || []}
          onSelect={handleCategorySelect}
        />

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

        {hasProfile && shouldShowSavedProfile && urgencyText ? (
          <UrgencyBanner text={urgencyText} />
        ) : null}

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
