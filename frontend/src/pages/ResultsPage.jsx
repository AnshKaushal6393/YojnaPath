import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "../components/BottomNav";
import EmptyState from "../components/EmptyState";
import FilterPills from "../components/FilterPills";
import NearMissCard from "../components/NearMissCard";
import ResultsHeader from "../components/ResultsHeader";
import SchemeCard from "../components/SchemeCard";
import UrgencyBanner from "../components/UrgencyBanner";
import { fetchResultsData } from "../lib/resultsApi";

const RESULTS_PER_PAGE = 12;

function toSentenceCase(value) {
  return String(value ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const NEAR_MISS_PREVIEW_LIMIT = 4;

function buildFilterItems(activeFilter, schemes) {
  const counts = new Map();

  schemes.forEach((scheme) => {
    const key = scheme.category;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const items = [
    {
      value: "all",
      label: "All",
      active: activeFilter === "all",
    },
  ];

  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      items.push({
        value: category,
        label: `${toSentenceCase(category)} (${count})`,
        active: activeFilter === category,
        className: `category-${category}`,
      });
    });

  return items;
}

export default function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategoryFilter = searchParams.get("category") || "all";
  const [activeFilter, setActiveFilter] = useState(initialCategoryFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllNearMisses, setShowAllNearMisses] = useState(false);

  const resultsQuery = useQuery({
    queryKey: ["results-data"],
    queryFn: fetchResultsData,
  });

  const filterItems = useMemo(
    () => buildFilterItems(activeFilter, resultsQuery.data?.schemes || []),
    [activeFilter, resultsQuery.data?.schemes]
  );

  const visibleSchemes = useMemo(() => {
    const schemes = resultsQuery.data?.schemes || [];
    if (activeFilter === "all") {
      return schemes;
    }

    return schemes.filter((scheme) => scheme.category === activeFilter);
  }, [activeFilter, resultsQuery.data?.schemes]);

  const visibleNearMisses = useMemo(() => {
    const nearMisses = resultsQuery.data?.nearMisses || [];
    if (showAllNearMisses) {
      return nearMisses;
    }

    return nearMisses.slice(0, NEAR_MISS_PREVIEW_LIMIT);
  }, [resultsQuery.data?.nearMisses, showAllNearMisses]);

  const totalPages = Math.max(1, Math.ceil(visibleSchemes.length / RESULTS_PER_PAGE));

  const paginatedSchemes = useMemo(() => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    return visibleSchemes.slice(startIndex, startIndex + RESULTS_PER_PAGE);
  }, [currentPage, visibleSchemes]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const urlFilter = searchParams.get("category") || "all";
    setActiveFilter(urlFilter);
  }, [searchParams]);

  function handleFilterSelect(value) {
    setActiveFilter(value);
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", value);
    }
    setSearchParams(nextParams, { replace: true });
  }

  if (resultsQuery.isSuccess && !resultsQuery.data?.profile) {
    return <Navigate to="/onboard" replace />;
  }

  return (
    <main className="app-shell">
      <div className="results-page">
        <ResultsHeader
          count={resultsQuery.data?.count || 0}
          nearMissCount={resultsQuery.data?.nearMissCount || 0}
          isLoading={resultsQuery.isLoading}
        />

        {resultsQuery.data?.urgent?.length ? (
          <UrgencyBanner
            text={`${resultsQuery.data.urgent.length} urgent scheme${
              resultsQuery.data.urgent.length > 1 ? "s" : ""
            } closing soon`}
          />
        ) : null}

        {visibleNearMisses.length ? (
          <section className="results-section results-section--near-miss">
            <div className="results-section__header">
              <h2 className="type-h2">Near misses</h2>
              <p className="type-caption">
                These are close matches. One eligibility condition is still missing.
              </p>
            </div>
            <div className="results-near-miss-grid">
              {visibleNearMisses.map((scheme) => (
                <NearMissCard
                  key={scheme.id}
                  schemeId={scheme.id}
                  schemeName={scheme.schemeName}
                  schemeNameHi={scheme.schemeNameHi}
                  benefitAmount={scheme.benefitAmount}
                  category={scheme.categoryLabel}
                  categoryKey={scheme.category}
                  state={scheme.state}
                  gapLabel={scheme.gapLabel}
                  gapLabelHi={scheme.gapLabelHi}
                />
              ))}
            </div>
            {resultsQuery.data?.nearMissCount > NEAR_MISS_PREVIEW_LIMIT ? (
              <div className="results-near-miss-actions">
                <button
                  type="button"
                  className="results-page-button"
                  onClick={() => setShowAllNearMisses((current) => !current)}
                >
                  {showAllNearMisses ? "Show fewer near misses" : "See all near misses"}
                </button>
                <span className="type-caption">
                  Showing {visibleNearMisses.length} of {resultsQuery.data.nearMissCount}
                </span>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="results-section">
          <div className="results-section__header">
            <h2 className="type-h2">Matched schemes</h2>
            <p className="type-caption">
              {resultsQuery.isLoading
                ? "Loading matched schemes..."
                : `${visibleSchemes.length} ready to explore`}
            </p>
          </div>

          <div className="results-filters-card">
            <div className="results-filters-card__header">
              <p className="type-label">Filter by category</p>
              {!resultsQuery.isLoading ? (
                <span className="type-caption">Showing {paginatedSchemes.length} on this page</span>
              ) : null}
            </div>
            <FilterPills
              items={filterItems}
              onSelect={handleFilterSelect}
              ariaLabel="Scheme category filters"
            />
          </div>

          {resultsQuery.isLoading ? (
            <div className="results-loading-card">
              <p className="type-body-en">Finding the best schemes for your saved profile...</p>
              <p className="type-body-hi hi" lang="hi">
                {
                  "\u0906\u092a\u0915\u0940 \u0938\u0947\u0935 \u0915\u0940 \u0917\u0908 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0915\u0947 \u0939\u093f\u0938\u093e\u092c \u0938\u0947 \u0938\u0939\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"
                }
              </p>
            </div>
          ) : resultsQuery.isError ? (
            <div className="results-loading-card state-danger" role="alert">
              <p className="type-body-en">
                {resultsQuery.error?.message || "Could not load your results right now."}
              </p>
            </div>
          ) : visibleSchemes.length ? (
            <>
              <div className="results-scheme-grid">
                {paginatedSchemes.map((scheme, index) => (
                  <SchemeCard
                    key={scheme.id}
                    schemeId={scheme.id}
                    schemeName={scheme.schemeName}
                    schemeNameHi={scheme.schemeNameHi}
                    benefitAmount={scheme.benefitAmount}
                    category={scheme.category}
                    state={scheme.state}
                    ministry={scheme.ministry}
                    matchScorePercent={scheme.matchScorePercent}
                    matchStatus={scheme.matchStatus}
                    description={scheme.description}
                    descriptionHi={scheme.descriptionHi}
                    staggerIndex={index}
                  />
                ))}
              </div>

              {visibleSchemes.length > RESULTS_PER_PAGE ? (
                <div className="results-pagination" aria-label="Results pagination">
                  <button
                    type="button"
                    className="results-page-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span className="type-caption">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="results-page-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="कोई योजना नहीं मिली — अपनी जानकारी बदलें"
              description="Try adjusting your saved profile to unlock more schemes."
              suggestions={[
                "Check your income band once more",
                "Update state or land details if they changed",
              ]}
            />
          )}
        </section>

        {!resultsQuery.isLoading && !resultsQuery.isError && !visibleSchemes.length ? (
          <div className="results-section__footer">
            <Link to="/profile" className="results-inline-link">
              Update profile details
            </Link>
          </div>
        ) : null}
      </div>

      <BottomNav active="home" />
    </main>
  );
}
