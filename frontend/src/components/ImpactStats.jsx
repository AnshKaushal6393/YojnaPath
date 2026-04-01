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
    label: "Users served",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalMatches",
    label: "Total matches",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "schemesInDatabase",
    label: "Schemes in database",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalBenefitValue",
    label: "Tracked benefit value",
    formatter: formatMoney,
  },
];

export default function ImpactStats({ stats }) {
  return (
    <section className="impact-stats-grid">
      {STAT_ITEMS.map((item) => (
        <article key={item.key} className="impact-stat-card">
          <p className="type-micro">{item.label}</p>
          <h2 className="type-h1 impact-stat-card__value">{item.formatter(stats?.[item.key])}</h2>
        </article>
      ))}
    </section>
  );
}
