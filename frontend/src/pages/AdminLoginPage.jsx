import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[420px] items-center">
        <Card className="w-full p-0 shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
          <CardHeader className="space-y-3 px-6 pt-6">
            <Badge variant="success" className="w-fit uppercase tracking-[0.18em]">
              Super Admin
            </Badge>
            <CardTitle className="text-[28px] leading-tight">Admin sign in</CardTitle>
            <CardDescription>
              Use your email and password to access the YojnaPath control panel.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
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
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full text-base"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
