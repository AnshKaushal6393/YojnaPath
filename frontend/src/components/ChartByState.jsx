import { useTranslation } from "react-i18next";

function toEntries(values) {
  return Object.entries(values || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export default function ChartByState({ values }) {
  const { t } = useTranslation();
  const entries = toEntries(values);
  const maxValue = Math.max(...entries.map(([, count]) => Number(count || 0)), 1);

  return (
    <section className="impact-chart-card">
      <div className="section-heading">
        <h2 className="type-h2">{t("impact.charts.stateTitle")}</h2>
        <p className="type-caption">{t("impact.charts.stateBody")}</p>
      </div>

      {entries.length ? (
        <div className="impact-chart-list">
          {entries.map(([key, count]) => (
            <div key={key} className="impact-chart-row">
              <div className="impact-chart-row__labels">
                <span className="type-label">{key}</span>
                <span className="type-caption">{count}</span>
              </div>
              <div className="impact-chart-row__track" aria-hidden="true">
                <div
                  className="impact-chart-row__fill impact-chart-row__fill--state"
                  style={{ width: `${(Number(count || 0) / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="type-caption">{t("impact.charts.stateEmpty")}</p>
      )}
    </section>
  );
}
