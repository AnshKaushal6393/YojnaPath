import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePwaInstallPrompt } from "../hooks/usePwaInstallPrompt";

export default function InstallAppButton({ buttonClassName = "", hintClassName = "" }) {
  const { t } = useTranslation();
  const { canInstall, installApp, installSupport, isInstalled, showIosInstructions } = usePwaInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const wasInstalledRef = useRef(isInstalled);

  useEffect(() => {
    if (!wasInstalledRef.current && isInstalled) {
      setShowToast(true);
      const timeoutId = window.setTimeout(() => setShowToast(false), 3200);
      return () => window.clearTimeout(timeoutId);
    }

    wasInstalledRef.current = isInstalled;
    return undefined;
  }, [isInstalled]);

  if (isInstalled) {
    return (
      <div className="install-app">
        <span className={`install-app-badge ${buttonClassName}`.trim()}>
          {t("common.buttons.appInstalled")}
        </span>
        {showToast ? (
          <div className="install-app__toast state-success" role="status" aria-live="polite">
            {t("common.pwa.installedToast")}
          </div>
        ) : null}
      </div>
    );
  }

  if (!canInstall && !showIosInstructions && !installSupport.showUnsupportedHint) {
    return null;
  }

  return (
    <div className="install-app">
      {canInstall ? (
        <button type="button" className={buttonClassName} onClick={installApp}>
          {t("common.buttons.downloadApp")}
        </button>
      ) : showIosInstructions ? (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => setShowHelp((current) => !current)}
        >
          {t("common.buttons.howToInstall")}
        </button>
      ) : null}
      {(showHelp || canInstall) ? (
        <p className={`install-app__hint ${hintClassName}`.trim()}>
          {canInstall ? t("common.pwa.installHint") : t("common.pwa.iosHint")}
        </p>
      ) : null}
      {installSupport.showUnsupportedHint ? (
        <p className={`install-app__hint ${hintClassName}`.trim()}>
          {t("common.pwa.unsupportedHint", { browser: installSupport.browserLabel || "this browser" })}
        </p>
      ) : null}
      {showToast ? (
        <div className="install-app__toast state-success" role="status" aria-live="polite">
          {t("common.pwa.installedToast")}
        </div>
      ) : null}
    </div>
  );
}
