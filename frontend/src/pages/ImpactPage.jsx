import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ChartByState from "../components/ChartByState";
import ChartByUserType from "../components/ChartByUserType";
import ImpactStats from "../components/ImpactStats";
import { apiGet } from "../lib/api";

function formatUpdatedAt(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchImpactData() {
  return apiGet("/api/impact");
}

export default function ImpactPage() {
  const impactQuery = useQuery({
    queryKey: ["impact-public"],
    queryFn: fetchImpactData,
  });

  const stats = impactQuery.data;

  return (
    <main className="app-shell">
      <div className="impact-page">
        <section className="impact-hero">
          <div className="section-heading">
            <p className="eyebrow">IMPACT</p>
            <h1 className="type-h1">Public impact dashboard</h1>
            <p className="type-body-en">
              See the public aggregate usage of YojnaPath without logging in.
            </p>
          </div>
          <div className="impact-hero__actions">
            <Link to="/" className="detail-card__secondary-button">
              Go to home
            </Link>
          </div>
        </section>

        {impactQuery.isLoading ? (
          <section className="impact-panel">
            <p className="type-h2">Loading impact dashboard...</p>
            <p className="type-caption">Fetching live public aggregate stats from the backend.</p>
          </section>
        ) : null}

        {impactQuery.error ? (
          <section className="impact-panel">
            <p className="type-h2">Could not load impact stats</p>
            <p className="type-caption">{impactQuery.error.message}</p>
          </section>
        ) : null}

        {stats ? (
          <>
            <ImpactStats stats={stats} />

            <section className="impact-panel impact-panel--meta">
              <p className="type-caption">Last updated: {formatUpdatedAt(stats.lastUpdated)}</p>
            </section>

            <div className="impact-chart-grid">
              <ChartByUserType values={stats.byUserType} />
              <ChartByState values={stats.byState} />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
