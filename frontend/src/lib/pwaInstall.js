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

export function getBrowserInfo() {
  if (!isClient()) {
    return {
      isAndroid: false,
      isChrome: false,
      isEdge: false,
      isFirefox: false,
      isSamsungInternet: false,
      isSafari: false,
    };
  }

  const userAgent = window.navigator.userAgent || "";
  const isAndroid = /Android/i.test(userAgent);
  const isEdge = /Edg\//.test(userAgent);
  const isFirefox = /Firefox\//.test(userAgent);
  const isSamsungInternet = /SamsungBrowser\//.test(userAgent);
  const isChrome = /Chrome\//.test(userAgent) && !isEdge && !isSamsungInternet;
  const isSafari = /Safari\//.test(userAgent) && !isChrome && !isEdge && !isFirefox;

  return {
    isAndroid,
    isChrome,
    isEdge,
    isFirefox,
    isSamsungInternet,
    isSafari,
  };
}

export function getInstallSupportState() {
  const browser = getBrowserInfo();
  const ios = isIosDevice();

  if (ios) {
    return {
      showUnsupportedHint: false,
      browserLabel: "",
    };
  }

  if (browser.isFirefox) {
    return {
      showUnsupportedHint: true,
      browserLabel: "Firefox",
    };
  }

  return {
    showUnsupportedHint: false,
    browserLabel: browser.isChrome
      ? "Chrome"
      : browser.isEdge
        ? "Edge"
        : browser.isSamsungInternet
          ? "Samsung Internet"
          : browser.isSafari
            ? "Safari"
            : "",
  };
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function setDeferredInstallPrompt(event) {
  deferredInstallPrompt = event;
}
