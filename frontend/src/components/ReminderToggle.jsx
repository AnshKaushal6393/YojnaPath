export default function ReminderToggle({ enabled, onToggle, isPending }) {
  return (
    <button
      type="button"
      className={`reminder-toggle ${enabled ? "is-on" : ""}`}
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={enabled}
    >
      <span className="reminder-toggle__track">
        <span className="reminder-toggle__thumb" />
      </span>
      <span className="type-label">
        {isPending ? "Updating..." : enabled ? "Reminder on" : "Reminder off"}
      </span>
    </button>
  );
}
