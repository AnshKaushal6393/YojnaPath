import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
            <p className="eyebrow">Tracker</p>
            <h1 className="type-h1">Applied schemes timeline</h1>
            <p className="type-body-en">
              Track application progress, update statuses, and keep free browser and calendar
              reminders on for schemes you do not want to miss.
            </p>
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
                ? "Browser notifications enabled"
                : "Enable browser notifications"}
            </button>
          ) : null}
        </section>

        {trackerQuery.isLoading ? (
          <section className="tracker-panel">
            <p className="type-h2">Loading tracked applications...</p>
            <p className="type-caption">Fetching your timeline from the backend.</p>
          </section>
        ) : null}

        {trackerQuery.error ? (
          <section className="tracker-panel">
            <p className="type-h2">Could not load tracker</p>
            <p className="type-caption">{trackerQuery.error.message}</p>
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && applications.length === 0 ? (
          <section className="tracker-panel">
            <EmptyState
              title="No tracked schemes yet"
              titleHi="अभी कोई ट्रैक की गई योजना नहीं है"
              description="Mark a scheme as applied from the detail page to start tracking its status."
              tips={[
                "Open a useful scheme from results or saved.",
                "Tap Mark as applied once you submit the application.",
              ]}
            />
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && applications.length > 0 ? (
          <section className="tracker-panel">
            <ApplicationTimeline
              applications={applications}
              updatingSchemeId={updateMutation.isPending ? updateMutation.variables?.schemeId || "" : ""}
              onStatusChange={(schemeId, status) => updateMutation.mutate({ schemeId, payload: { status } })}
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
