import { useEffect, useMemo, useState } from "react";
import {
  getDeferredInstallPrompt,
  getInstallSupportState,
  isIosDevice,
  isStandaloneMode,
  setDeferredInstallPrompt,
} from "../lib/pwaInstall";

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPromptState] = useState(() => getDeferredInstallPrompt());
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setDeferredPromptState(event);
    }

    function handleInstalled() {
      setDeferredInstallPrompt(null);
      setDeferredPromptState(null);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredInstallPrompt(null);
    setDeferredPromptState(null);
    return true;
  }

  return useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt) && !isInstalled,
      installApp,
      isInstalled,
      installSupport: getInstallSupportState(),
      showIosInstructions: isIosDevice() && !isInstalled,
    }),
    [deferredPrompt, isInstalled]
  );
}
