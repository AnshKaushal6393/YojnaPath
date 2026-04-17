import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../lib/adminApi";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await loginAdmin(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Could not sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[420px] items-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Super Admin
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-white">Admin sign in</h1>
            <p className="text-sm leading-6 text-slate-300">
              Use your email and password to access the YojnaPath control panel.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="admin@yojnapath.in"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
