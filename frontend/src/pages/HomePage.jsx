import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import CategoryHighlights from "../components/CategoryHighlights";
import FamilyProfilesPanel from "../components/FamilyProfilesPanel";
import HomeHero from "../components/HomeHero";
import LastMatchSummary from "../components/LastMatchSummary";
import RecentMatches from "../components/RecentMatches";
import UrgencyBanner from "../components/UrgencyBanner";
import UserTypeGrid from "../components/UserTypeGrid";
import { hasStoredAppLanguage, setAppLanguage, syncAppLanguage } from "../i18n/language";
import { setActiveProfileId } from "../lib/activeProfile";
import { getAuthToken } from "../lib/authStorage";
import { fetchHomeData } from "../lib/homeApi";
import { fetchProfileMembers, fetchSavedProfile } from "../lib/onboardApi";
import {
  getProfileDraft,
  getProfileDraftStorageMode,
  hasProfileDraft,
} from "../lib/profileDraft";
import { fetchCurrentUser } from "../lib/registrationApi";

function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatCachedDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function buildUrgencyText(urgentSchemes, t) {
  const [firstScheme] = urgentSchemes || [];

  if (!firstScheme) {
    return "";
  }

  const schemeName = firstScheme.schemeName || t("home.urgency.fallbackScheme");
  const daysRemaining = Number(firstScheme.daysRemaining);

  if (Number.isFinite(daysRemaining) && daysRemaining <= 0) {
    return t("home.urgency.closesToday", { scheme: schemeName });
  }

  if (Number.isFinite(daysRemaining) && daysRemaining === 1) {
    return t("home.urgency.closesTomorrow", { scheme: schemeName });
  }

  if (Number.isFinite(daysRemaining)) {
    return t("home.urgency.closesInDays", { scheme: schemeName, days: daysRemaining });
  }

  return t("home.urgency.attentionSoon", { scheme: schemeName });
}

