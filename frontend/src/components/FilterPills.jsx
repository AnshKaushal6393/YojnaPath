export default function FilterPills({ items }) {
  return (
    <div className="filter-pill-row" aria-label="Category filters">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`filter-pill fp tap-target ${item.className || ""} ${item.active ? "on" : ""}`.trim()}
        >
          <span className="type-micro">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
