import { useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

const DEFAULT_SETTINGS = {
  currentPassword: "",
  nextPassword: "",
  confirmPassword: "",
  loginWindowMinutes: "15",
  loginAttempts: "5",
  adminRequestsPerMinute: "60",
  usersPageSize: "25",
  schemesPageSize: "25",
  searchMaxResults: "100",
};

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {hint ? <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-slate-950/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");

  function handleChange(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function handleReset() {
    setForm(DEFAULT_SETTINGS);
    setMessage("Settings reset to the current admin defaults.");
    setMessageTone("info");
  }

  function handleSave(event) {
    event.preventDefault();

    if (form.nextPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword || !form.nextPassword || !form.confirmPassword) {
        setMessage("Fill all password fields before saving a password change.");
        setMessageTone("danger");
        return;
      }

      if (form.nextPassword !== form.confirmPassword) {
        setMessage("New password and confirmation do not match.");
        setMessageTone("danger");
        return;
      }
    }

    setMessage("Settings saved in the admin UI. Wire these fields to the backend settings API next.");
    setMessageTone("success");
  }

  return (
    <section className="space-y-6">
      <Card className="rounded-[28px] overflow-hidden">
        <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
          <Badge variant="success" className="w-fit uppercase tracking-[0.18em]">
            Settings
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">Admin settings</CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Manage password change inputs, rate limit defaults, and max results per query using the same shadcn-style
            admin surface used across the rest of the control center.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Login window" value={`${form.loginWindowMinutes} min`} hint="Rate-limit window for admin login attempts." />
            <MetricCard label="Login attempts" value={form.loginAttempts} hint="Allowed attempts per window before lockout." />
            <MetricCard label="Admin RPM" value={form.adminRequestsPerMinute} hint="Request cap for protected admin APIs." />
            <MetricCard label="Max query size" value={form.searchMaxResults} hint="Upper bound returned by search-heavy admin views." />
          </div>
        </CardContent>
      </Card>

      <form className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]" onSubmit={handleSave}>
        <Card className="rounded-[28px]">
          <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl">Security and limits</CardTitle>
            <CardDescription className="leading-6">
              Password rotation, request throttling, and result sizing belong together because they shape the admin
              operating envelope.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-5 pb-5 sm:px-6 sm:pb-6">
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Password Change</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Admin password</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Current password">
                  <Input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => handleChange("currentPassword", event.target.value)}
                    placeholder="Current password"
                  />
                </Field>
                <Field label="New password">
                  <Input
                    type="password"
                    value={form.nextPassword}
                    onChange={(event) => handleChange("nextPassword", event.target.value)}
                    placeholder="New password"
                  />
                </Field>
                <Field label="Confirm password">
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => handleChange("confirmPassword", event.target.value)}
                    placeholder="Confirm password"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Rate Limits</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Request throttling</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Login window" hint="Duration of each login rate-limit window.">
                  <Select
                    value={form.loginWindowMinutes}
                    onChange={(event) => handleChange("loginWindowMinutes", event.target.value)}
                  >
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                  </Select>
                </Field>

                <Field label="Login attempts" hint="Attempts allowed before temporary lockout.">
                  <Select
                    value={form.loginAttempts}
                    onChange={(event) => handleChange("loginAttempts", event.target.value)}
                  >
                    <option value="3">3 attempts</option>
                    <option value="5">5 attempts</option>
                    <option value="8">8 attempts</option>
                    <option value="10">10 attempts</option>
                  </Select>
                </Field>

                <Field label="Admin requests / minute" hint="Cap for protected admin reads and mutations.">
                  <Input
                    type="number"
                    min="10"
                    step="5"
                    value={form.adminRequestsPerMinute}
                    onChange={(event) => handleChange("adminRequestsPerMinute", event.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Result Limits</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Max results per query</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Users page size">
                  <Select value={form.usersPageSize} onChange={(event) => handleChange("usersPageSize", event.target.value)}>
                    <option value="10">10 rows</option>
                    <option value="25">25 rows</option>
                    <option value="50">50 rows</option>
                    <option value="100">100 rows</option>
                  </Select>
                </Field>
                <Field label="Schemes page size">
                  <Select value={form.schemesPageSize} onChange={(event) => handleChange("schemesPageSize", event.target.value)}>
                    <option value="10">10 rows</option>
                    <option value="25">25 rows</option>
                    <option value="50">50 rows</option>
                    <option value="100">100 rows</option>
                  </Select>
                </Field>
                <Field label="Search max results">
                  <Input
                    type="number"
                    min="25"
                    step="25"
                    value={form.searchMaxResults}
                    onChange={(event) => handleChange("searchMaxResults", event.target.value)}
                  />
                </Field>
              </div>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px]">
            <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
              <CardTitle className="text-xl sm:text-2xl">Save panel</CardTitle>
              <CardDescription className="leading-6">
                This page is production-ready UI scaffolding. The form logic is in place and can be connected to an API
                without redesigning the screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
              {message ? (
                <div
                  className={[
                    "rounded-[20px] px-4 py-3 text-sm leading-6",
                    messageTone === "danger"
                      ? "border border-red-400/30 bg-red-500/10 text-red-100"
                      : messageTone === "info"
                        ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                        : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
                  ].join(" ")}
                >
                  {message}
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                  Make changes, then save or reset.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="submit" className="w-full">
                  Save settings
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="w-full">
                  Reset defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
              <CardTitle className="text-xl sm:text-2xl">What this page covers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="rounded-[18px] bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                Admin password change inputs
              </div>
              <div className="rounded-[18px] bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                Login and admin API rate-limit values
              </div>
              <div className="rounded-[18px] bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                Max results per query for admin list screens
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </section>
  );
}
