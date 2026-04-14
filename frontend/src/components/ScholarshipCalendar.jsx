import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SchemeCountdown from "./SchemeCountdown";

function formatDayHeading(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateValue));
}

export default function ScholarshipCalendar({
  groups,
  onSaveScheme,
  savingSchemeId = "",
  savedSchemeIds = new Set(),
}) {
  const { t } = useTranslation();

  return (
    <div className="deadline-calendar">
      {groups.map((group) => (
        <section key={group.key} className="deadline-calendar__group">
          <div className="deadline-calendar__group-header">
            <div>
              <h2 className="type-h2">
                {group.date ? formatDayHeading(group.date) : t("calendar.alwaysOpen")}
              </h2>
              <p className="type-caption">
                {t("calendar.scholarshipCount", { count: group.items.length })}
              </p>
            </div>
          </div>

          <div className="deadline-calendar__items">
            {group.items.map((item) => (
              <article key={item.schemeId} className="deadline-calendar__item">
                <div className="deadline-calendar__item-top">
                  <div>
                    <h3 className="type-h3">{item.schemeName}</h3>
                    {item.schemeNameHi ? (
                      <p className="type-caption hi" lang="hi">
                        {item.schemeNameHi}
                      </p>
                    ) : null}
                  </div>
                  {item.closesAt ? (
                    <SchemeCountdown date={item.closesAt} variant={item.status} />
                  ) : (
                    <span className="countdown-chip countdown-chip--safe">
                      <span className="type-micro">{t("calendar.alwaysOpen")}</span>
                    </span>
                  )}
                </div>

                <div className="deadline-calendar__item-meta">
                  <span className="scheme-card__badge">
                    {item.scopeLabel}
                  </span>
                  <span className="type-caption">
                    {item.closesAt
                      ? t("calendar.closesOn", { date: item.closesAtLabel })
                      : t("calendar.noClosingDate")}
                  </span>
                </div>

                <div className="deadline-calendar__item-actions">
                  <Link to={`/schemes/${item.schemeId}`} className="detail-card__secondary-button">
                    {t("common.buttons.viewScheme")}
                  </Link>
                  <button
                    type="button"
                    className="detail-card__secondary-button"
                    onClick={() => onSaveScheme?.(item.schemeId)}
                    disabled={savingSchemeId === item.schemeId || savedSchemeIds.has(item.schemeId)}
                  >
                    {savedSchemeIds.has(item.schemeId)
                      ? t("calendar.savedScheme")
                      : savingSchemeId === item.schemeId
                        ? t("calendar.savingScheme")
                        : t("calendar.saveScheme")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
