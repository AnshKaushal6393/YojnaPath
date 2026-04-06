import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import BottomNav from "../components/BottomNav";
import ApplicationTimeline from "../components/ApplicationTimeline";
import EmptyState from "../components/EmptyState";
import {
  getNotificationSupport,
  notifyDueApplications,
  requestNotificationPermission,
} from "../lib/browserNotifications";
import { fetchTrackedApplications, updateTrackedApplication } from "../lib/trackerApi";

function addDays(value, days) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export default function TrackerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationSupport() ? Notification.permission : "unsupported"
  );
  const trackerQuery = useQuery({
    queryKey: ["tracked-applications"],
    queryFn: fetchTrackedApplications,
  });

  const updateMutation = useMutation({
    mutationFn: ({ schemeId, payload }) => updateTrackedApplication(schemeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-applications"] });
    },
  });

  const applications = trackerQuery.data || [];

  useEffect(() => {
    if (applications.length) {
      notifyDueApplications(applications);
    }
  }, [applications]);

  return (
    <main className="app-shell">
      <div className="tracker-page">
        <section className="tracker-header">
          <div className="section-heading">
            <p className="eyebrow">{t("tracker.eyebrow")}</p>
            <h1 className="type-h1">{t("tracker.title")}</h1>
            <p className="type-body-en">{t("tracker.subtitle")}</p>
          </div>
          {getNotificationSupport() ? (
            <button
              type="button"
              className="detail-card__secondary-button"
              onClick={async () => {
                const permission = await requestNotificationPermission();
                setNotificationPermission(permission);
              }}
              disabled={notificationPermission === "granted"}
            >
              {notificationPermission === "granted"
                ? t("common.buttons.browserNotificationsEnabled")
                : t("common.buttons.enableBrowserNotifications")}
            </button>
          ) : null}
        </section>

        {trackerQuery.isLoading ? (
          <section className="tracker-panel">
            <p className="type-h2">{t("tracker.loadingTitle")}</p>
            <p className="type-caption">{t("tracker.loadingBody")}</p>
          </section>
        ) : null}

        {trackerQuery.error ? (
          <section className="tracker-panel">
            <p className="type-h2">{t("tracker.errorTitle")}</p>
            <p className="type-caption">{trackerQuery.error.message}</p>
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && applications.length === 0 ? (
          <section className="tracker-panel">
            <EmptyState
              title={t("tracker.emptyTitle")}
              titleHi={t("tracker.emptyTitleHi")}
              description={t("tracker.emptyDescription")}
              tips={t("tracker.emptyTips", { returnObjects: true })}
            />
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && applications.length > 0 ? (
          <section className="tracker-panel">
            <ApplicationTimeline
              applications={applications}
              updatingSchemeId={
                updateMutation.isPending ? updateMutation.variables?.schemeId || "" : ""
              }
              onStatusChange={(schemeId, status) =>
                updateMutation.mutate({ schemeId, payload: { status } })
              }
              onToggleReminder={(application) =>
                updateMutation.mutate({
                  schemeId: application.schemeId,
                  payload: {
                    remindAt: application.reminderEnabled
                      ? null
                      : addDays(application.appliedAt || new Date().toISOString().slice(0, 10), 30),
                  },
                })
              }
              onSetReminderDate={(schemeId, remindAt) =>
                updateMutation.mutate({
                  schemeId,
                  payload: { remindAt },
                })
              }
            />
          </section>
        ) : null}
      </div>

      <BottomNav active="calendar" />
    </main>
  );
}
