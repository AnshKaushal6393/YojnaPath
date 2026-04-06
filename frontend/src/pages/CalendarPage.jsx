import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import BottomNav from "../components/BottomNav";
import DeadlineCalendar from "../components/DeadlineCalendar";
import EmptyState from "../components/EmptyState";
import SubscribeButton from "../components/SubscribeButton";
import {
  getNotificationSupport,
  requestNotificationPermission,
} from "../lib/browserNotifications";
import { downloadCalendarBundle } from "../lib/calendar";
import { fetchTrackedApplications } from "../lib/trackerApi";

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

export default function CalendarPage() {
  const { t } = useTranslation();
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationSupport() ? Notification.permission : "unsupported"
  );

  const trackerQuery = useQuery({
    queryKey: ["tracked-applications"],
    queryFn: fetchTrackedApplications,
  });

  const reminderGroups = useMemo(
    () => groupApplicationsByReminder(trackerQuery.data || []),
    [trackerQuery.data]
  );

  const totalReminders = reminderGroups.reduce((sum, group) => sum + group.items.length, 0);

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
          <div className="calendar-summary__chip calendar-summary__chip--info">
            <span className="type-micro">{t("calendar.browserAlerts")}</span>
            <strong>{notificationPermission === "granted" ? t("calendar.on") : t("calendar.off")}</strong>
          </div>
        </section>

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
            <DeadlineCalendar groups={reminderGroups} />
          </section>
        ) : null}
      </div>

      <BottomNav active="calendar" />
    </main>
  );
}
