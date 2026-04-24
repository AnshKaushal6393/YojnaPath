import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAdminScheme,
  fetchAdminScheme,
  fetchAdminSchemeHistory,
  updateAdminScheme,
} from "../lib/adminApi";
import { formatDateTime } from "../lib/adminUi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  APPLY_MODE_OPTIONS,
  BENEFICIARY_TYPE_OPTIONS,
  BENEFIT_TYPE_OPTIONS,
  CASTE_OPTIONS,
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  OCCUPATION_OPTIONS,
  SCHEME_CATEGORY_OPTIONS,
  SCHEME_STATE_OPTIONS,
  SOURCE_OPTIONS,
} from "./adminSchemeFormConfig";

function createEmptyForm() {
  return {
    schemeId: "",
    name: { en: "", hi: "" },
    description: { en: "", hi: "" },
    ministry: "",
    categories: [],
    state: "central",
    eligibility: {
      occupation: [],
      beneficiaryType: [],
      caste: [],
      gender: [],
      maxAnnualIncome: "",
      minAge: "",
      maxAge: "",
      landOwned: { min: "", max: "" },
      minDisabilityPct: "",
      minEducation: "",
      mustBeStudent: "",
      mustHaveBankAccount: "",
      mustHaveAadhaar: "",
    },
    benefitAmount: "",
    benefitType: "cash_transfer",
    documentsText: "",
    applyUrl: "",
    applyMode: "online",
    officeAddress: { en: "", hi: "" },
    deadline: {
      opens: "",
      closes: "",
      recurring: false,
      recurringMonth: "",
      recurringDay: "",
    },
    tagsText: "",
    active: true,
    verified: false,
    source: "manual",
    auditNote: "",
  };
}

function toTextLines(rows = []) {
  return (rows || [])
    .map((row) => row?.en || row?.hi || "")
    .filter(Boolean)
    .join("\n");
}

function toFormValues(scheme) {
  const form = createEmptyForm();
  if (!scheme) return form;

  return {
    ...form,
    schemeId: scheme.schemeId || "",
    name: {
      en: scheme.name?.en || "",
      hi: scheme.name?.hi || "",
    },
    description: {
      en: scheme.description?.en || "",
      hi: scheme.description?.hi || "",
    },
    ministry: scheme.ministry || "",
    categories: Array.isArray(scheme.categories) ? scheme.categories : [],
    state: scheme.state || "central",
    eligibility: {
      occupation: scheme.eligibility?.occupation || [],
      beneficiaryType: scheme.eligibility?.beneficiaryType || [],
      caste: scheme.eligibility?.caste || [],
      gender: scheme.eligibility?.gender || [],
      maxAnnualIncome: scheme.eligibility?.maxAnnualIncome ?? "",
      minAge: scheme.eligibility?.minAge ?? "",
      maxAge: scheme.eligibility?.maxAge ?? "",
      landOwned: {
        min: scheme.eligibility?.landOwned?.min ?? "",
        max: scheme.eligibility?.landOwned?.max ?? "",
      },
      minDisabilityPct: scheme.eligibility?.minDisabilityPct ?? "",
      minEducation: scheme.eligibility?.minEducation || "",
      mustBeStudent:
        typeof scheme.eligibility?.mustBeStudent === "boolean" ? String(scheme.eligibility.mustBeStudent) : "",
      mustHaveBankAccount:
        typeof scheme.eligibility?.mustHaveBankAccount === "boolean"
          ? String(scheme.eligibility.mustHaveBankAccount)
          : "",
      mustHaveAadhaar:
        typeof scheme.eligibility?.mustHaveAadhaar === "boolean" ? String(scheme.eligibility.mustHaveAadhaar) : "",
    },
    benefitAmount: scheme.benefitAmount ?? "",
    benefitType: scheme.benefitType || "cash_transfer",
    documentsText: toTextLines(scheme.documents),
    applyUrl: scheme.applyUrl || "",
    applyMode: scheme.applyMode || "online",
    officeAddress: {
      en: scheme.officeAddress?.en || "",
      hi: scheme.officeAddress?.hi || "",
    },
    deadline: {
      opens: scheme.deadline?.opens ? String(scheme.deadline.opens).slice(0, 10) : "",
      closes: scheme.deadline?.closes ? String(scheme.deadline.closes).slice(0, 10) : "",
      recurring: Boolean(scheme.deadline?.recurring),
      recurringMonth: scheme.deadline?.recurringMonth ?? "",
      recurringDay: scheme.deadline?.recurringDay ?? "",
    },
    tagsText: Array.isArray(scheme.tags) ? scheme.tags.join(", ") : "",
    active: scheme.active !== false,
    verified: Boolean(scheme.verified),
    source: scheme.source || "manual",
    auditNote: "",
  };
}

