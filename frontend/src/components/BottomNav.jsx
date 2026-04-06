import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function BottomNav({ active = "home" }) {
  const { t } = useTranslation();
  const items = [
    { key: "home", label: t("common.navigation.home"), to: "/" },
    { key: "saved", label: t("common.navigation.saved"), to: "/saved" },
    { key: "calendar", label: t("common.navigation.calendar"), to: "/calendar" },
    { key: "profile", label: t("common.navigation.profile"), to: "/profile" },
  ];

  return (
    <nav className="bottom-nav" aria-label={t("common.navigation.home")}>
      {items.map((item) => (
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
