import { USER_TYPE_OPTIONS } from "../data/profileOptions";

export default function UserTypeSelector({ selectedUserType, onSelect }) {
  return (
    <section className="onboard-card">
      <div className="section-heading">
        <h1 className="type-h1">Choose your user type</h1>
        <p className="type-caption hi" lang="hi">
          {
            "\u0905\u092a\u0928\u0947 \u0932\u093f\u090f \u0938\u092c\u0938\u0947 \u0909\u092a\u092f\u0941\u0915\u094d\u0924 \u0936\u094d\u0930\u0947\u0923\u0940 \u091a\u0941\u0928\u0947\u0902 \u0924\u093e\u0915\u093f \u0939\u092e \u0938\u093f\u0930\u094d\u092b \u0909\u0938\u0940 \u0924\u0930\u0939 \u0915\u0947 \u092a\u094d\u0930\u0936\u094d\u0928 \u0926\u093f\u0916\u093e\u090f\u0902\u0964"
          }
        </p>
      </div>

      <div className="onboard-user-grid">
        {USER_TYPE_OPTIONS.map((item) => {
          const isActive = selectedUserType === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={`onboard-user-card tap-target ${isActive ? "onboard-user-card--active" : ""}`}
              onClick={() => onSelect(item.key)}
            >
              <span
                className={`user-type-card__icon ${item.className}`}
                role="img"
                aria-label={item.iconLabel}
              >
                {item.icon}
              </span>
              <span className="type-label">{item.label}</span>
              <span className="type-caption hi" lang="hi">
                {item.labelHi}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
