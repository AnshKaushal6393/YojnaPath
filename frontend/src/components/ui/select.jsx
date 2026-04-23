export function Select({ className = "", ...props }) {
  return (
    <select
      className={[
        "flex h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

