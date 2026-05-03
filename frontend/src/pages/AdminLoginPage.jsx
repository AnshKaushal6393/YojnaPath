import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { loginAdmin } from "../lib/adminApi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[min(760px,100vw)] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-14">
          <section className="hidden max-w-xl lg:block">
            <BrandLogo variant="light" alt="YojnaPath Admin" className="mb-6" />
            <Badge variant="success" className="mb-5 w-fit uppercase tracking-[0.18em]">
              YojnaPath Admin
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-white xl:text-5xl">
              Control panel access for verified administrators.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
              Sign in with your admin email and password to manage schemes, users, analytics, and operational workflows.
            </p>
          </section>

          <Card className="mx-auto w-full max-w-[440px] rounded-[20px] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.35)] sm:rounded-[24px]">
            <CardHeader className="space-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <BrandLogo variant="light" alt="YojnaPath Admin" compact className="mb-1 lg:hidden" />
              <Badge variant="success" className="w-fit uppercase tracking-[0.18em] lg:hidden">
                YojnaPath Admin
              </Badge>
              <CardTitle className="text-2xl leading-tight sm:text-[28px]">Admin login</CardTitle>
              <CardDescription className="leading-6">
                Email and password only. No phone OTP.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Email</span>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="admin@yojnapath.in"
                    className="h-12 rounded-xl sm:h-11"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Password</span>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter password"
                    className="h-12 rounded-xl sm:h-11"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl text-base sm:h-14"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
