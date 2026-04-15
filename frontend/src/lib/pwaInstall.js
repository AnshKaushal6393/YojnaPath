let deferredInstallPrompt = null;

function isClient() {
  return typeof window !== "undefined";
}

export function isStandaloneMode() {
  if (!isClient()) {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIosDevice() {
  if (!isClient()) {
    return false;
  }

  const userAgent = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent);
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function setDeferredInstallPrompt(event) {
  deferredInstallPrompt = event;
}
