import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

function getTopEntry(values) {
  return Object.entries(values || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;
}

export default function ImpactPage() {
  const { t } = useTranslation();
  const impactQuery = useQuery({
    queryKey: ["impact-public"],
    queryFn: fetchImpactData,
  });

  const stats = impactQuery.data;
  const topUserType = getTopEntry(stats?.byUserType);
  const topState = getTopEntry(stats?.byState);

  return (
    <main className="app-shell">
      <div className="impact-page">
        <section className="impact-hero">
          <div className="section-heading">
            <p className="eyebrow">{t("impact.eyebrow")}</p>
            <h1 className="type-h1">{t("impact.title")}</h1>
            <p className="type-body-en">{t("impact.subtitle")}</p>
          </div>
          <div className="impact-hero__actions">
            <Link to="/" className="detail-card__secondary-button">
              {t("impact.goHome")}
            </Link>
          </div>
          <div className="impact-story-grid">
            <article className="impact-story-card">
              <p className="type-label">{t("impact.snapshotLabel")}</p>
              <p className="type-caption">{t("impact.snapshotBody")}</p>
            </article>
            <article className="impact-story-card">
              <p className="type-label">{t("impact.privacyLabel")}</p>
              <p className="type-caption">{t("impact.privacyBody")}</p>
            </article>
            <article className="impact-story-card">
              <p className="type-label">{t("impact.reachLabel")}</p>
              <p className="type-caption">
                {topUserType
                  ? t("impact.topUserType", { type: String(topUserType[0]) })
                  : t("impact.topUserTypeFallback")}
              </p>
              <p className="type-caption">
                {topState
                  ? t("impact.topState", { state: String(topState[0]) })
                  : t("impact.topStateFallback")}
              </p>
            </article>
          </div>
        </section>

        {impactQuery.isLoading ? (
          <section className="impact-panel">
            <p className="type-h2">{t("impact.loadingTitle")}</p>
            <p className="type-caption">{t("impact.loadingBody")}</p>
          </section>
        ) : null}

        {impactQuery.error ? (
          <section className="impact-panel">
            <p className="type-h2">{t("impact.errorTitle")}</p>
            <p className="type-caption">{impactQuery.error.message}</p>
          </section>
        ) : null}

        {stats ? (
          <>
            <ImpactStats stats={stats} />

            <section className="impact-panel impact-panel--meta">
              <p className="type-caption">
                {t("impact.lastUpdated", { date: formatUpdatedAt(stats.lastUpdated) })}
              </p>
              <p className="type-caption">{t("impact.publicNote")}</p>
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
