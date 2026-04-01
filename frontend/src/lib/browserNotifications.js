const NOTIFICATION_KEY_PREFIX = "yojnapath_notified_";

function dayDiffFromToday(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.round((parsed.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function getNotificationSupport() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!getNotificationSupport()) {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function notifyDueApplications(applications) {
  if (!getNotificationSupport() || Notification.permission !== "granted") {
    return;
  }

  applications.forEach((application) => {
    const diff = dayDiffFromToday(application.remindAt);
    if (diff == null || diff < 0 || diff > 1) {
      return;
    }

    const key = `${NOTIFICATION_KEY_PREFIX}${application.schemeId}_${application.remindAt}`;
    if (window.localStorage.getItem(key) === "sent") {
      return;
    }

    const when = diff === 0 ? "today" : "tomorrow";
    const notification = new Notification("YojnaPath reminder", {
      body: `${application.schemeName} needs your attention ${when}.`,
      tag: key,
    });
    notification.onclick = () => {
      window.focus();
    };
    window.localStorage.setItem(key, "sent");
  });
}
