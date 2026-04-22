import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  downloadAdminSchemesExport,
  fetchAdminScheme,
  fetchAdminSchemeFlags,
  fetchAdminSchemes,
} from "../lib/adminApi";
import { formatDateTime, formatNumber } from "../lib/adminUi";

const CATEGORY_OPTIONS = [
  "agriculture",
  "health",
  "finance",
  "housing",
  "women",
  "education",
  "disability",
  "senior",
  "skill_and_employment",
  "labour",
  "youth",
  "minority",
  "entrepreneur",
  "sc_st_obc",
  "environment",
  "food_and_nutrition",
];

function Badge({ children, tone = "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400/15 text-emerald-100 border-emerald-400/25"
      : tone === "amber"
        ? "bg-amber-400/15 text-amber-100 border-amber-400/25"
        : tone === "rose"
          ? "bg-rose-400/15 text-rose-100 border-rose-400/25"
          : tone === "sky"
            ? "bg-sky-400/15 text-sky-100 border-sky-400/25"
            : "bg-white/5 text-slate-200 border-white/10";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function JsonBlock({ value }) {
  return (
    <pre className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-slate-200">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export default function AdminSchemesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    state: "",
    category: "",
    active: "",
    page: 1,
    limit: 12,
  });
  const [selectedSchemeId, setSelectedSchemeId] = useState("");

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

  useEffect(() => {
    if (schemesQuery.isSuccess && schemesQuery.data === null) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, schemesQuery.data, schemesQuery.isSuccess]);

  const schemesPayload = schemesQuery.data;
  const schemes = schemesPayload?.schemes || [];
  const totalPages = schemesPayload?.totalPages || 0;
  const activeFlags = flagsQuery.data?.schemes || [];
  const enrichmentFlags = flagsQuery.data?.enrichmentSchemes || [];
  const selectedScheme = selectedSchemeQuery.data || null;
  const flaggedCount = activeFlags.length;
  const enrichmentCount = enrichmentFlags.length;

  const reviewSummary = useMemo(
    () => ({
      missingHindi: activeFlags.filter((scheme) => scheme.reviewReasons.includes("missing_hindi")).length,
      deadUrl: activeFlags.filter((scheme) => scheme.reviewReasons.includes("dead_url")).length,
      userReported: activeFlags.filter((scheme) => scheme.reviewReasons.includes("user_reported")).length,
      emptyEligibility: enrichmentFlags.filter((scheme) => scheme.enrichmentReasons.includes("empty_eligibility")).length,
    }),
    [activeFlags, enrichmentFlags]
  );

  async function handleExport() {
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
  }

  function handleSelectScheme(schemeId) {
    setSelectedSchemeId(schemeId);
  }

  function handleClearSelection() {
    setSelectedSchemeId("");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Scheme Routes
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Scheme review console</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Scraped schemes appear here for review, filtering, export, and QA. This screen is read-only
              by design so the scraper remains the source of truth.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))
            }
            placeholder="Search schemes"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <input
            value={filters.state}
            onChange={(event) =>
              setFilters((current) => ({ ...current, state: event.target.value.toUpperCase(), page: 1 }))
            }
            placeholder="State"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value, page: 1 }))
            }
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={filters.active}
            onChange={(event) =>
              setFilters((current) => ({ ...current, active: event.target.value, page: 1 }))
            }
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() =>
              setFilters({
                search: "",
                state: "",
                category: "",
                active: "",
                page: 1,
                limit: 12,
              })
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Review queue
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {formatNumber(flaggedCount)} actionable flags
              </h3>
            </div>
            <Badge tone={flaggedCount > 0 ? "amber" : "emerald"}>
              {flaggedCount > 0 ? "Needs review" : "All clear"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Missing Hindi</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(reviewSummary.missingHindi)}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dead URL</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(reviewSummary.deadUrl)}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Empty eligibility</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatNumber(reviewSummary.emptyEligibility)}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">User-reported</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatNumber(reviewSummary.userReported)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {flagsQuery.isLoading ? (
              <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                Loading flagged schemes...
              </div>
            ) : null}
            {!flagsQuery.isLoading && activeFlags.length === 0 ? (
              <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                No active schemes currently need manual review.
              </div>
            ) : null}
            {activeFlags.slice(0, 5).map((scheme) => (
              <button
                key={scheme.schemeId}
                type="button"
                onClick={() => handleSelectScheme(scheme.schemeId)}
                className="w-full rounded-[18px] border border-white/8 bg-slate-900/70 px-4 py-4 text-left transition hover:bg-white/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{scheme.schemeId}</span>
                  {scheme.reviewReasons.map((reason) => (
                    <Badge key={reason} tone="rose">
                      {reason.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-300">{scheme.name?.en || "Unnamed scheme"}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
            <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr] gap-3 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <span>Scheme</span>
              <span>State / Category</span>
              <span>Status</span>
              <span>Updated</span>
            </div>
            <div className="divide-y divide-white/6 bg-slate-950/60">
              {schemesQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-400">Loading schemes...</div>
              ) : null}
              {!schemesQuery.isLoading && schemes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400">No schemes match the current filters.</div>
              ) : null}
              {schemes.map((scheme) => (
                <button
                  key={scheme.schemeId}
                  type="button"
                  onClick={() => handleSelectScheme(scheme.schemeId)}
                  className="grid w-full grid-cols-[1.1fr_1fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-left transition hover:bg-white/5"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">{scheme.schemeId}</span>
                    <span className="mt-1 block text-xs text-slate-400">{scheme.name?.en || "Untitled"}</span>
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
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Scraper enrichment gaps
                </p>
                <h4 className="mt-2 text-xl font-semibold text-white">
                  {formatNumber(enrichmentCount)} schemes need enrichment
                </h4>
              </div>
              <Badge tone={enrichmentCount > 0 ? "amber" : "emerald"}>
                {enrichmentCount > 0 ? "Needs enrichment" : "Enriched"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Empty eligibility is tracked separately so the manual review queue stays focused on issues
              that need an admin decision.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Showing {formatNumber(schemesPayload?.total || 0)} schemes. Page {formatNumber(filters.page)} of{" "}
              {formatNumber(totalPages || 1)}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))
                }
                disabled={filters.page <= 1}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: totalPages ? Math.min(current.page + 1, totalPages) : current.page + 1,
                  }))
                }
                disabled={Boolean(totalPages) && filters.page >= totalPages}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Scheme snapshot
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {selectedScheme ? selectedScheme.schemeId : "Select a scheme"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Read-only details from the scraper output and review flags.
              </p>
            </div>
            {selectedScheme ? <Badge tone="sky">Selected</Badge> : <Badge>None selected</Badge>}
          </div>

          {selectedScheme ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-lg font-semibold text-white">{selectedScheme.name?.en || "Untitled"}</p>
                <p className="mt-1 text-sm text-slate-300">{selectedScheme.name?.hi || "No Hindi title"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={selectedScheme.active ? "emerald" : "rose"}>
                    {selectedScheme.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge tone={selectedScheme.verified ? "emerald" : "amber"}>
                    {selectedScheme.verified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge>{selectedScheme.state || "Unknown state"}</Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Key details</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p>Ministry: {selectedScheme.ministry || "Unknown"}</p>
                    <p>Apply mode: {selectedScheme.applyMode || "Unknown"}</p>
                    <p>Apply URL: {selectedScheme.applyUrl || "Missing"}</p>
                    <p>Match count: {formatNumber(selectedScheme.matchCount)}</p>
                    <p>Updated: {formatDateTime(selectedScheme.updatedAt)}</p>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Review reasons</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedScheme.reviewReasons?.length ? (
                      selectedScheme.reviewReasons.map((reason) => (
                        <Badge key={reason} tone="rose">
                          {reason.replace(/_/g, " ")}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">No flags found.</span>
                    )}
                  </div>
                  {selectedScheme.enrichmentReasons?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedScheme.enrichmentReasons.map((reason) => (
                        <Badge key={reason} tone="amber">
                          {reason.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

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
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                  <p>{selectedScheme.description?.en || "No English description."}</p>
                  <p className="mt-3 text-slate-400">{selectedScheme.description?.hi || "No Hindi description."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">
              Pick any scheme from the table to inspect its data and review flags.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
