import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
            <p className="eyebrow">Calendar</p>
            <h1 className="type-h1">Reminder calendar</h1>
            <p className="type-body-en">
              See all your scheduled reminder dates in one place, subscribe to free browser alerts,
              and export them to your personal calendar.
            </p>
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
                      details: `Reminder for ${item.schemeName} from YojnaPath.`,
                    }))
                )
              }
            >
              Export all reminders
            </button>
          </div>
        </section>

        <section className="calendar-summary">
          <div className="calendar-summary__chip calendar-summary__chip--count">
            <span className="type-micro">Scheduled</span>
            <strong>{totalReminders}</strong>
          </div>
          <div className="calendar-summary__chip calendar-summary__chip--info">
            <span className="type-micro">Browser alerts</span>
            <strong>
              {notificationPermission === "granted" ? "On" : "Off"}
            </strong>
          </div>
        </section>

        {trackerQuery.isLoading ? (
          <section className="calendar-panel">
            <p className="type-h2">Loading reminder calendar...</p>
            <p className="type-caption">Bringing your saved reminder dates from the tracker.</p>
          </section>
        ) : null}

        {trackerQuery.error ? (
          <section className="calendar-panel">
            <p className="type-h2">Could not load calendar</p>
            <p className="type-caption">{trackerQuery.error.message}</p>
          </section>
        ) : null}

        {!trackerQuery.isLoading && !trackerQuery.error && totalReminders === 0 ? (
          <section className="calendar-panel">
            <EmptyState
              title="No reminder dates yet"
              titleHi="अभी कोई रिमाइंडर तारीख नहीं है"
              description="Set a reminder date from tracker and it will appear here automatically."
              tips={[
                "Open Tracker and choose a future reminder date.",
                "Enable browser reminders here for free alerts.",
              ]}
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
