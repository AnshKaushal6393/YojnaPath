import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchSchemeDetail } from "../lib/schemeDetailApi";

function toSentenceCase(value) {
  return String(value ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function SchemeDetailPage() {
  const { schemeId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: ["scheme-detail", schemeId],
    queryFn: () => fetchSchemeDetail(schemeId),
    enabled: Boolean(schemeId),
  });

  const scheme = detailQuery.data;

  return (
    <main className="app-shell">
      <div className="detail-page">
        <div className="detail-page__header">
          <Link to="/" className="detail-page__back type-label tap-target">
            {"\u2190"} Back to schemes
          </Link>
        </div>

        {detailQuery.isLoading ? (
          <section className="detail-card">
            <p className="type-h2">Loading scheme details...</p>
            <p className="type-caption">Fetching full information from the live backend.</p>
          </section>
        ) : null}

        {detailQuery.error ? (
          <section className="detail-card">
            <p className="type-h2">Could not load scheme details</p>
            <p className="type-caption">{detailQuery.error.message}</p>
          </section>
        ) : null}

        {scheme ? (
          <section className="detail-card">
            <div className="detail-card__top">
              <div className="detail-card__chips">
                <span className={`scheme-card__category-chip category-${scheme.category}`}>
                  <span className="category-badge__text">{toSentenceCase(scheme.category)}</span>
                </span>
                <span className="scheme-card__scope-chip">
                  <span className="type-micro">
                    {scheme.state === "central" ? "Central" : scheme.state}
                  </span>
                </span>
              </div>
              <div className="scheme-card__benefit-chip">
                <p className="type-benefit">{scheme.benefitAmount}</p>
              </div>
            </div>

            {scheme.ministry ? <p className="type-caption">{scheme.ministry}</p> : null}
            <h1 className="type-h1">{scheme.schemeName}</h1>
            {scheme.schemeNameHi ? (
              <p className="detail-card__title-hi hi" lang="hi">
                {scheme.schemeNameHi}
              </p>
            ) : null}

            {scheme.description ? <p className="type-body-en">{scheme.description}</p> : null}
            {scheme.descriptionHi ? (
              <p className="type-body-hi hi" lang="hi">
                {scheme.descriptionHi}
              </p>
            ) : null}

            <div className="detail-card__meta-grid">
              {scheme.benefitType ? (
                <div className="detail-card__meta-item">
                  <p className="type-label">Benefit type</p>
                  <p className="type-caption">{toSentenceCase(scheme.benefitType)}</p>
                </div>
              ) : null}
              {scheme.applyMode ? (
                <div className="detail-card__meta-item">
                  <p className="type-label">Apply mode</p>
                  <p className="type-caption">{toSentenceCase(scheme.applyMode)}</p>
                </div>
              ) : null}
            </div>

            {scheme.documents.length > 0 ? (
              <div className="detail-card__section">
                <h2 className="type-h2">Documents</h2>
                <div className="detail-card__documents">
                  {scheme.documents.map((document, index) => (
                    <div key={`${document.en}-${index}`} className="detail-card__document">
                      {document.en ? <p className="type-body-en">{document.en}</p> : null}
                      {document.hi ? (
                        <p className="type-caption hi" lang="hi">
                          {document.hi}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {scheme.applyUrl ? (
              <a
                href={scheme.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="detail-card__apply btn-primary tap-target"
              >
                <span className="type-label">Open apply link</span>
              </a>
            ) : null}
          </section>
        ) : null}
      </div>

      <BottomNav active="home" />
    </main>
  );
}
