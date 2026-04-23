export function Badge({ className = "", variant = "default", ...props }) {
  const variants = {
    default: "border border-white/10 bg-white/5 text-slate-200",
    success: "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    warning: "border border-amber-400/20 bg-amber-400/10 text-amber-100",
    danger: "border border-red-400/20 bg-red-400/10 text-red-100",
    info: "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]",
        variants[variant] || variants.default,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

