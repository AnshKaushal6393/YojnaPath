import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  sharedAxisTick,
  sharedChartCardClass,
  sharedChartMargins,
  sharedGridStroke,
  sharedTooltipProps,
} from "./rechartsTheme";

function toEntries(values) {
  return Object.entries(values || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 8)
    .map(([name, value]) => ({
      name,
      value: Number(value || 0),
    }));
}

export default function ChartByState({ values }) {
  const { t } = useTranslation();
  const data = toEntries(values);

  return (
    <section className={sharedChartCardClass}>
      <div className="section-heading">
        <h2 className="type-h2">{t("impact.charts.stateTitle")}</h2>
        <p className="type-caption">{t("impact.charts.stateBody")}</p>
      </div>

      {data.length ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={sharedChartMargins}>
              <CartesianGrid strokeDasharray="3 3" stroke={sharedGridStroke} horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={96} tick={sharedAxisTick} />
              <Tooltip {...sharedTooltipProps} />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="type-caption">{t("impact.charts.stateEmpty")}</p>
      )}
    </section>
  );
}