export default function HomePage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authToken = getAuthToken();
  const localDraft = getProfileDraft();
  const [language, setLanguage] = useState(i18n.resolvedLanguage || "en");
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

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: Boolean(authToken),
  });

  const profileMembersQuery = useQuery({
    queryKey: ["profile-members"],
    queryFn: fetchProfileMembers,
    enabled: Boolean(authToken),
  });

  const hasSyncedProfile = Boolean(savedProfileQuery.data);
  const hasDeviceDraft = Boolean(localDraft);
  const shouldShowSavedProfile = hasSyncedProfile || hasDeviceDraft;
  const urgentSchemes = homeQuery.data?.urgent || [];
  const urgencyText = buildUrgencyText(urgentSchemes, t);
  const activeProfileName = savedProfileQuery.data?.profileName || localDraft?.profileName || "";

  const accountOwnerHasProfile = useMemo(() => {
    const ownerName = normalizeComparisonName(currentUserQuery.data?.name);
    if (!ownerName) {
      return false;
    }

    return (profileMembersQuery.data || []).some(
      (member) => normalizeComparisonName(member.profileName) === ownerName
    );
  }, [currentUserQuery.data?.name, profileMembersQuery.data]);

  const accountOwnerProfileId = useMemo(() => {
    const ownerName = normalizeComparisonName(currentUserQuery.data?.name);
    if (!ownerName) {
      return "";
    }

    return (
      (profileMembersQuery.data || []).find(
        (member) => normalizeComparisonName(member.profileName) === ownerName
      )?.id || ""
    );
  }, [currentUserQuery.data?.name, profileMembersQuery.data]);

  const savedProfileLabel = hasSyncedProfile
    ? activeProfileName
      ? t("home.mode.ownerProfile", { name: activeProfileName })
      : t("home.mode.savedProfile")
    : draftStorageMode === "draft_only"
      ? activeProfileName
        ? t("home.mode.onDevice", { name: activeProfileName })
        : t("home.mode.savedProfile")
      : t("home.mode.savedProfile");

  useEffect(() => {
    if (shouldShowSavedProfile) {
      setHasProfile(true);
    }
  }, [shouldShowSavedProfile]);

  useEffect(() => {
    setLanguage(i18n.resolvedLanguage || "en");
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    if (hasStoredAppLanguage()) {
      return;
    }

    syncAppLanguage({
      explicitLang: currentUserQuery.data?.lang || "",
      state: savedProfileQuery.data?.formState?.state || "",
      fallback: "en",
    });
  }, [currentUserQuery.data?.lang, savedProfileQuery.data?.formState?.state]);

  function handleCategorySelect(categoryKey) {
    if (hasProfile && shouldShowSavedProfile) {
      navigate(`/results?category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    navigate("/onboard");
  }

  function handleProfileSwitch(member) {
    if (!member?.id) {
      return;
    }

    setActiveProfileId(member.id);
    queryClient.cancelQueries({ queryKey: ["home-data"] });
    queryClient.cancelQueries({ queryKey: ["home-saved-profile"] });
    queryClient.invalidateQueries({ queryKey: ["home-saved-profile"] });
    queryClient.invalidateQueries({ queryKey: ["home-data"] });
  }

  async function handleLanguageChange(nextLanguage) {
    if (nextLanguage === language) {
      return;
    }

    const applied = await setAppLanguage(nextLanguage);
    setLanguage(applied);
  }

  return (
    <main className="app-shell">
      <div className="home-page">
        <HomeHero
          language={language}
          onLanguageChange={handleLanguageChange}
          hasProfile={hasProfile && shouldShowSavedProfile}
          onProfileModeChange={setHasProfile}
          savedProfileLabel={savedProfileLabel}
          schemeCount={
            homeQuery.data?.health?.schemeCount || homeQuery.data?.impact?.schemesInDatabase || 0
          }
        />

        <div className="home-public-links">
          <button
            type="button"
            className="home-link-card"
            onClick={() => navigate("/profile")}
          >
            <span className="home-link-card__eyebrow">
              {t("home.links.profileEyebrow", { defaultValue: "Your details" })}
            </span>
            <span className="home-link-card__title">
              {t("home.links.profile", { defaultValue: "Manage profile" })}
            </span>
            <span className="home-link-card__body">
              {t("home.links.profileBody", {
                defaultValue:
                  "Update your photo, family members, and saved details for better matching.",
              })}
            </span>
          </button>
          <button
            type="button"
            className="home-link-card"
            onClick={() => navigate("/kiosk")}
          >
            <span className="home-link-card__eyebrow">{t("home.links.kioskEyebrow")}</span>
            <span className="home-link-card__title">{t("home.links.kiosk")}</span>
            <span className="home-link-card__body">{t("home.links.kioskBody")}</span>
          </button>
        </div>

        {!offlineBannerDismissed && homeQuery.isError ? (
          <div className="offline-banner state-info" role="status" aria-live="polite">
            <span className="type-caption">{t("home.offline.banner", { date: cachedDateLabel })}</span>
            <button
              type="button"
              className="offline-banner__dismiss icon-hitbox"
              onClick={() => setOfflineBannerDismissed(true)}
              aria-label={t("home.offline.dismiss")}
            >
              {"\u00d7"}
            </button>
          </div>
        ) : null}

        {hasProfile && (profileMembersQuery.data?.length || 0) > 1 ? (
          <FamilyProfilesPanel
            members={profileMembersQuery.data || []}
            activeProfileId={savedProfileQuery.data?.id || ""}
            onSelect={handleProfileSwitch}
          onCreateNew={() => navigate("/profile")}
          onCreateOwnerProfile={() => navigate("/profile")}
          accountOwnerName={currentUserQuery.data?.name || ""}
          accountOwnerHasProfile={accountOwnerHasProfile}
          accountOwnerProfileId={accountOwnerProfileId}
        />
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
