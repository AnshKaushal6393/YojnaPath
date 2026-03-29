const ITEMS = [
  { key: "home", label: "Home" },
  { key: "saved", label: "Saved" },
  { key: "docs", label: "Docs" },
  { key: "profile", label: "Profile" },
];

export default function BottomNav({ active = "home" }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-nav__item tap-target ${active === item.key ? "bottom-nav__item--active" : ""}`}
        >
          <span className="type-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
