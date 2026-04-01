const STATUS_META = {
  applied: { label: "Applied", className: "status-badge status-badge--applied" },
  pending: { label: "Pending", className: "status-badge status-badge--pending" },
  approved: { label: "Approved", className: "status-badge status-badge--approved" },
  rejected: { label: "Rejected", className: "status-badge status-badge--rejected" },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.applied;
  return (
    <span className={meta.className}>
      <span className="type-micro">{meta.label}</span>
    </span>
  );
}
