import { useTranslation } from "react-i18next";

function getDaysUntil(dateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export default function SchemeCountdown({ date, variant = "" }) {
  const { t } = useTranslation();
  const daysUntil = getDaysUntil(date);

  let toneClass = "countdown-chip countdown-chip--safe";
  let label = t("calendar.daysLeft", { count: daysUntil });

  if (variant === "closed") {
    toneClass = "countdown-chip countdown-chip--due";
    label = t("calendar.closed");
  } else if (daysUntil <= 0) {
    toneClass = "countdown-chip countdown-chip--due";
    label = t("calendar.dueToday");
  } else if (variant === "urgent" || daysUntil <= 7) {
    toneClass = "countdown-chip countdown-chip--soon";
    label = t("calendar.closesInDays", { count: daysUntil });
  } else if (variant === "closing_soon" || daysUntil <= 30) {
    toneClass = "countdown-chip countdown-chip--soon";
    label = t("calendar.closingSoonDays", { count: daysUntil });
  }

  return (
    <span className={toneClass}>
      <span className="type-micro">{label}</span>
    </span>
  );
}
