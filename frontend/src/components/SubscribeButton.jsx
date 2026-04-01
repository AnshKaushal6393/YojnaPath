export default function SubscribeButton({ permission, onEnable, disabled = false }) {
  const isEnabled = permission === "granted";

  return (
    <button
      type="button"
      className={`subscribe-button ${isEnabled ? "subscribe-button--enabled" : ""}`}
      onClick={onEnable}
      disabled={disabled || isEnabled}
    >
      {isEnabled ? "Browser reminders enabled" : "Enable browser reminders"}
    </button>
  );
}
