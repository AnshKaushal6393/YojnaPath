import { useTranslation } from "react-i18next";

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
    accent: "People",
    tone: "impact-stat-card--users",
    labelKey: "impact.stats.usersServed",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalMatches",
    accent: "Matches",
    tone: "impact-stat-card--matches",
    labelKey: "impact.stats.totalMatches",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "schemesInDatabase",
    accent: "Schemes",
    tone: "impact-stat-card--schemes",
    labelKey: "impact.stats.schemesInDatabase",
    formatter: (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0)),
  },
  {
    key: "totalBenefitValue",
    accent: "Value",
    tone: "impact-stat-card--benefits",
    labelKey: "impact.stats.totalBenefitValue",
    formatter: formatMoney,
  },
];

export default function ImpactStats({ stats }) {
  const { t } = useTranslation();

  return (
    <section className="impact-stats-grid">
      {STAT_ITEMS.map((item) => (
        <article key={item.key} className={`impact-stat-card ${item.tone}`.trim()}>
          <div className="impact-stat-card__icon" aria-hidden="true">
            <span>{item.accent}</span>
          </div>
          <div className="impact-stat-card__copy">
            <h2 className="type-h1 impact-stat-card__value">{item.formatter(stats?.[item.key])}</h2>
            <p className="type-caption impact-stat-card__label">{t(item.labelKey)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
