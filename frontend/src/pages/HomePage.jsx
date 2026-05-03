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
import { getActiveProfileId, setActiveProfileId } from "../lib/activeProfile";
import { getAuthToken } from "../lib/authStorage";
import { findOwnerProfile } from "../lib/profileOwnership";
import { fetchHomeData } from "../lib/homeApi";
import { fetchProfileMembers, fetchSavedProfile, isProfileReadyForMatching } from "../lib/onboardApi";
import {
  getProfileDraft,
  getProfileDraftStorageMode,
} from "../lib/profileDraft";
import { fetchCurrentUser } from "../lib/registrationApi";

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
  const [activeProfileId, setActiveProfileIdState] = useState(() => getActiveProfileId());
  const [visualActiveProfileId, setVisualActiveProfileId] = useState(() => getActiveProfileId());
  const localDraft = getProfileDraft(activeProfileId);
  const [language, setLanguage] = useState(i18n.resolvedLanguage || "en");
  const [hasProfile, setHasProfile] = useState(() =>
    isProfileReadyForMatching(getProfileDraft(activeProfileId))
  );
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [pendingSwitchName, setPendingSwitchName] = useState("");
  const [switchNotice, setSwitchNotice] = useState("");
  const draftStorageMode = getProfileDraftStorageMode(activeProfileId);

  const homeQuery = useQuery({
    queryKey: ["home-data", activeProfileId],
    queryFn: () => fetchHomeData(activeProfileId),
  });

  const savedProfileQuery = useQuery({
    queryKey: ["home-saved-profile", activeProfileId],
    queryFn: () => fetchSavedProfile(activeProfileId),
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

  const hasSyncedProfile = isProfileReadyForMatching(savedProfileQuery.data);
  const hasDeviceDraft = isProfileReadyForMatching(localDraft);
  const shouldShowSavedProfile = hasSyncedProfile || hasDeviceDraft;
  const hasReadyProfile = hasProfile && shouldShowSavedProfile;
  const displayedProfileId = savedProfileQuery.data?.id || localDraft?.id || activeProfileId;
  const urgentSchemes = homeQuery.data?.urgent || [];
  const urgencyText = buildUrgencyText(urgentSchemes, t);
  const cachedDateLabel = useMemo(() => {
    const sourceTimestamp = homeQuery.dataUpdatedAt || Date.now();
    return formatCachedDate(new Date(sourceTimestamp));
  }, [homeQuery.dataUpdatedAt]);
  const activeProfileName = savedProfileQuery.data?.profileName || localDraft?.profileName || "";
  const activeProfilePhotoUrl =
    savedProfileQuery.data?.displayPhotoUrl || savedProfileQuery.data?.photoUrl || "";
  const isSwitchingProfile =
    Boolean(pendingSwitchName) || savedProfileQuery.isFetching || homeQuery.isFetching;

  useEffect(() => {
    const storedProfileId = getActiveProfileId();
    if (storedProfileId !== activeProfileId) {
      setActiveProfileIdState(storedProfileId);
    }
  }, [activeProfileId, profileMembersQuery.data]);

  useEffect(() => {
    if (displayedProfileId && displayedProfileId !== visualActiveProfileId) {
      setVisualActiveProfileId(displayedProfileId);
    }
  }, [displayedProfileId, visualActiveProfileId]);

  const ownerProfile = useMemo(
    () => findOwnerProfile(profileMembersQuery.data || [], currentUserQuery.data?.name || ""),
    [currentUserQuery.data?.name, profileMembersQuery.data]
  );
  const accountOwnerHasProfile = Boolean(ownerProfile);
  const accountOwnerProfileId = ownerProfile?.id || "";

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
      return;
    }

    setHasProfile(false);
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

  useEffect(() => {
    if (!pendingSwitchName) {
      return;
    }

    if (savedProfileQuery.data?.profileName !== pendingSwitchName) {
      return;
    }

    setPendingSwitchName("");
    setSwitchNotice(`Now viewing schemes for ${pendingSwitchName}.`);
    const timeoutId = window.setTimeout(() => setSwitchNotice(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [pendingSwitchName, savedProfileQuery.data?.profileName]);

  function handleCategorySelect(categoryKey) {
    if (hasReadyProfile) {
      navigate(`/results?category=${encodeURIComponent(categoryKey)}`);
      return;
    }

    navigate("/onboard");
  }

  function handleProfileSwitch(member) {
    if (!member?.id) {
      return;
    }

    setPendingSwitchName(member.profileName || "this profile");
    setSwitchNotice("");
    setActiveProfileId(member.id);
    setActiveProfileIdState(member.id);
    setVisualActiveProfileId(member.id);
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
          hasProfile={hasReadyProfile}
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

        {hasReadyProfile && (profileMembersQuery.data?.length || 0) > 1 ? (
          <FamilyProfilesPanel
            members={profileMembersQuery.data || []}
            activeProfileId={visualActiveProfileId}
            onSelect={handleProfileSwitch}
          onCreateNew={() => navigate("/profile")}
          onCreateOwnerProfile={() => navigate("/profile")}
          accountOwnerName={currentUserQuery.data?.name || ""}
          accountOwnerHasProfile={accountOwnerHasProfile}
          accountOwnerProfileId={accountOwnerProfileId}
        />
      ) : null}

        {hasReadyProfile && activeProfileName ? (
          <div
            className={`onboard-feedback ${isSwitchingProfile ? "state-info" : "state-success"}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {activeProfilePhotoUrl ? (
                <img
                  src={activeProfilePhotoUrl}
                  alt={activeProfileName}
                  width="40"
                  height="40"
                  className="h-10 w-10 rounded-full border border-white/60 object-cover"
                />
              ) : null}
              <span className="type-caption">
                {isSwitchingProfile
                  ? `Switching to ${pendingSwitchName || activeProfileName}. Updating scheme results...`
                  : `Showing scheme results for ${activeProfileName}.`}
              </span>
            </div>
          </div>
        ) : null}

        {switchNotice ? (
          <div className="onboard-feedback state-success" role="status" aria-live="polite">
            <span className="type-caption">{switchNotice}</span>
          </div>
        ) : null}

        <CategoryHighlights
          items={homeQuery.data?.categoryHighlights || []}
          onSelect={handleCategorySelect}
        />

        {hasReadyProfile ? (
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

        {hasReadyProfile && urgencyText ? (
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
