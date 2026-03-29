export default function UrgencyBanner({ text }) {
  return (
    <div className="urgency-banner state-warning" role="status" aria-live="polite">
      <span className="urg-dot" aria-hidden="true" />
      <span className="type-caption">{text}</span>
    </div>
  );
}
