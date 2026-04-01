import { Link } from "react-router-dom";
import SchemeCountdown from "./SchemeCountdown";
import StatusBadge from "./StatusBadge";

function formatDayHeading(dateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateValue));
}

export default function DeadlineCalendar({ groups }) {
  return (
    <div className="deadline-calendar">
      {groups.map((group) => (
        <section key={group.date} className="deadline-calendar__group">
          <div className="deadline-calendar__group-header">
            <div>
              <h2 className="type-h2">{formatDayHeading(group.date)}</h2>
              <p className="type-caption">
                {group.items.length} reminder{group.items.length === 1 ? "" : "s"} scheduled
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
                  <SchemeCountdown date={group.date} />
                </div>

                <div className="deadline-calendar__item-meta">
                  <StatusBadge status={item.status} />
                  <span className="type-caption">Reminder: {item.remindAtLabel}</span>
                </div>

                <div className="deadline-calendar__item-actions">
                  <Link to="/tracker" className="detail-card__secondary-button">
                    Manage in tracker
                  </Link>
                  <Link to={`/schemes/${item.schemeId}`} className="detail-card__secondary-button">
                    View scheme
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
