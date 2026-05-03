import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isAdminAuthenticated } from "../lib/adminAuthStorage";
import { isAuthenticated } from "../utils/auth";

function getRedirectTarget(pathname) {
  if (pathname.startsWith("/admin")) {
    return isAdminAuthenticated() ? "/admin" : "/admin/login";
  }

  return isAuthenticated() ? "/" : "/login";
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = useMemo(() => getRedirectTarget(location.pathname), [location.pathname]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate(redirectTarget, { replace: true });
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, redirectTarget]);

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.2),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] px-4 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-4xl items-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.06] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Route not found
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white">This endpoint does not exist</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            The path <span className="font-mono text-slate-100">{location.pathname}</span> is not a
            valid screen in YojnaPath. We’ll take you back to the right place automatically.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={redirectTarget}
              replace
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
            >
              Go now
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Go back
            </button>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            Redirecting to <span className="font-medium text-slate-200">{redirectTarget}</span> in 5 seconds.
          </p>
        </section>
      </div>
    </main>
  );
}
