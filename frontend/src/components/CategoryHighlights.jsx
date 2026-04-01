import { getCategoryMeta } from "../lib/categoryMeta";

export default function CategoryHighlights({ items = [], onSelect }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="home-section">
      <div className="section-heading">
        <p className="eyebrow">Popular categories</p>
        <h2 className="type-h2">Explore by need</h2>
        <p className="type-caption">
          Colored category tiles help users recognize useful scheme groups quickly.
        </p>
      </div>

      <div className="category-highlights">
        {items.map((item) => {
          const meta = getCategoryMeta(item.key, item.label);

          return (
            <button
              key={item.key}
              type="button"
              className="category-highlight-card"
              onClick={() => onSelect?.(item.key)}
              aria-label={`Explore ${meta.label} schemes`}
            >
              <div className={`category-highlight-card__icon ${meta.tone}`} aria-hidden="true">
                {meta.icon}
              </div>
              <div className="category-highlight-card__copy">
                <p className="type-label">{meta.label}</p>
                <p className="type-caption">{item.count} schemes</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
