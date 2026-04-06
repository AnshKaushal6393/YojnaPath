import { useTranslation } from "react-i18next";

export default function ResultsHeader({ count, nearMissCount = 0, isLoading }) {
  const { t } = useTranslation();
  const hasMatches = !isLoading && count > 0;

  return (
    <section className={`results-header ${hasMatches ? "results-header--success" : ""}`.trim()}>
      <div className="matching-hero-shape matching-hero-shape--one" aria-hidden="true" />
      <div className="matching-hero-shape matching-hero-shape--two" aria-hidden="true" />

      <div className="section-heading">
        <p className="eyebrow">{t("results.tag")}</p>
        {hasMatches ? (
          <div className="results-header__celebration" aria-hidden="true">
            {"\uD83C\uDF89"}
          </div>
        ) : null}
        <h1 className="type-h1">
          {isLoading ? t("results.titleLoading") : t("results.titleMatched", { count })}
        </h1>
        <p className="type-body-en">
          {isLoading ? t("results.bodyLoading") : t("results.bodyMatched")}
        </p>
        <p className="type-body-hi hi" lang="hi">
          {isLoading ? t("results.bodyLoadingHi") : t("results.bodyMatchedHi")}
        </p>
      </div>
      {!isLoading ? (
        <div className="results-header__stats">
          <div className="results-stat-chip results-stat-chip--matched">
            <span className="type-micro">{t("results.matched")}</span>
            <strong>{count}</strong>
          </div>
          <div className="results-stat-chip results-stat-chip--near-miss">
            <span className="type-micro">{t("results.nearMiss")}</span>
            <strong>{nearMissCount}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
