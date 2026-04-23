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

function formatLabel(value) {
  return String(value || "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toEntries(values) {
  return Object.entries(values || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 8)
    .map(([name, value]) => ({
      name,
      label: formatLabel(name),
      value: Number(value || 0),
    }));
}

export default function ChartByUserType({ values }) {
  const { t } = useTranslation();
  const data = toEntries(values);

  return (
    <section className="impact-chart-card">
      <div className="section-heading">
        <h2 className="type-h2">{t("impact.charts.userTypeTitle")}</h2>
        <p className="type-caption">{t("impact.charts.userTypeBody")}</p>
      </div>

      {data.length ? (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={96} tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="type-caption">{t("impact.charts.userTypeEmpty")}</p>
      )}
    </section>
  );
}
