function getButtonClassName({ variant = "default", size = "default", className = "" } = {}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    outline: "border border-white/10 bg-transparent text-white hover:bg-white/5",
    ghost: "text-slate-200 hover:bg-white/5",
    destructive: "bg-red-500 text-white hover:bg-red-400",
  };

  const sizes = {
    default: "h-11 px-4 py-2",
    sm: "h-9 px-3 text-xs",
    lg: "h-12 px-5",
    icon: "h-10 w-10",
  };

  return [base, variants[variant] || variants.default, sizes[size] || sizes.default, className]
    .filter(Boolean)
    .join(" ");
}

export function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? "span" : "button";
  return <Comp className={getButtonClassName({ className, variant, size })} {...props} />;
}