function cleanNumber(value) {
  return value === "" ? null : Number(value);
}

function buildPayload(form, isEdit) {
  return {
    ...(isEdit ? {} : { schemeId: form.schemeId }),
    name: form.name,
    description: form.description,
    ministry: form.ministry,
    categories: form.categories,
    state: form.state,
    eligibility: {
      occupation: form.eligibility.occupation,
      beneficiaryType: form.eligibility.beneficiaryType,
      caste: form.eligibility.caste,
      gender: form.eligibility.gender,
      maxAnnualIncome: cleanNumber(form.eligibility.maxAnnualIncome),
      minAge: cleanNumber(form.eligibility.minAge),
      maxAge: cleanNumber(form.eligibility.maxAge),
      landOwned:
        form.eligibility.landOwned.min !== "" || form.eligibility.landOwned.max !== ""
          ? {
              min: Number(form.eligibility.landOwned.min || 0),
              max: Number(form.eligibility.landOwned.max || 0),
            }
          : null,
      minDisabilityPct: cleanNumber(form.eligibility.minDisabilityPct),
      minEducation: form.eligibility.minEducation || null,
      mustBeStudent: form.eligibility.mustBeStudent === "" ? null : form.eligibility.mustBeStudent === "true",
      mustHaveBankAccount:
        form.eligibility.mustHaveBankAccount === "" ? null : form.eligibility.mustHaveBankAccount === "true",
      mustHaveAadhaar: form.eligibility.mustHaveAadhaar === "" ? null : form.eligibility.mustHaveAadhaar === "true",
    },
    benefitAmount: cleanNumber(form.benefitAmount),
    benefitType: form.benefitType,
    documents: form.documentsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ en: line, hi: line })),
    applyUrl: form.applyUrl,
    applyMode: form.applyMode,
    officeAddress: form.officeAddress.en || form.officeAddress.hi ? form.officeAddress : null,
    deadline: {
      opens: form.deadline.opens || null,
      closes: form.deadline.closes || null,
      recurring: form.deadline.recurring,
      recurringMonth: cleanNumber(form.deadline.recurringMonth),
      recurringDay: cleanNumber(form.deadline.recurringDay),
    },
    tags: form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    active: form.active,
    verified: form.verified,
    source: form.source,
    auditNote: form.auditNote || null,
  };
}

function ToggleSet({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-100">{label}</span>
      {children}
    </label>
  );
}

