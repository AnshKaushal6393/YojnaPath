import React from "react";

function getFriendlyErrorMessage(error) {
  const message = error?.message || "";

  if (
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  ) {
    return "A cached app chunk could not be loaded. This is usually fixed by clearing the site cache and reloading.";
  }

  return "Something went wrong while loading this page.";
}

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("Route error boundary caught an error:", error, errorInfo);
    }
  }

  async handleClearCacheAndReload() {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } finally {
      window.location.reload();
    }
  }

  handleRetry() {
    this.setState({ error: null });
    window.location.reload();
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;

      return (
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center">
            <section className="w-full rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                App error
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white">This page could not load</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {getFriendlyErrorMessage(error)}
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Error details</p>
                <p className="mt-2 break-words text-slate-400">
                  {error?.message || "Unknown error"}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => this.handleClearCacheAndReload()}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Clear cache and reload
                </button>
                <button
                  type="button"
                  onClick={() => this.handleRetry()}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Reload page
                </button>
              </div>
            </section>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
