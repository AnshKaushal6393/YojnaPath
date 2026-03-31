export default function FilterPills({
  items,
  onSelect,
  ariaLabel = "Category filters",
}) {
  return (
    <div className="filter-pill-row" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`filter-pill fp tap-target ${item.className || ""} ${item.active ? "on" : ""}`.trim()}
          onClick={() => onSelect?.(item.value)}
          aria-pressed={item.active ? "true" : "false"}
        >
          <span className="type-micro">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
