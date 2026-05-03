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
import { getActiveProfileId } from "../lib/activeProfile";
import { fetchResultsData } from "../lib/resultsApi";
import { fetchSchemeDetail } from "../lib/schemeDetailApi";

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
  const activeProfileId = getActiveProfileId();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategoryFilter = searchParams.get("category") || "all";
  const [activeFilter, setActiveFilter] = useState(initialCategoryFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllNearMisses, setShowAllNearMisses] = useState(false);
  const [compareSchemeIds, setCompareSchemeIds] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const resultsQuery = useQuery({
    queryKey: ["results-data", activeProfileId],
    queryFn: () => fetchResultsData(activeProfileId),
  });

  const compareDetailsQuery = useQuery({
    queryKey: ["scheme-compare", compareSchemeIds],
    enabled: isCompareOpen && compareSchemeIds.length === 2,
    queryFn: async () => Promise.all(compareSchemeIds.map((schemeId) => fetchSchemeDetail(schemeId))),
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
  const activeProfileName = resultsQuery.data?.profile?.profileName || "";
  const activeProfilePhotoUrl =
    resultsQuery.data?.profile?.displayPhotoUrl || resultsQuery.data?.profile?.photoUrl || "";
  const isRefreshingResults = resultsQuery.isFetching && !resultsQuery.isLoading;

  const paginatedSchemes = useMemo(() => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    return visibleSchemes.slice(startIndex, startIndex + RESULTS_PER_PAGE);
  }, [currentPage, visibleSchemes]);

  const compareSchemes = useMemo(() => {
    const schemeMap = new Map((resultsQuery.data?.schemes || []).map((scheme) => [scheme.id, scheme]));
    return compareSchemeIds.map((schemeId) => schemeMap.get(schemeId)).filter(Boolean);
  }, [compareSchemeIds, resultsQuery.data?.schemes]);
  const compareCategory = compareSchemes[0]?.category || null;

  const compareRows = useMemo(() => {
    if (!compareSchemes.length || !compareDetailsQuery.data?.length) {
      return [];
    }

    return [
      {
        label: "Benefit amount",
        values: compareSchemes.map((scheme) => scheme.benefitAmount || "Check details"),
      },
      {
        label: "Match summary",
        values: compareSchemes.map((scheme) =>
          scheme.totalCriteria
            ? `${scheme.matchedCriteria || 0} of ${scheme.totalCriteria} checks matched`
            : "Available after matching"
        ),
      },
      {
        label: "Apply mode",
        values: compareDetailsQuery.data.map((scheme) => toSentenceCase(scheme.applyMode || "Check details")),
      },
      {
        label: "Deadline",
        values: compareDetailsQuery.data.map((scheme) => scheme.deadline?.closes || "No fixed deadline"),
      },
      {
        label: "Documents",
        values: compareDetailsQuery.data.map((scheme) =>
          scheme.documents?.length
            ? scheme.documents.map((document) => document.en || document.hi).filter(Boolean).join(", ")
            : "Check scheme details"
        ),
      },
    ];
  }, [compareDetailsQuery.data, compareSchemes]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const urlFilter = searchParams.get("category") || "all";
    setActiveFilter(urlFilter);
  }, [searchParams]);

  useEffect(() => {
    const validIds = new Set((resultsQuery.data?.schemes || []).map((scheme) => scheme.id));
    setCompareSchemeIds((current) => current.filter((schemeId) => validIds.has(schemeId)));
  }, [resultsQuery.data?.schemes]);

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

  function handleCompareToggle(schemeId) {
    const selectedScheme = (resultsQuery.data?.schemes || []).find((scheme) => scheme.id === schemeId);

    setCompareSchemeIds((current) => {
      if (current.includes(schemeId)) {
        return current.filter((id) => id !== schemeId);
      }

       if (
        current.length > 0 &&
        selectedScheme &&
        compareCategory &&
        selectedScheme.category !== compareCategory
      ) {
        return current;
      }

      if (current.length >= 2) {
        return [current[1], schemeId];
      }

      return [...current, schemeId];
    });
  }

  function clearCompareSelection() {
    setCompareSchemeIds([]);
    setIsCompareOpen(false);
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

        {activeProfileName ? (
          <div
            className={`onboard-feedback ${isRefreshingResults ? "state-info" : "state-success"}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {activeProfilePhotoUrl ? (
                <img
                  src={activeProfilePhotoUrl}
                  alt={activeProfileName}
                  width="40"
                  height="40"
                  className="h-10 w-10 rounded-full border border-white/60 object-cover"
                />
              ) : null}
              <span className="type-caption">
                {isRefreshingResults
                  ? `Refreshing matched schemes for ${activeProfileName}...`
                  : `These scheme results are for ${activeProfileName}.`}
              </span>
            </div>
          </div>
        ) : null}

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
                <div className="results-toolbar-meta">
                  <span className="type-caption">Showing {paginatedSchemes.length} on this page</span>
                  {compareSchemeIds.length ? (
                    <span className="type-caption">{compareSchemeIds.length} selected</span>
                  ) : null}
                  {compareCategory ? (
                    <span className="type-caption">Category: {toSentenceCase(compareCategory)}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <FilterPills
              items={filterItems}
              onSelect={handleFilterSelect}
              ariaLabel="Scheme category filters"
            />
            {compareSchemeIds.length ? (
              <div className="results-compare-bar">
                <span className="type-caption">
                  {compareCategory
                    ? `Compare only ${toSentenceCase(compareCategory)} schemes. ${
                        2 - compareSchemeIds.length > 0 ? `Select ${2 - compareSchemeIds.length} more.` : "Ready to compare."
                      }`
                    : `Select ${2 - compareSchemeIds.length > 0 ? `${2 - compareSchemeIds.length} more` : "ready to compare"}`}
                </span>
                <div className="results-compare-bar__actions">
                  <button type="button" className="results-page-button" onClick={clearCompareSelection}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="results-page-button results-page-button--primary"
                    disabled={compareSchemeIds.length !== 2}
                    onClick={() => setIsCompareOpen(true)}
                  >
                    Compare
                  </button>
                </div>
              </div>
            ) : null}
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
                    matchedCriteria={scheme.matchedCriteria}
                    totalCriteria={scheme.totalCriteria}
                    matchStatus={scheme.matchStatus}
                    description={scheme.description}
                    descriptionHi={scheme.descriptionHi}
                    isCompareSelectable={true}
                    isCompareSelected={compareSchemeIds.includes(scheme.id)}
                    isCompareDisabled={
                      Boolean(compareCategory) &&
                      !compareSchemeIds.includes(scheme.id) &&
                      scheme.category !== compareCategory
                    }
                    onCompareToggle={handleCompareToggle}
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

      {isCompareOpen ? (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setIsCompareOpen(false)}>
          <div
            className="app-modal scheme-compare-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scheme-compare-title"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div className="scheme-compare-modal__header">
              <div>
                <p className="type-label">Scheme comparison</p>
                <h2 id="scheme-compare-title" className="type-h2">
                  Side by side
                </h2>
              </div>
              <button
                type="button"
                className="scheme-report-sheet__close"
                onClick={() => setIsCompareOpen(false)}
                aria-label="Close comparison dialog"
              >
                x
              </button>
            </div>

            {compareDetailsQuery.isLoading ? (
              <div className="results-loading-card">
                <p className="type-body-en">Loading scheme comparison...</p>
              </div>
            ) : compareDetailsQuery.isError ? (
              <div className="results-loading-card state-danger" role="alert">
                <p className="type-body-en">
                  {compareDetailsQuery.error?.message || "Could not load comparison details."}
                </p>
              </div>
            ) : (
              <div className="scheme-compare-table">
                <div className="scheme-compare-table__header">
                  <div className="scheme-compare-table__label-cell" />
                  {compareSchemes.map((scheme) => (
                    <div key={scheme.id} className="scheme-compare-table__scheme-cell">
                      <p className="type-label">{toSentenceCase(scheme.category)}</p>
                      <h3 className="type-h3">{scheme.schemeName}</h3>
                    </div>
                  ))}
                </div>
                {compareRows.map((row) => (
                  <div key={row.label} className="scheme-compare-table__row">
                    <div className="scheme-compare-table__label-cell">{row.label}</div>
                    {row.values.map((value, index) => (
                      <div key={`${row.label}-${compareSchemes[index]?.id || index}`} className="scheme-compare-table__value-cell">
                        {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <BottomNav active="home" />
    </main>
  );
}
