import { useTranslation } from "react-i18next";

export default function SubscribeButton({ permission, onEnable, disabled = false }) {
  const { t } = useTranslation();
  const isEnabled = permission === "granted";

  return (
    <button
      type="button"
      className={`subscribe-button ${isEnabled ? "subscribe-button--enabled" : ""}`}
      onClick={onEnable}
      disabled={disabled || isEnabled}
    >
      {isEnabled
        ? t("common.buttons.browserNotificationsEnabled")
        : t("common.buttons.enableBrowserNotifications")}
    </button>
  );
}