export default function AdminSchemeFormPage() {
  const { schemeId = "" } = useParams();
  const isEdit = Boolean(schemeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState("");

  const schemeQuery = useQuery({
    queryKey: ["admin-scheme", schemeId],
    queryFn: () => fetchAdminScheme(schemeId),
    enabled: isEdit,
  });
  const historyQuery = useQuery({
    queryKey: ["admin-scheme-history", schemeId],
    queryFn: () => fetchAdminSchemeHistory(schemeId),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && schemeQuery.data === null) {
      navigate("/admin/login", { replace: true });
    }
  }, [isEdit, navigate, schemeQuery.data]);

  useEffect(() => {
    if (schemeQuery.data) {
      setForm(toFormValues(schemeQuery.data));
    }
  }, [schemeQuery.data]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? updateAdminScheme(schemeId, payload) : createAdminScheme(payload)),
    onSuccess: async (scheme) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-scheme-flags"] });
      if (isEdit) {
        await queryClient.invalidateQueries({ queryKey: ["admin-scheme", schemeId] });
        await queryClient.invalidateQueries({ queryKey: ["admin-scheme-history", schemeId] });
      }
      navigate(`/admin/schemes${scheme?.schemeId ? `?selected=${scheme.schemeId}` : ""}`, { replace: true });
    },
    onError: (submitError) => {
      setError(submitError.message || "Could not save scheme right now.");
    },
  });

  function patch(updater) {
    setForm((current) => updater(current));
    setError("");
  }

  function toggleInArray(key, value) {
    patch((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function toggleEligibilityArray(key, value) {
    patch((current) => ({
      ...current,
      eligibility: {
        ...current.eligibility,
        [key]: current.eligibility[key].includes(value)
          ? current.eligibility[key].filter((item) => item !== value)
          : [...current.eligibility[key], value],
      },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate(buildPayload(form, isEdit));
  }

  const historyItems = useMemo(() => historyQuery.data?.items || [], [historyQuery.data]);

  return (
    <section className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/admin/schemes" className="text-sm text-emerald-300 hover:text-emerald-200">
            Back to schemes
          </Link>
          <h2 className="mt-3 text-3xl font-semibold text-white">{isEdit ? "Edit scheme" : "Add scheme"}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {isEdit ? "Pre-filled MongoDB-backed scheme editor with audit note and recent history." : "Structured scheme form covering the current MongoDB model."}
          </p>
        </div>
        <Badge variant={isEdit ? "info" : "success"}>{isEdit ? "Editing existing scheme" : "New scheme"}</Badge>
      </div>

      <form className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Core fields</CardTitle>
              <CardDescription>Identity, text, state, categories, and publication settings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {!isEdit ? (
                <Field label="Scheme ID">
                  <Input value={form.schemeId} onChange={(event) => patch((current) => ({ ...current, schemeId: event.target.value.toUpperCase() }))} />
                </Field>
              ) : null}
              <Field label="Ministry">
                <Input value={form.ministry} onChange={(event) => patch((current) => ({ ...current, ministry: event.target.value }))} />
              </Field>
              <Field label="Name (EN)">
                <Input value={form.name.en} onChange={(event) => patch((current) => ({ ...current, name: { ...current.name, en: event.target.value } }))} />
              </Field>
              <Field label="Name (HI)">
                <Input value={form.name.hi} onChange={(event) => patch((current) => ({ ...current, name: { ...current.name, hi: event.target.value } }))} />
              </Field>
              <Field label="State">
                <Select value={form.state} onChange={(event) => patch((current) => ({ ...current, state: event.target.value }))}>
                  {SCHEME_STATE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
              <Field label="Benefit type">
                <Select value={form.benefitType} onChange={(event) => patch((current) => ({ ...current, benefitType: event.target.value }))}>
                  {BENEFIT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
              <Field label="Benefit amount">
                <Input type="number" value={form.benefitAmount} onChange={(event) => patch((current) => ({ ...current, benefitAmount: event.target.value }))} />
              </Field>
              <Field label="Source">
                <Select value={form.source} onChange={(event) => patch((current) => ({ ...current, source: event.target.value }))}>
                  {SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2 space-y-2">
                <span className="text-sm font-medium text-slate-100">Categories</span>
                <ToggleSet options={SCHEME_CATEGORY_OPTIONS} selected={form.categories} onToggle={(value) => toggleInArray("categories", value)} />
              </div>
              <Field label="Description (EN)">
                <textarea rows={5} value={form.description.en} onChange={(event) => patch((current) => ({ ...current, description: { ...current.description, en: event.target.value } }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </Field>
              <Field label="Description (HI)">
                <textarea rows={5} value={form.description.hi} onChange={(event) => patch((current) => ({ ...current, description: { ...current.description, hi: event.target.value } }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Eligibility</CardTitle>
              <CardDescription>Checkbox-style arrays and numeric constraints for matcher fields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-100">Occupation</span>
                <ToggleSet options={OCCUPATION_OPTIONS} selected={form.eligibility.occupation} onToggle={(value) => toggleEligibilityArray("occupation", value)} />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-100">Beneficiary type</span>
                <ToggleSet options={BENEFICIARY_TYPE_OPTIONS} selected={form.eligibility.beneficiaryType} onToggle={(value) => toggleEligibilityArray("beneficiaryType", value)} />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-100">Caste</span>
                <ToggleSet options={CASTE_OPTIONS} selected={form.eligibility.caste} onToggle={(value) => toggleEligibilityArray("caste", value)} />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-100">Gender</span>
                <ToggleSet options={GENDER_OPTIONS} selected={form.eligibility.gender} onToggle={(value) => toggleEligibilityArray("gender", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Max annual income"><Input type="number" value={form.eligibility.maxAnnualIncome} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, maxAnnualIncome: event.target.value } }))} /></Field>
                <Field label="Min age"><Input type="number" value={form.eligibility.minAge} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, minAge: event.target.value } }))} /></Field>
                <Field label="Max age"><Input type="number" value={form.eligibility.maxAge} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, maxAge: event.target.value } }))} /></Field>
                <Field label="Land min"><Input type="number" value={form.eligibility.landOwned.min} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, landOwned: { ...current.eligibility.landOwned, min: event.target.value } } }))} /></Field>
                <Field label="Land max"><Input type="number" value={form.eligibility.landOwned.max} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, landOwned: { ...current.eligibility.landOwned, max: event.target.value } } }))} /></Field>
                <Field label="Min disability %"><Input type="number" value={form.eligibility.minDisabilityPct} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, minDisabilityPct: event.target.value } }))} /></Field>
                <Field label="Min education">
                  <Select value={form.eligibility.minEducation} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, minEducation: event.target.value } }))}>
                    <option value="">None</option>
                    {EDUCATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Select>
                </Field>
                <Field label="Must be student">
                  <Select value={form.eligibility.mustBeStudent} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, mustBeStudent: event.target.value } }))}>
                    <option value="">Any</option><option value="true">Yes</option><option value="false">No</option>
                  </Select>
                </Field>
                <Field label="Must have bank account">
                  <Select value={form.eligibility.mustHaveBankAccount} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, mustHaveBankAccount: event.target.value } }))}>
                    <option value="">Any</option><option value="true">Yes</option><option value="false">No</option>
                  </Select>
                </Field>
                <Field label="Must have Aadhaar">
                  <Select value={form.eligibility.mustHaveAadhaar} onChange={(event) => patch((current) => ({ ...current, eligibility: { ...current.eligibility, mustHaveAadhaar: event.target.value } }))}>
                    <option value="">Any</option><option value="true">Yes</option><option value="false">No</option>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader>
              <CardTitle>Apply and metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Apply URL"><Input value={form.applyUrl} onChange={(event) => patch((current) => ({ ...current, applyUrl: event.target.value }))} /></Field>
              <Field label="Apply mode">
                <Select value={form.applyMode} onChange={(event) => patch((current) => ({ ...current, applyMode: event.target.value }))}>
                  {APPLY_MODE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
              <Field label="Documents (one per line)">
                <textarea rows={5} value={form.documentsText} onChange={(event) => patch((current) => ({ ...current, documentsText: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </Field>
              <Field label="Tags (comma separated)">
                <textarea rows={5} value={form.tagsText} onChange={(event) => patch((current) => ({ ...current, tagsText: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </Field>
              <Field label="Office address (EN)"><textarea rows={4} value={form.officeAddress.en} onChange={(event) => patch((current) => ({ ...current, officeAddress: { ...current.officeAddress, en: event.target.value } }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" /></Field>
              <Field label="Office address (HI)"><textarea rows={4} value={form.officeAddress.hi} onChange={(event) => patch((current) => ({ ...current, officeAddress: { ...current.officeAddress, hi: event.target.value } }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" /></Field>
              <Field label="Deadline opens"><Input type="date" value={form.deadline.opens} onChange={(event) => patch((current) => ({ ...current, deadline: { ...current.deadline, opens: event.target.value } }))} /></Field>
              <Field label="Deadline closes"><Input type="date" value={form.deadline.closes} onChange={(event) => patch((current) => ({ ...current, deadline: { ...current.deadline, closes: event.target.value } }))} /></Field>
              <Field label="Recurring deadline"><input type="checkbox" checked={form.deadline.recurring} onChange={(event) => patch((current) => ({ ...current, deadline: { ...current.deadline, recurring: event.target.checked } }))} className="h-5 w-5" /></Field>
              <Field label="Recurring month"><Input type="number" value={form.deadline.recurringMonth} onChange={(event) => patch((current) => ({ ...current, deadline: { ...current.deadline, recurringMonth: event.target.value } }))} /></Field>
              <Field label="Recurring day"><Input type="number" value={form.deadline.recurringDay} onChange={(event) => patch((current) => ({ ...current, deadline: { ...current.deadline, recurringDay: event.target.value } }))} /></Field>
              <Field label="Audit note">
                <textarea rows={4} value={form.auditNote} onChange={(event) => patch((current) => ({ ...current, auditNote: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </Field>
              <Field label="Active"><input type="checkbox" checked={form.active} onChange={(event) => patch((current) => ({ ...current, active: event.target.checked }))} className="h-5 w-5" /></Field>
              <Field label="Verified"><input type="checkbox" checked={form.verified} onChange={(event) => patch((current) => ({ ...current, verified: event.target.checked }))} className="h-5 w-5" /></Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px]">
            <CardHeader><CardTitle>Save</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
              <Button type="submit" className="w-full" disabled={mutation.isPending || schemeQuery.isLoading}>
                {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create scheme"}
              </Button>
            </CardContent>
          </Card>

          {isEdit ? (
            <Card className="rounded-[28px]">
              <CardHeader>
                <CardTitle>Last 3 edits</CardTitle>
                <CardDescription>Audit trail for the recent changes on this scheme.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {historyQuery.isLoading ? <p className="text-sm text-slate-400">Loading history...</p> : null}
                {!historyQuery.isLoading && historyItems.length === 0 ? <p className="text-sm text-slate-400">No edit history found.</p> : null}
                {historyItems.map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-white/8 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="default">{item.action}</Badge>
                      <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{item.note || "No audit note"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </form>
    </section>
  );
}
