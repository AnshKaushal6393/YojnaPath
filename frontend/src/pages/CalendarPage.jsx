import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import BottomNav from "../components/BottomNav";
import DeadlineCalendar from "../components/DeadlineCalendar";
import EmptyState from "../components/EmptyState";
import FilterPills from "../components/FilterPills";
import ScholarshipCalendar from "../components/ScholarshipCalendar";
import SubscribeButton from "../components/SubscribeButton";
import { apiGet } from "../lib/api";
import {
  getNotificationSupport,
  requestNotificationPermission,
} from "../lib/browserNotifications";
import { downloadCalendarBundle } from "../lib/calendar";
import { fetchSavedProfile } from "../lib/onboardApi";
import { hasDevanagariText, isMeaningfullyDifferent, isSchemeVisibleNow, normalizeText } from "../lib/schemeText";
import { fetchSavedSchemes, saveScheme } from "../lib/savedApi";
import { fetchTrackedApplications } from "../lib/trackerApi";

const SCHOLARSHIPS_PER_PAGE = 12;

function groupApplicationsByReminder(applications) {
  const grouped = new Map();

  applications
    .filter((application) => application.remindAt)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
    .forEach((application) => {
      const current = grouped.get(application.remindAt) || [];
      current.push(application);
      grouped.set(application.remindAt, current);
    });

  return [...grouped.entries()].map(([date, items]) => ({ date, items }));
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getScholarshipStatus(closesAt) {
  if (!closesAt) {
    return "always_open";
  }

  const now = new Date();
  const close = new Date(closesAt);

  if (Number.isNaN(close.getTime())) {
    return "always_open";
  }

  const daysLeft = Math.ceil((close.getTime() - now.getTime()) / 86400000);

  if (daysLeft < 0) {
    return "closed";
  }

  if (daysLeft <= 7) {
    return "urgent";
  }

  if (daysLeft <= 30) {
    return "closing_soon";
  }

  return "open";
}

function buildScholarshipGroups(schemes, profile) {
  const profileState = String(profile?.formState?.state || "").toUpperCase();

  const scholarshipItems = (schemes || [])
    .filter((scheme) => isSchemeVisibleNow(scheme))
    .filter((scheme) => (scheme.categories || []).includes("education"))
    .filter((scheme) => {
      if (!profileState || profileState === "CENTRAL") {
        return true;
      }

      const scope = String(scheme.state || "").toUpperCase();
      return scope === "CENTRAL" || scope === profileState;
    })
    .map((scheme) => {
      const closesAt = scheme.effectiveDeadline?.closes || scheme.deadline?.closes || "";
      const schemeName = normalizeText(scheme.name?.en, "Scheme");
      const schemeNameHi = normalizeText(scheme.name?.hi, "");
      const category = String(scheme.categories?.[0] || "education").toLowerCase();
      const scope = String(scheme.state || "central").toLowerCase();

      return {
        key: `${scheme.schemeId}:${closesAt || "always-open"}`,
        schemeId: scheme.schemeId,
        schemeName,
        schemeNameHi:
          hasDevanagariText(schemeNameHi) && isMeaningfullyDifferent(schemeNameHi, schemeName)
            ? schemeNameHi
            : "",
        closesAt,
        closesAtLabel: formatDateLabel(closesAt),
        status: getScholarshipStatus(closesAt),
        category,
        scope,
        scopeLabel: scope === "central" ? "CENTRAL" : String(scheme.state || ""),
      };
    })
    .sort((a, b) => {
      if (!a.closesAt && !b.closesAt) {
        return a.schemeName.localeCompare(b.schemeName);
      }

      if (!a.closesAt) {
        return 1;
      }

      if (!b.closesAt) {
        return -1;
      }

      return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
    });

  const grouped = new Map();

  scholarshipItems.forEach((item) => {
    const key = item.closesAt ? item.closesAt.slice(0, 10) : "always-open";
    const current = grouped.get(key) || [];
    current.push(item);
    grouped.set(key, current);
  });

  return [...grouped.entries()].map(([key, items]) => ({
    key,
    date: key === "always-open" ? "" : key,
    items,
  }));
}

function toSentenceCase(value) {
  return String(value ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildFilterItems(activeValue, values, allLabel) {
  const items = [
    {
      value: "all",
      label: allLabel,
      active: activeValue === "all",
    },
  ];

  values.forEach((value) => {
    items.push({
      value,
      label: value === "central" ? "Central" : toSentenceCase(value),
      active: activeValue === value,
      className: value !== "central" ? `category-${value}` : "",
    });
  });

  return items;
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationSupport() ? Notification.permission : "unsupported"
  );
  const [scholarshipPage, setScholarshipPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const trackerQuery = useQuery({
    queryKey: ["tracked-applications"],
    queryFn: fetchTrackedApplications,
  });
  const profileQuery = useQuery({
    queryKey: ["saved-profile", "calendar"],
    queryFn: fetchSavedProfile,
  });
  const scholarshipQuery = useQuery({
    queryKey: ["calendar-scholarships"],
    queryFn: () => apiGet("/api/schemes/all"),
  });
  const savedSchemesQuery = useQuery({
    queryKey: ["saved-schemes", "calendar"],
    queryFn: fetchSavedSchemes,
  });
  const saveSchemeMutation = useMutation({
    mutationFn: saveScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-schemes"] });
      queryClient.invalidateQueries({ queryKey: ["saved-schemes", "calendar"] });
    },
  });

  const reminderGroups = useMemo(
    () => groupApplicationsByReminder(trackerQuery.data || []),
    [trackerQuery.data]
  );
  const scholarshipGroups = useMemo(
    () => buildScholarshipGroups(scholarshipQuery.data || [], profileQuery.data),
    [scholarshipQuery.data, profileQuery.data]
  );
  const scholarshipItems = useMemo(
    () => scholarshipGroups.flatMap((group) => group.items),
    [scholarshipGroups]
  );
  const categoryValues = useMemo(
    () =>
      [...new Set(scholarshipItems.map((item) => String(item.category || "").toLowerCase()).filter(Boolean))].sort(),
    [scholarshipItems]
  );
  const scopeValues = useMemo(
    () =>
      [...new Set(scholarshipItems.map((item) => String(item.scope || "").toLowerCase()).filter(Boolean))].sort(),
    [scholarshipItems]
  );
  const filteredScholarshipItems = useMemo(
    () =>
      scholarshipItems.filter((item) => {
        const categoryPass = categoryFilter === "all" || item.category === categoryFilter;
        const scopePass = scopeFilter === "all" || item.scope === scopeFilter;
        return categoryPass && scopePass;
      }),
    [categoryFilter, scholarshipItems, scopeFilter]
  );
  const paginatedScholarshipGroups = useMemo(() => {
    const startIndex = (scholarshipPage - 1) * SCHOLARSHIPS_PER_PAGE;
    const pageItems = filteredScholarshipItems.slice(startIndex, startIndex + SCHOLARSHIPS_PER_PAGE);
    const grouped = new Map();

    pageItems.forEach((item) => {
      const key = item.closesAt ? item.closesAt.slice(0, 10) : "always-open";
      const current = grouped.get(key) || [];
      current.push(item);
      grouped.set(key, current);
    });

    return [...grouped.entries()].map(([key, items]) => ({
      key,
      date: key === "always-open" ? "" : key,
      items,
    }));
  }, [filteredScholarshipItems, scholarshipPage]);

  const totalReminders = reminderGroups.reduce((sum, group) => sum + group.items.length, 0);
  const totalScholarships = filteredScholarshipItems.length;
  const urgentScholarships = filteredScholarshipItems.reduce(
    (sum, item) =>
      sum + (item.status === "urgent" || item.status === "closing_soon" ? 1 : 0),
    0
  );
  const scholarshipPages = Math.max(1, Math.ceil(totalScholarships / SCHOLARSHIPS_PER_PAGE));
  const savedSchemeIds = useMemo(
    () => new Set((savedSchemesQuery.data || []).map((scheme) => scheme.id)),
    [savedSchemesQuery.data]
  );
  const categoryFilterItems = useMemo(
    () => buildFilterItems(categoryFilter, categoryValues, t("calendar.allCategories")),
    [categoryFilter, categoryValues, t]
  );
  const scopeFilterItems = useMemo(
    () => buildFilterItems(scopeFilter, scopeValues, t("calendar.allScopes")),
    [scopeFilter, scopeValues, t]
  );

  useEffect(() => {
    if (scholarshipPage > scholarshipPages) {
      setScholarshipPage(1);
    }
  }, [scholarshipPage, scholarshipPages]);

  useEffect(() => {
    setScholarshipPage(1);
  }, [categoryFilter, scopeFilter]);

  return (
    <main className="app-shell">
      <div className="calendar-page">
        <section className="calendar-header">
          <div className="matching-hero-shape matching-hero-shape--one" aria-hidden="true" />
          <div className="matching-hero-shape matching-hero-shape--two" aria-hidden="true" />

          <div className="section-heading">
            <p className="eyebrow">{t("calendar.eyebrow")}</p>
            <h1 className="type-h1">{t("calendar.title")}</h1>
            <p className="type-body-en">{t("calendar.subtitle")}</p>
          </div>

          <div className="calendar-header__actions">
            {getNotificationSupport() ? (
              <SubscribeButton
                permission={notificationPermission}
                onEnable={async () => {
                  const permission = await requestNotificationPermission();
                  setNotificationPermission(permission);
                }}
              />
            ) : null}

            <button
              type="button"
              className="detail-card__secondary-button"
              disabled={totalReminders === 0}
              onClick={() =>
                downloadCalendarBundle(
                  (trackerQuery.data || [])
                    .filter((item) => item.remindAt)
                    .map((item) => ({
                      title: `${item.schemeName} reminder`,
                      date: item.remindAt,
                      details: t("tracker.calendarDetails", { scheme: item.schemeName }),
                    }))
                )
              }
            >
              {t("common.buttons.exportAll")}
            </button>
          </div>
        </section>

        <section className="calendar-summary">
          <div className="calendar-summary__chip calendar-summary__chip--count">
            <span className="type-micro">{t("calendar.scheduled")}</span>
            <strong>{totalReminders}</strong>
          </div>
          <div className="calendar-summary__chip calendar-summary__chip--count">
            <span className="type-micro">{t("calendar.scholarships")}</span>
            <strong>{totalScholarships}</strong>
          </div>
          <div className="calendar-summary__chip calendar-summary__chip--info">
            <span className="type-micro">{t("calendar.browserAlerts")}</span>
            <strong>{notificationPermission === "granted" ? t("calendar.on") : t("calendar.off")}</strong>
          </div>
          <div className="calendar-summary__chip calendar-summary__chip--info">
            <span className="type-micro">{t("calendar.closingSoon")}</span>
            <strong>{urgentScholarships}</strong>
          </div>
        </section>

        {scholarshipQuery.isLoading ? (
          <section className="calendar-panel">
            <p className="type-h2">{t("calendar.scholarshipLoadingTitle")}</p>
            <p className="type-caption">{t("calendar.scholarshipLoadingBody")}</p>
          </section>
        ) : null}

        {scholarshipQuery.error ? (
          <section className="calendar-panel">
            <p className="type-h2">{t("calendar.scholarshipErrorTitle")}</p>
            <p className="type-caption">{scholarshipQuery.error.message}</p>
          </section>
        ) : null}

        {!scholarshipQuery.isLoading && !scholarshipQuery.error && totalScholarships > 0 ? (
          <section className="calendar-panel">
            <div className="section-heading">
              <p className="eyebrow">{t("calendar.scholarshipEyebrow")}</p>
              <h2 className="type-h2">{t("calendar.scholarshipTitle")}</h2>
              <p className="type-caption">{t("calendar.scholarshipSubtitle")}</p>
            </div>
            <div className="results-filters-card">
              <div className="results-filters-card__header">
                <p className="type-label">{t("calendar.filterByCategory")}</p>
                <span className="type-caption">{t("calendar.showingCount", { count: totalScholarships })}</span>
              </div>
              <FilterPills
                items={categoryFilterItems}
                onSelect={setCategoryFilter}
                ariaLabel={t("calendar.filterByCategory")}
              />
              <div className="results-filters-card__header">
                <p className="type-label">{t("calendar.filterByScope")}</p>
                <span className="type-caption">{t("calendar.activeScope", { scope: scopeFilter === "all" ? t("calendar.allScopes") : (scopeFilter === "central" ? "Central" : toSentenceCase(scopeFilter)) })}</span>
              </div>
              <FilterPills
                items={scopeFilterItems}
                onSelect={setScopeFilter}
                ariaLabel={t("calendar.filterByScope")}
              />
            </div>
            <ScholarshipCalendar
              groups={paginatedScholarshipGroups}
              onSaveScheme={(schemeId) => saveSchemeMutation.mutate(schemeId)}
              savingSchemeId={saveSchemeMutation.variables || ""}
              savedSchemeIds={savedSchemeIds}
            />
            {totalScholarships > SCHOLARSHIPS_PER_PAGE ? (
              <div className="results-pagination" aria-label="Scholarship pagination">
                <button
                  type="button"
                  className="results-page-button"
                  disabled={scholarshipPage === 1}
                  onClick={() => setScholarshipPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <span className="type-caption">
                  Page {scholarshipPage} of {scholarshipPages}
                </span>
                <button
                  type="button"
                  className="results-page-button"
                  disabled={scholarshipPage === scholarshipPages}
                  onClick={() => setScholarshipPage((page) => Math.min(scholarshipPages, page + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {trackerQuery.isLoading ? (
          <section className="calendar-panel">
            <p className="type-h2">{t("calendar.loadingTitle")}</p>
            <p className="type-caption">{t("calendar.loadingBody")}</p>
          </section>
        ) : null}

        {trackerQuery.error ? (
          <section className="calendar-panel">
            <p className="type-h2">{t("calendar.errorTitle")}</p>
            <p className="type-caption">{trackerQuery.error.message}</p>
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && totalReminders === 0 ? (
          <section className="calendar-panel">
            <EmptyState
              title={t("calendar.emptyTitle")}
              titleHi={t("calendar.emptyTitleHi")}
              description={t("calendar.emptyDescription")}
              tips={t("calendar.emptyTips", { returnObjects: true })}
            />
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && totalReminders > 0 ? (
          <section className="calendar-panel">
            <div className="section-heading">
              <p className="eyebrow">{t("calendar.remindersEyebrow")}</p>
              <h2 className="type-h2">{t("calendar.remindersTitle")}</h2>
              <p className="type-caption">{t("calendar.remindersSubtitle")}</p>
            </div>
            <DeadlineCalendar groups={reminderGroups} />
          </section>
        ) : null}
      </div>

      <BottomNav active="calendar" />
    </main>
  );
}
