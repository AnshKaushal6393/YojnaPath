function formatLabel(value) {
  return String(value || "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toEntries(values) {
  return Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
}

export default function ChartByUserType({ values }) {
  const entries = toEntries(values);
  const maxValue = Math.max(...entries.map(([, count]) => Number(count || 0)), 1);

  return (
    <section className="impact-chart-card">
      <div className="section-heading">
        <h2 className="type-h2">By user type</h2>
        <p className="type-caption">Who is using the platform most right now.</p>
      </div>

      {entries.length ? (
        <div className="impact-chart-list">
          {entries.map(([key, count]) => (
            <div key={key} className="impact-chart-row">
              <div className="impact-chart-row__labels">
                <span className="type-label">{formatLabel(key)}</span>
                <span className="type-caption">{count}</span>
              </div>
              <div className="impact-chart-row__track" aria-hidden="true">
                <div
                  className="impact-chart-row__fill impact-chart-row__fill--user"
                  style={{ width: `${(Number(count || 0) / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="type-caption">No profile-type data available yet.</p>
      )}
    </section>
  );
}
