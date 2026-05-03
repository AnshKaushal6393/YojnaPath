import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  bulkUpdateAdminSchemes,
  downloadAdminSchemesExport,
  fetchAdminScheme,
  fetchAdminSchemeFlags,
  fetchAdminSchemes,
  reviewAdminScheme,
} from "../lib/adminApi";
import { formatDateTime, formatNumber } from "../lib/adminUi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { SCHEME_CATEGORY_OPTIONS } from "./adminSchemeFormConfig";

function JsonBlock({ value }) {
  return (
    <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ReviewMetric({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4 shadow-inner shadow-slate-950/30">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(value)}</p>
    </div>
  );
}

function getToneVariant(tone) {
  if (tone === "emerald") return "success";
  if (tone === "amber") return "warning";
  if (tone === "rose") return "danger";
  if (tone === "sky") return "info";
  return "default";
}

function ToneBadge({ children, tone = "slate", className = "" }) {
  return (
    <Badge variant={getToneVariant(tone)} className={className}>
      {children}
    </Badge>
  );
}

function SchemeFlagCard({ scheme, isSelected, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-[18px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
        isSelected
          ? "border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-950/20"
          : "border-white/8 bg-slate-900/70 hover:bg-white/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-semibold text-white">{scheme.schemeId}</span>
        {scheme.reviewReasons.map((reason) => (
          <ToneBadge key={reason} tone="rose">
            {reason.replace(/_/g, " ")}
          </ToneBadge>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-300">{scheme.name?.en || "Unnamed scheme"}</p>
    </button>
  );
}

function SchemeMobileCard({ scheme, isSelected, isChecked, onOpen, onToggle, onEdit }) {
  return (
    <article
      className={`rounded-[20px] border p-4 transition ${
        isSelected ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-slate-950/70"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0"
          aria-label={`Select ${scheme.name?.en || scheme.schemeId}`}
        />
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="wrap-break-word text-sm font-semibold text-white">{scheme.name?.en || "Untitled"}</p>
              <p className="mt-1 break-all text-xs text-slate-400">{scheme.schemeId}</p>
            </div>
            <ToneBadge tone={scheme.active ? "emerald" : "rose"}>
              {scheme.active ? "Active" : "Inactive"}
            </ToneBadge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ToneBadge>{scheme.state || "Unknown"}</ToneBadge>
            <ToneBadge tone={scheme.verified ? "emerald" : "amber"}>
              {scheme.verified ? "Verified" : "Unverified"}
            </ToneBadge>
            <ToneBadge tone="sky">Matches {formatNumber(scheme.matchCount)}</ToneBadge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Category</p>
              <p className="mt-1 line-clamp-2 text-sm text-white">
                {Array.isArray(scheme.categories) && scheme.categories.length
                  ? scheme.categories.join(", ")
                  : "None"}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Updated</p>
              <p className="mt-1 text-sm text-white">{formatDateTime(scheme.updatedAt)}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onOpen}>
          View details
        </Button>
        <Button type="button" variant="secondary" className="rounded-xl" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </article>
  );
}

function createDefaultFilters() {
  return {
    search: "",
    state: "",
    category: "",
    active: "",
    page: 1,
    limit: 12,
    sortBy: "updatedAt",
    sortDir: "desc",
  };
}

export default function AdminSchemesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(createDefaultFilters);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [selectedSchemeIds, setSelectedSchemeIds] = useState([]);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const schemesQuery = useQuery({
    queryKey: ["admin-schemes", filters],
    queryFn: () => fetchAdminSchemes(filters),
  });

  const flagsQuery = useQuery({
    queryKey: ["admin-scheme-flags"],
    queryFn: fetchAdminSchemeFlags,
  });

  const selectedSchemeQuery = useQuery({
    queryKey: ["admin-scheme", selectedSchemeId],
    queryFn: () => fetchAdminScheme(selectedSchemeId),
    enabled: Boolean(selectedSchemeId),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ schemeId, status, note, applyUrl }) =>
      reviewAdminScheme(schemeId, { status, note, applyUrl }),
    onSuccess: async (updatedScheme) => {
      setReviewNote(updatedScheme?.reviewAction?.note || "");
      setReviewUrl(updatedScheme?.applyUrl || "");
      await queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-scheme-flags"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-scheme", selectedSchemeId] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ schemeIds, active }) => bulkUpdateAdminSchemes({ schemeIds, active }),
    onSuccess: async () => {
      setSelectedSchemeIds([]);
      await queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-scheme-flags"] });
    },
  });

  useEffect(() => {
    if (schemesQuery.isSuccess && schemesQuery.data === null) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, schemesQuery.data, schemesQuery.isSuccess]);

  const schemesPayload = schemesQuery.data;
  const schemes = schemesPayload?.schemes || [];
  const totalPages = schemesPayload?.totalPages || 0;
  const activeFlags = Array.isArray(flagsQuery.data?.schemes) ? flagsQuery.data.schemes : [];
  const enrichmentFlags = Array.isArray(flagsQuery.data?.enrichmentSchemes) ? flagsQuery.data.enrichmentSchemes : [];
  const selectedScheme = selectedSchemeQuery.data || null;
  const flaggedCount = activeFlags.length;
  const enrichmentCount = enrichmentFlags.length;

  useEffect(() => {
    setReviewNote(selectedScheme?.reviewAction?.note || "");
  }, [selectedScheme?.reviewAction?.note, selectedScheme?.schemeId]);

  useEffect(() => {
    setReviewUrl(selectedScheme?.applyUrl || "");
  }, [selectedScheme?.applyUrl, selectedScheme?.schemeId]);

  const reviewSummary = useMemo(
    () => ({
      missingHindi: activeFlags.filter((scheme) => scheme.reviewReasons?.includes("missing_hindi")).length,
      deadUrl: activeFlags.filter((scheme) => scheme.reviewReasons?.includes("dead_url")).length,
      userReported: activeFlags.filter((scheme) => scheme.reviewReasons?.includes("user_reported")).length,
      emptyEligibility: enrichmentFlags.filter((scheme) => scheme.enrichmentReasons?.includes("empty_eligibility")).length,
    }),
    [activeFlags, enrichmentFlags]
  );

  async function handleExport() {
    setIsExporting(true);

    try {
      const blob = await downloadAdminSchemesExport();
      if (!blob) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-schemes-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  function handleSelectScheme(schemeId) {
    setSelectedSchemeId(schemeId);
  }

  function toggleSelectedScheme(schemeId) {
    setSelectedSchemeIds((current) =>
      current.includes(schemeId) ? current.filter((item) => item !== schemeId) : [...current, schemeId]
    );
  }

  function handleClearSelection() {
    setSelectedSchemeId("");
    setSelectedSchemeIds([]);
  }

  function handleReviewStatus(status) {
    if (!selectedSchemeId || reviewMutation.isPending) {
      return;
    }

    reviewMutation.mutate({
      schemeId: selectedSchemeId,
      status,
      note: reviewNote,
      applyUrl: reviewUrl,
    });
  }

  const reviewUrlIsValid = (() => {
    if (!reviewUrl) {
      return false;
    }

    try {
      const parsed = new URL(reviewUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  })();

  const allVisibleSelected = schemes.length > 0 && schemes.every((scheme) => selectedSchemeIds.includes(scheme.schemeId));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
      <div className="space-y-6">
        <Card className="rounded-[22px] p-0 sm:rounded-[28px]">
          <CardHeader className="gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Scheme routes</p>
                <CardTitle className="mt-3 text-2xl sm:text-3xl">Scheme list</CardTitle>
                <CardDescription className="max-w-2xl leading-6">
                  Search, sort, bulk-manage, and review scheme records without the page collapsing on smaller screens.
                </CardDescription>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-auto">
                <Button type="button" className="rounded-xl" onClick={() => navigate("/admin/schemes/add")}>
                  Add scheme
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={handleClearSelection}>
                  Clear selection
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pt-6 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_minmax(110px,0.6fr)_minmax(180px,1fr)_minmax(150px,0.9fr)_minmax(170px,1fr)_auto]">
              <FilterField label="Search">
                <Input
                  type="search"
                  value={filters.search}
                  onChange={(event) => handleFilterChange("search", event.target.value)}
                  placeholder="Scheme ID or title"
                  className="rounded-xl"
                />
              </FilterField>
              <FilterField label="State">
                <Input
                  type="text"
                  value={filters.state}
                  onChange={(event) => handleFilterChange("state", event.target.value.toUpperCase())}
                  placeholder="UP"
                  maxLength={10}
                  className="rounded-xl"
                />
              </FilterField>
              <FilterField label="Category">
                <Select
                  value={filters.category}
                  onChange={(event) => handleFilterChange("category", event.target.value)}
                  className="rounded-xl"
                >
                  <option value="">All categories</option>
                  {SCHEME_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </FilterField>
              <FilterField label="Status">
                <Select
                  value={filters.active}
                  onChange={(event) => handleFilterChange("active", event.target.value)}
                  className="rounded-xl"
                >
                  <option value="">All status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FilterField>
              <FilterField label="Sort">
                <Select
                  value={`${filters.sortBy}:${filters.sortDir}`}
                  onChange={(event) => {
                    const [sortBy, sortDir] = event.target.value.split(":");
                    setFilters((current) => ({ ...current, sortBy, sortDir, page: 1 }));
                  }}
                  className="rounded-xl"
                >
                  <option value="updatedAt:desc">Newest updated</option>
                  <option value="updatedAt:asc">Oldest updated</option>
                  <option value="matchCount:desc">Top matches</option>
                  <option value="matchCount:asc">Lowest matches</option>
                  <option value="name:asc">Name A-Z</option>
                </Select>
              </FilterField>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilters(createDefaultFilters())}
                  className="w-full rounded-xl"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[22px] p-0 sm:rounded-[28px]">
          <CardHeader className="gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Review queue</p>
                <CardTitle className="mt-2 text-xl sm:text-2xl">
                  {formatNumber(flaggedCount)} actionable flags
                </CardTitle>
                <CardDescription>
                  Prioritize schemes that need a human check, then bulk-manage the list below.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={flaggedCount > 0 ? "amber" : "emerald"}>
                  {flaggedCount > 0 ? "Needs review" : "All clear"}
                </ToneBadge>
                <ToneBadge tone="sky">{formatNumber(selectedSchemeIds.length)} selected</ToneBadge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReviewMetric label="Missing Hindi" value={reviewSummary.missingHindi} />
              <ReviewMetric label="Dead URL" value={reviewSummary.deadUrl} />
              <ReviewMetric label="Empty eligibility" value={reviewSummary.emptyEligibility} />
              <ReviewMetric label="User-reported" value={reviewSummary.userReported} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button
                type="button"
                onClick={() => bulkMutation.mutate({ schemeIds: selectedSchemeIds, active: true })}
                disabled={bulkMutation.isPending || selectedSchemeIds.length === 0}
                className="rounded-xl"
              >
                Activate selected
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => bulkMutation.mutate({ schemeIds: selectedSchemeIds, active: false })}
                disabled={bulkMutation.isPending || selectedSchemeIds.length === 0}
                className="rounded-xl"
              >
                Deactivate selected
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSelectedSchemeIds(allVisibleSelected ? [] : schemes.map((scheme) => scheme.schemeId))
                }
                className="rounded-xl"
                disabled={schemes.length === 0}
              >
                {allVisibleSelected ? "Unselect visible" : "Select visible"}
              </Button>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                Bulk actions apply to the current page only.
              </div>
            </div>

            <div className="space-y-3">
              {flagsQuery.isLoading ? (
                <div className="rounded-[18px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                  Loading flagged schemes...
                </div>
              ) : null}
              {!flagsQuery.isLoading && activeFlags.length === 0 ? (
                <div className="rounded-[18px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                  No active schemes currently need manual review.
                </div>
              ) : null}
              {activeFlags.slice(0, 5).map((scheme) => (
                <SchemeFlagCard
                  key={scheme.schemeId}
                  scheme={scheme}
                  isSelected={selectedSchemeId === scheme.schemeId}
                  onOpen={() => handleSelectScheme(scheme.schemeId)}
                />
              ))}
            </div>

            {schemesQuery.error ? (
              <div className="rounded-[20px] border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                {schemesQuery.error.message || "Could not load schemes right now."}
              </div>
            ) : null}

            <div className="grid gap-3 lg:hidden">
              {schemesQuery.isLoading ? (
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
                  Loading schemes...
                </div>
              ) : null}
              {!schemesQuery.isLoading && schemes.length === 0 ? (
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
                  No schemes match the current filters.
                </div>
              ) : null}
              {schemes.map((scheme) => (
                <SchemeMobileCard
                  key={scheme.schemeId}
                  scheme={scheme}
                  isSelected={selectedSchemeId === scheme.schemeId}
                  isChecked={selectedSchemeIds.includes(scheme.schemeId)}
                  onOpen={() => handleSelectScheme(scheme.schemeId)}
                  onToggle={() => toggleSelectedScheme(scheme.schemeId)}
                  onEdit={() => navigate(`/admin/schemes/${scheme.schemeId}/edit`)}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[22px] border border-white/10 lg:block">
              <div className="overflow-x-auto">
                <div className="min-w-215 bg-slate-950/60">
                  <div className="grid grid-cols-[0.35fr_1.1fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() =>
                          setSelectedSchemeIds(
                            allVisibleSelected ? [] : schemes.map((scheme) => scheme.schemeId)
                          )
                        }
                      />
                      <span>Select</span>
                    </label>
                    <span>Scheme</span>
                    <span>State / Category</span>
                    <span>Status</span>
                    <span>Updated</span>
                    <span>Actions</span>
                  </div>

                  <div className="divide-y divide-white/6">
                    {schemesQuery.isLoading ? (
                      <div className="px-4 py-6 text-sm text-slate-400">Loading schemes...</div>
                    ) : null}
                    {!schemesQuery.isLoading && schemes.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-400">No schemes match the current filters.</div>
                    ) : null}
                    {schemes.map((scheme) => (
                      <div
                        key={scheme.schemeId}
                        onClick={() => handleSelectScheme(scheme.schemeId)}
                        className={`grid cursor-pointer grid-cols-[0.35fr_1.1fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-left transition ${
                          selectedSchemeId === scheme.schemeId ? "bg-cyan-400/8" : "hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selectedSchemeIds.includes(scheme.schemeId)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleSelectedScheme(scheme.schemeId);
                            }}
                          />
                        </span>
                        <span>
                          <span className="block break-all text-sm font-semibold text-white">{scheme.schemeId}</span>
                          <span className="mt-1 block wrap-break-word text-xs text-slate-400">
                            {scheme.name?.en || "Untitled"}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Matches: {formatNumber(scheme.matchCount)}
                          </span>
                        </span>
                        <span className="text-sm text-slate-300">
                          <span className="block">{scheme.state || "Unknown"}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {Array.isArray(scheme.categories) ? scheme.categories.join(", ") : ""}
                          </span>
                        </span>
                        <span className="text-sm text-slate-300">
                          <span className="block">{scheme.active ? "Active" : "Inactive"}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {scheme.verified ? "Verified" : "Unverified"}
                          </span>
                        </span>
                        <span className="text-sm text-slate-300">{formatDateTime(scheme.updatedAt)}</span>
                        <span className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/schemes/${scheme.schemeId}/edit`);
                            }}
                          >
                            Edit
                          </Button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Scraper enrichment gaps</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">
                    {formatNumber(enrichmentCount)} schemes need enrichment
                  </h4>
                  <p className="mt-3 text-sm text-slate-400">
                    Empty eligibility is tracked separately so the manual review queue stays focused on issues that need an admin decision.
                  </p>
                </div>
                <ToneBadge tone={enrichmentCount > 0 ? "amber" : "emerald"}>
                  {enrichmentCount > 0 ? "Needs enrichment" : "Enriched"}
                </ToneBadge>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <p className="text-sm text-slate-400">
                Showing {formatNumber(schemesPayload?.total || 0)} schemes. Page {formatNumber(filters.page)} of{" "}
                {formatNumber(totalPages || 1)}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleFilterChange("page", Math.max(filters.page - 1, 1))}
                  disabled={filters.page <= 1}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handleFilterChange(
                      "page",
                      totalPages ? Math.min(filters.page + 1, totalPages) : filters.page + 1
                    )
                  }
                  disabled={Boolean(totalPages) && filters.page >= totalPages}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[22px] p-0 xl:sticky xl:top-6 xl:self-start sm:rounded-[28px]">
        <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Scheme snapshot</p>
              <CardTitle className="mt-2 text-xl sm:text-2xl">
                <span className="block break-all">
                  {selectedScheme ? selectedScheme.schemeId : "Select a scheme"}
                </span>
              </CardTitle>
              <CardDescription>Read-only details from the scraper output and review flags.</CardDescription>
            </div>
            {selectedScheme ? <ToneBadge tone="sky">Selected</ToneBadge> : <ToneBadge>None selected</ToneBadge>}
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
          {selectedScheme ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30">
                <p className="wrap-break-word text-lg font-semibold text-white">{selectedScheme.name?.en || "Untitled"}</p>
                <p className="mt-1 wrap-break-word text-sm leading-6 text-slate-300">
                  {selectedScheme.name?.hi || "No Hindi title"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ToneBadge tone={selectedScheme.active ? "emerald" : "rose"}>
                    {selectedScheme.active ? "Active" : "Inactive"}
                  </ToneBadge>
                  <ToneBadge tone={selectedScheme.verified ? "emerald" : "amber"}>
                    {selectedScheme.verified ? "Verified" : "Unverified"}
                  </ToneBadge>
                  <ToneBadge>{selectedScheme.state || "Unknown state"}</ToneBadge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Key details</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    <p>Ministry: {selectedScheme.ministry || "Unknown"}</p>
                    <p>Apply mode: {selectedScheme.applyMode || "Unknown"}</p>
                    <p className="wrap-break-word">Apply URL: {selectedScheme.applyUrl || "Missing"}</p>
                    <p>Match count: {formatNumber(selectedScheme.matchCount)}</p>
                    <p>Updated: {formatDateTime(selectedScheme.updatedAt)}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/30">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Review reasons</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedScheme.reviewReasons?.length ? (
                      selectedScheme.reviewReasons.map((reason) => (
                        <ToneBadge key={reason} tone="rose">
                          {reason.replace(/_/g, " ")}
                        </ToneBadge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">No flags found.</span>
                    )}
                  </div>
                  {selectedScheme.enrichmentReasons?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedScheme.enrichmentReasons.map((reason) => (
                        <ToneBadge key={reason} tone="amber">
                          {reason.replace(/_/g, " ")}
                        </ToneBadge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {(selectedScheme.reviewReasons?.includes("dead_url") || selectedScheme.reviewAction) ? (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 shadow-inner shadow-amber-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-amber-100">Dead URL triage</p>
                      <p className="mt-2 text-sm leading-6 text-amber-50">
                        Mark this link as fixed, moved, or inactive so the queue stops flagging it after review.
                      </p>
                    </div>
                    {selectedScheme.reviewAction?.status ? (
                      <ToneBadge tone="amber">{selectedScheme.reviewAction.status.replace(/_/g, " ")}</ToneBadge>
                    ) : (
                      <ToneBadge tone="rose">Needs triage</ToneBadge>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                      Replacement URL
                    </label>
                    <Input
                      value={reviewUrl}
                      onChange={(event) => setReviewUrl(event.target.value)}
                      placeholder="https://official.gov.in/scheme"
                      className="rounded-2xl focus:border-amber-300/50 focus:ring-amber-300/15"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Paste the corrected official URL for fixed or moved schemes. Inactive schemes can be left blank.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-500">
                      Review note
                    </label>
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      rows={3}
                      placeholder="Add a note about the replacement URL, outage, or deactivation."
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/15"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Button
                      type="button"
                      onClick={() => handleReviewStatus("fixed")}
                      disabled={reviewMutation.isPending || !reviewUrlIsValid}
                      className="rounded-xl"
                    >
                      Mark fixed
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleReviewStatus("moved")}
                      disabled={reviewMutation.isPending || !reviewUrlIsValid}
                      className="rounded-xl border-sky-400/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20"
                    >
                      Mark moved
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleReviewStatus("inactive")}
                      disabled={reviewMutation.isPending}
                      className="rounded-xl"
                    >
                      Mark inactive
                    </Button>
                  </div>

                  {reviewMutation.error ? (
                    <p className="mt-3 text-sm text-rose-200">
                      {reviewMutation.error.message || "Could not save the review action."}
                    </p>
                  ) : null}

                  {!reviewUrlIsValid && (selectedScheme.reviewReasons?.includes("dead_url") || selectedScheme.reviewAction) ? (
                    <p className="mt-3 text-xs text-amber-200">
                      Add a valid replacement URL to enable the fixed and moved actions.
                    </p>
                  ) : null}

                  {selectedScheme.reviewAction?.reviewedAt ? (
                    <p className="mt-3 wrap-break-word  text-xs text-slate-400">
                      Last triaged {formatDateTime(selectedScheme.reviewAction.reviewedAt)}
                      {selectedScheme.reviewAction.reviewedBy ? ` by ${selectedScheme.reviewAction.reviewedBy}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Eligibility</p>
                  <JsonBlock value={selectedScheme.eligibility} />
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Deadline</p>
                  <JsonBlock value={selectedScheme.deadline} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Description</p>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300 shadow-inner shadow-slate-950/30">
                  <p>{selectedScheme.description?.en || "No English description."}</p>
                  <p className="mt-3 text-slate-400">{selectedScheme.description?.hi || "No Hindi description."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">
              Pick any scheme from the list to inspect its data and review flags.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
