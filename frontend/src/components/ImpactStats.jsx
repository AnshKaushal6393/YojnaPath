function formatMoney(value) {
  const amount = Number(value || 0);
  if (!amount) {
    return "Rs. 0";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(amount);
}

const STAT_ITEMS = [
  {
    key: "usersServed",
    icon: "\uD83D\uDC65",
    tone: "impact-stat-card--users",
    label: "Users served",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalMatches",
    icon: "\uD83C\uDFAF",
    tone: "impact-stat-card--matches",
    label: "Total matches",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "schemesInDatabase",
    icon: "\uD83D\uDCC4",
    tone: "impact-stat-card--schemes",
    label: "Schemes in database",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalBenefitValue",
    icon: "\uD83D\uDCB0",
    tone: "impact-stat-card--benefits",
    label: "Tracked benefit value",
    formatter: formatMoney,
  },
];

export default function ImpactStats({ stats }) {
  return (
    <section className="impact-stats-grid">
      {STAT_ITEMS.map((item) => (
        <article key={item.key} className={`impact-stat-card ${item.tone}`.trim()}>
          <div className="impact-stat-card__icon" aria-hidden="true">
            {item.icon}
          </div>
          <div className="impact-stat-card__copy">
            <h2 className="type-h1 impact-stat-card__value">{item.formatter(stats?.[item.key])}</h2>
            <p className="type-caption impact-stat-card__label">{item.label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
