import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePwaInstallPrompt } from "../hooks/usePwaInstallPrompt";

export default function InstallAppButton({ buttonClassName = "", hintClassName = "" }) {
  const { t } = useTranslation();
  const { canInstall, installApp, isInstalled, showIosInstructions } = usePwaInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  if (isInstalled) {
    return (
      <span className={`install-app-badge ${buttonClassName}`.trim()}>
        {t("common.buttons.appInstalled")}
      </span>
    );
  }

  if (!canInstall && !showIosInstructions) {
    return null;
  }

  return (
    <div className="install-app">
      {canInstall ? (
        <button type="button" className={buttonClassName} onClick={installApp}>
          {t("common.buttons.downloadApp")}
        </button>
      ) : (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => setShowHelp((current) => !current)}
        >
          {t("common.buttons.howToInstall")}
        </button>
      )}
      {(showHelp || canInstall) ? (
        <p className={`install-app__hint ${hintClassName}`.trim()}>
          {canInstall ? t("common.pwa.installHint") : t("common.pwa.iosHint")}
        </p>
      ) : null}
    </div>
  );
}
