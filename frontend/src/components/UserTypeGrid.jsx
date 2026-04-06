import { useNavigate } from "react-router-dom";
import { USER_TYPE_OPTIONS } from "../data/profileOptions";

export default function UserTypeGrid() {
  const navigate = useNavigate();

  return (
    <section className="home-section">
      <div className="section-heading">
        <h2 className="type-h2">Choose your user type</h2>
        <p className="type-caption hi" lang="hi">
          {
            "\u092a\u0939\u0932\u0947 \u0905\u092a\u0928\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u091a\u0941\u0928\u0947\u0902 \u0924\u093e\u0915\u093f \u0938\u0939\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u091c\u0932\u094d\u0926\u0940 \u092e\u093f\u0932\u0947\u0902\u0964"
          }
        </p>
      </div>

      <div className="user-type-grid">
        {USER_TYPE_OPTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="user-type-card tap-target"
            onClick={() => navigate("/onboard")}
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
        ))}
      </div>
    </section>
  );
}
