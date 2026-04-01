function getDaysUntil(dateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export default function SchemeCountdown({ date }) {
  const daysUntil = getDaysUntil(date);

  let toneClass = "countdown-chip countdown-chip--safe";
  let label = `${daysUntil} days left`;

  if (daysUntil <= 0) {
    toneClass = "countdown-chip countdown-chip--due";
    label = "Due today";
  } else if (daysUntil <= 3) {
    toneClass = "countdown-chip countdown-chip--soon";
    label = `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`;
  }

  return (
    <span className={toneClass}>
      <span className="type-micro">{label}</span>
    </span>
  );
}
