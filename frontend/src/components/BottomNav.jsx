import { NavLink } from "react-router-dom";

const ITEMS = [
  { key: "home", label: "Home", to: "/" },
  { key: "saved", label: "Saved", to: "/saved" },
  { key: "calendar", label: "Calendar", to: "/calendar" },
  { key: "profile", label: "Profile", to: "/profile" },
];

export default function BottomNav({ active = "home" }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={`bottom-nav__item tap-target ${active === item.key ? "bottom-nav__item--active" : ""}`}
        >
          <span className="type-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
