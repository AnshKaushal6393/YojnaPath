import StatusBadge from "./StatusBadge";
import ReminderToggle from "./ReminderToggle";

const STATUS_OPTIONS = ["applied", "pending", "approved", "rejected"];

export default function ApplicationTimeline({
  applications,
  updatingSchemeId,
  onStatusChange,
  onToggleReminder,
}) {
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
            <select
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

          <div className="application-card__meta">
            {application.reminderEnabled ? (
              <p className="type-caption">Reminder date: {application.remindAtLabel}</p>
            ) : (
              <p className="type-caption">No reminder scheduled</p>
            )}
            {application.notes ? <p className="type-caption">{application.notes}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
