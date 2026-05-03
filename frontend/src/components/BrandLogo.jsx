export default function BrandLogo({
  variant = "light",
  className = "",
  alt = "YojnaPath logo",
  compact = false,
}) {
  const src =
    variant === "dark"
      ? "/yojnapath-logo-dark.svg"
      : variant === "gov"
        ? "/yojnapath-logo-gov.svg"
        : "/yojnapath-logo-light.svg";

  const widthClass = compact ? "h-10 w-auto" : "h-12 w-auto sm:h-14";
  const intrinsicSize =
    variant === "gov"
      ? { width: 380, height: 84 }
      : { width: 396, height: 72 };

  return (
    <img
      src={src}
      alt={alt}
      width={intrinsicSize.width}
      height={intrinsicSize.height}
      className={`${widthClass} ${className}`.trim()}
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  );
}
