import { useEffect, useState } from "react";
import { downloadCalendarFile, openGoogleCalendarEvent } from "../lib/calendar";
import StatusBadge from "./StatusBadge";
import ReminderToggle from "./ReminderToggle";

const STATUS_OPTIONS = ["applied", "pending", "approved", "rejected"];
const MIN_REMINDER_DATE = new Date().toISOString().slice(0, 10);

export default function ApplicationTimeline({
  applications,
  updatingSchemeId,
  onStatusChange,
  onToggleReminder,
  onSetReminderDate,
}) {
  const [draftDates, setDraftDates] = useState({});

  useEffect(() => {
    setDraftDates(
      Object.fromEntries(applications.map((application) => [application.schemeId, application.remindAt || ""]))
    );
  }, [applications]);

  return (
    <div className="application-timeline">
      {applications.map((application) => (
        <article key={application.schemeId} className="application-card">
          <div className="application-card__line" aria-hidden="true" />
          <div className="application-card__top">
            <div>
              <p className="type-caption">Applied on {application.appliedAtLabel}</p>
              <h2 className="type-h2">{application.schemeName}</h2>
              {application.schemeNameHi ? (
                <p className="type-caption hi" lang="hi">
                  {application.schemeNameHi}
                </p>
              ) : null}
            </div>
            <div className="scheme-card__benefit-chip">
              <p className="type-benefit">{application.benefitAmount}</p>
            </div>
          </div>

          <div className="application-card__status-row">
            <StatusBadge status={application.status} />
            <label
              htmlFor={`application-status-${application.schemeId}`}
              className="application-inline-label"
            >
              <span className="type-label">Application status</span>
            </label>
            <select
              id={`application-status-${application.schemeId}`}
              name={`application-status-${application.schemeId}`}
              className="application-status-select"
              value={application.status}
              onChange={(event) => onStatusChange(application.schemeId, event.target.value)}
              disabled={updatingSchemeId === application.schemeId}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <ReminderToggle
            enabled={application.reminderEnabled}
            isPending={updatingSchemeId === application.schemeId}
            onToggle={() => onToggleReminder(application)}
          />

          <div className="application-reminder-controls">
            <label className="application-reminder-controls__field">
              <span className="type-label" id={`reminder-date-label-${application.schemeId}`}>
                Reminder date
              </span>
              <input
                id={`reminder-date-${application.schemeId}`}
                name={`reminder-date-${application.schemeId}`}
                type="date"
                className="application-reminder-date"
                value={draftDates[application.schemeId] || ""}
                min={MIN_REMINDER_DATE}
                aria-labelledby={`reminder-date-label-${application.schemeId}`}
                onChange={(event) =>
                  setDraftDates((current) => ({
                    ...current,
                    [application.schemeId]: event.target.value,
                  }))
                }
                disabled={updatingSchemeId === application.schemeId}
              />
            </label>
            <button
              type="button"
              className="detail-card__secondary-button"
              onClick={() =>
                onSetReminderDate(application.schemeId, draftDates[application.schemeId] || "")
              }
              disabled={
                updatingSchemeId === application.schemeId || !(draftDates[application.schemeId] || "")
              }
            >
              Save reminder date
            </button>
          </div>

          <div className="application-card__meta">
            {application.hasPastReminder ? (
              <p className="type-caption" role="status">
                Previous reminder date has passed. Choose a new future date.
              </p>
            ) : application.reminderEnabled ? (
              <p className="type-caption">Reminder date: {application.remindAtLabel}</p>
            ) : (
              <p className="type-caption">No reminder scheduled</p>
            )}
            {application.notes ? <p className="type-caption">{application.notes}</p> : null}
          </div>

          <div className="application-card__actions">
            <button
              type="button"
              className="detail-card__secondary-button"
              onClick={() =>
                openGoogleCalendarEvent({
                  title: `${application.schemeName} reminder`,
                  date: application.remindAt || draftDates[application.schemeId],
                  details: `Reminder for ${application.schemeName} from YojnaPath.`,
                })
              }
              disabled={!(application.remindAt || draftDates[application.schemeId])}
            >
              Add to Google Calendar
            </button>
            <button
              type="button"
              className="detail-card__secondary-button"
              onClick={() =>
                downloadCalendarFile({
                  title: `${application.schemeName} reminder`,
                  date: application.remindAt || draftDates[application.schemeId],
                  details: `Reminder for ${application.schemeName} from YojnaPath.`,
                })
              }
              disabled={!(application.remindAt || draftDates[application.schemeId])}
            >
              Download calendar file
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
