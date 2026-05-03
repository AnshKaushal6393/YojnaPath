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

  return <img src={src} alt={alt} className={`${widthClass} ${className}`.trim()} loading="eager" decoding="async" />;
}
