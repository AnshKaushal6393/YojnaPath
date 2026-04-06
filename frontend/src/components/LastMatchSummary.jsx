import { useTranslation } from "react-i18next";

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function LastMatchSummary({ impact, health, isLoading, error, onExplore }) {
  const { t } = useTranslation();
  const schemeCount = health?.schemeCount ?? impact?.schemesInDatabase ?? 0;
  const lastUpdated = impact?.lastUpdated || health?.timestamp;

  if (isLoading) {
    return (
      <section className="home-section">
        <div className="summary-card status-border-matched">
          <p className="type-micro">{t("home.backendSummary.tag")}</p>
          <h2 className="type-h2">{t("home.backendSummary.loadingTitle")}</h2>
          <p className="type-caption">{t("home.backendSummary.loadingBody")}</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-section">
        <div className="summary-card status-border-expired">
          <p className="type-micro">{t("home.backendSummary.tag")}</p>
          <h2 className="type-h2">{t("home.backendSummary.errorTitle")}</h2>
          <p className="type-caption">{error.message}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="home-section">
      <div className="summary-card status-border-matched">
        <div className="summary-card__top">
          <div>
            <p className="type-micro">{t("home.backendSummary.tag")}</p>
            <h2 className="type-h2">{t("home.backendSummary.schemesAvailable", { count: schemeCount })}</h2>
          </div>
          <div className="scheme-card__benefit-chip">
            <p className="type-benefit">v{health?.version || "0.0.0"}</p>
          </div>
        </div>

        <p className="type-body-en">
          {t("home.backendSummary.body")}
        </p>
        <p className="type-caption">{t("home.backendSummary.updatedOn", { date: formatTimestamp(lastUpdated) })}</p>

        <button
          type="button"
          className="summary-card__button btn-primary tap-target"
          onClick={onExplore}
        >
          <span className="type-label">{t("home.backendSummary.explore")}</span>
        </button>
      </div>
    </section>
  );
}
