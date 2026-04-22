import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createAdminScheme,
  deleteAdminScheme,
  downloadAdminSchemesExport,
  fetchAdminScheme,
  fetchAdminSchemeFlags,
  fetchAdminSchemes,
  updateAdminScheme,
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

const DEFAULT_DRAFT = {
  schemeId: "",
  nameEn: "",
  nameHi: "",
  descriptionEn: "",
  descriptionHi: "",
  ministry: "",
  state: "Central",
  categories: "",
  applyUrl: "",
  applyMode: "online",
  source: "manual",
  benefitType: "service",
  benefitAmount: "",
  tags: "",
  officeAddressEn: "",
  officeAddressHi: "",
  eligibilityJson: "{\n  \"occupation\": []\n}",
  deadlineJson: "{\n  \"recurring\": false\n}",
  active: true,
  verified: false,
};

function makeDraftFromScheme(scheme) {
  if (!scheme) {
    return { ...DEFAULT_DRAFT };
  }

  return {
    schemeId: scheme.schemeId || "",
    nameEn: scheme.name?.en || "",
    nameHi: scheme.name?.hi || "",
    descriptionEn: scheme.description?.en || "",
    descriptionHi: scheme.description?.hi || "",
    ministry: scheme.ministry || "",
    state: scheme.state || "Central",
    categories: Array.isArray(scheme.categories) ? scheme.categories.join(", ") : "",
    applyUrl: scheme.applyUrl || "",
    applyMode: scheme.applyMode || "online",
    source: scheme.source || "manual",
    benefitType: scheme.benefitType || "service",
    benefitAmount: scheme.benefitAmount == null ? "" : String(scheme.benefitAmount),
    tags: Array.isArray(scheme.tags) ? scheme.tags.join(", ") : "",
    officeAddressEn: scheme.officeAddress?.en || "",
    officeAddressHi: scheme.officeAddress?.hi || "",
    eligibilityJson: JSON.stringify(scheme.eligibility || { occupation: [] }, null, 2),
    deadlineJson: JSON.stringify(
      scheme.deadline || { recurring: false },
      null,
      2
    ),
    active: scheme.active !== false,
    verified: Boolean(scheme.verified),
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildPayload(draft) {
  return {
    schemeId: draft.schemeId,
    name: { en: draft.nameEn, hi: draft.nameHi },
    description: draft.descriptionEn || draft.descriptionHi ? { en: draft.descriptionEn, hi: draft.descriptionHi } : undefined,
    ministry: draft.ministry,
    categories: draft.categories
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    state: draft.state,
    applyUrl: draft.applyUrl,
    applyMode: draft.applyMode,
    source: draft.source,
    benefitType: draft.benefitType,
    benefitAmount: draft.benefitAmount === "" ? null : Number(draft.benefitAmount),
    tags: draft.tags
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    officeAddress:
      draft.officeAddressEn || draft.officeAddressHi
        ? { en: draft.officeAddressEn, hi: draft.officeAddressHi }
        : undefined,
    eligibility: safeJsonParse(draft.eligibilityJson, { occupation: [] }),
    deadline: safeJsonParse(draft.deadlineJson, { recurring: false }),
    active: Boolean(draft.active),
    verified: Boolean(draft.verified),
  };
}

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

export default function AdminSchemesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    state: "",
    category: "",
    active: "",
    page: 1,
    limit: 12,
  });
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [draft, setDraft] = useState(DEFAULT_DRAFT);

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

  useEffect(() => {
    if (!selectedSchemeId) {
      setDraft({ ...DEFAULT_DRAFT });
      return;
    }

    if (selectedSchemeQuery.data) {
      setDraft(makeDraftFromScheme(selectedSchemeQuery.data));
    }
  }, [selectedSchemeId, selectedSchemeQuery.data]);

  const schemesPayload = schemesQuery.data;
  const schemes = schemesPayload?.schemes || [];
  const totalPages = schemesPayload?.totalPages || 0;
  const activeFlags = flagsQuery.data?.schemes || [];
  const selectedScheme = selectedSchemeQuery.data || null;

  const flaggedCount = activeFlags.length;
  const reviewTone = flaggedCount > 0 ? "amber" : "emerald";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const required = [
        ["schemeId", draft.schemeId],
        ["nameEn", draft.nameEn],
        ["nameHi", draft.nameHi],
        ["ministry", draft.ministry],
        ["state", draft.state],
        ["categories", draft.categories],
        ["applyUrl", draft.applyUrl],
        ["benefitType", draft.benefitType],
        ["source", draft.source],
      ];
      const missing = required.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);

      if (!selectedSchemeId && missing.length > 0) {
        throw new Error(`Please fill required fields: ${missing.join(", ")}`);
      }

      const payload = buildPayload(draft);
      payload.schemeId = selectedSchemeId || draft.schemeId;
      return selectedSchemeId
        ? updateAdminScheme(selectedSchemeId, payload)
        : createAdminScheme(payload);
    },
    onSuccess: async (savedScheme) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-schemes"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-scheme-flags"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-scheme"] }),
      ]);
      if (savedScheme?.schemeId) {
        setSelectedSchemeId(savedScheme.schemeId);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminScheme(selectedSchemeId),
    onSuccess: async () => {
      setSelectedSchemeId("");
      setDraft({ ...DEFAULT_DRAFT });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-schemes"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-scheme-flags"] }),
      ]);
    },
  });

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

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSelectScheme(schemeId) {
    setSelectedSchemeId(schemeId);
  }

  function handleNewScheme() {
    setSelectedSchemeId("");
    setDraft({ ...DEFAULT_DRAFT });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Scheme Routes
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Admin scheme manager</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Review schemes, inspect deadline flags, export CSVs, and update the live Mongo records.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleNewScheme}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              New scheme
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
                {formatNumber(flaggedCount)} flagged schemes
              </h3>
            </div>
            <Badge tone={reviewTone}>{flaggedCount > 0 ? "Needs review" : "All clear"}</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {flagsQuery.isLoading ? (
              <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                Loading flagged schemes...
              </div>
            ) : null}
            {!flagsQuery.isLoading && activeFlags.length === 0 ? (
              <div className="rounded-[18px] bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                No active schemes currently need review.
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
                Scheme editor
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {selectedScheme ? selectedScheme.schemeId : "Create a new scheme"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Use this panel to create or update a scheme. JSON fields are accepted as raw JSON.
              </p>
            </div>
            {selectedScheme ? (
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
              >
                Soft delete
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Scheme ID
              </span>
              <input
                value={draft.schemeId}
                onChange={(event) => updateDraft("schemeId", event.target.value.toUpperCase())}
                disabled={Boolean(selectedSchemeId)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="SCHEME001"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Ministry
              </span>
              <input
                value={draft.ministry}
                onChange={(event) => updateDraft("ministry", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                placeholder="Ministry name"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Name English
              </span>
              <input
                value={draft.nameEn}
                onChange={(event) => updateDraft("nameEn", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Name Hindi
              </span>
              <input
                value={draft.nameHi}
                onChange={(event) => updateDraft("nameHi", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                State
              </span>
              <input
                value={draft.state}
                onChange={(event) => updateDraft("state", event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Apply mode
              </span>
              <select
                value={draft.applyMode}
                onChange={(event) => updateDraft("applyMode", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              >
                <option value="online">online</option>
                <option value="offline">offline</option>
                <option value="both">both</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Benefit type
              </span>
              <input
                value={draft.benefitType}
                onChange={(event) => updateDraft("benefitType", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Categories
              </span>
              <input
                value={draft.categories}
                onChange={(event) => updateDraft("categories", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                placeholder="agriculture, finance"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Apply URL
              </span>
              <input
                value={draft.applyUrl}
                onChange={(event) => updateDraft("applyUrl", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Tags
              </span>
              <input
                value={draft.tags}
                onChange={(event) => updateDraft("tags", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
                placeholder="user-reported, urgent"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Source
              </span>
              <input
                value={draft.source}
                onChange={(event) => updateDraft("source", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Benefit amount
              </span>
              <input
                type="number"
                value={draft.benefitAmount}
                onChange={(event) => updateDraft("benefitAmount", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Office address EN
              </span>
              <textarea
                value={draft.officeAddressEn}
                onChange={(event) => updateDraft("officeAddressEn", event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Office address HI
              </span>
              <textarea
                value={draft.officeAddressHi}
                onChange={(event) => updateDraft("officeAddressHi", event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Eligibility JSON
              </span>
              <textarea
                value={draft.eligibilityJson}
                onChange={(event) => updateDraft("eligibilityJson", event.target.value)}
                rows={8}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Deadline JSON
              </span>
              <textarea
                value={draft.deadlineJson}
                onChange={(event) => updateDraft("deadlineJson", event.target.value)}
                rows={8}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => updateDraft("active", event.target.checked)}
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(event) => updateDraft("verified", event.target.checked)}
              />
              Verified
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              {selectedSchemeId ? "Save changes" : "Create scheme"}
            </button>
            {selectedScheme ? (
              <button
                type="button"
                onClick={handleNewScheme}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                New blank form
              </button>
            ) : null}
          </div>

          {saveMutation.error ? (
            <div className="mt-4 rounded-[18px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {saveMutation.error.message || "Could not save scheme."}
            </div>
          ) : null}
          {deleteMutation.error ? (
            <div className="mt-4 rounded-[18px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {deleteMutation.error.message || "Could not delete scheme."}
            </div>
          ) : null}

          {selectedScheme ? (
            <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Live snapshot
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedScheme.name?.en || "Untitled"}</p>
                  <p className="mt-1 text-sm text-slate-300">{selectedScheme.name?.hi || "No Hindi title"}</p>
                  <p className="mt-2 text-xs text-slate-500">{selectedScheme.applyUrl}</p>
                </div>
                <div className="text-sm text-slate-300">
                  <p>Match count: {formatNumber(selectedScheme.matchCount)}</p>
                  <p>Flags: {selectedScheme.reviewReasons?.join(", ") || "none"}</p>
                  <p>Updated: {formatDateTime(selectedScheme.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
