import { useNavigate } from "react-router-dom";

const USER_TYPES = [
  {
    key: "farmer",
    label: "Farmer",
    labelHi: "\u0915\u093f\u0938\u093e\u0928",
    iconLabel: "\u0915\u093f\u0938\u093e\u0928 - Farmer user type",
    icon: "\u{1F33E}",
    className: "category-agriculture",
  },
  {
    key: "women",
    label: "Women",
    labelHi: "\u092e\u0939\u093f\u0932\u093e",
    iconLabel: "\u092e\u0939\u093f\u0932\u093e - Women user type",
    icon: "\u{1F469}",
    className: "category-women",
  },
  {
    key: "student",
    label: "Student",
    labelHi: "\u0935\u093f\u0926\u094d\u092f\u093e\u0930\u094d\u0925\u0940",
    iconLabel: "\u0935\u093f\u0926\u094d\u092f\u093e\u0930\u094d\u0925\u0940 - Student user type",
    icon: "\u{1F393}",
    className: "category-education",
  },
  {
    key: "worker",
    label: "Worker",
    labelHi: "\u0936\u094d\u0930\u092e\u093f\u0915",
    iconLabel: "\u0936\u094d\u0930\u092e\u093f\u0915 - Worker user type",
    icon: "\u{1F6E0}",
    className: "category-finance",
  },
  {
    key: "health",
    label: "Health",
    labelHi: "\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f",
    iconLabel: "\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f - Health support user type",
    icon: "\u2695",
    className: "category-health",
  },
  {
    key: "housing",
    label: "Housing",
    labelHi: "\u0906\u0935\u093e\u0938",
    iconLabel: "\u0906\u0935\u093e\u0938 - Housing support user type",
    icon: "\u{1F3E0}",
    className: "category-housing",
  },
  {
    key: "senior",
    label: "Senior",
    labelHi: "\u0935\u0930\u093f\u0937\u094d\u0920",
    iconLabel: "\u0935\u0930\u093f\u0937\u094d\u0920 - Senior citizen user type",
    icon: "\u{1F474}",
    className: "state-warning",
  },
  {
    key: "disability",
    label: "Disability",
    labelHi: "\u0926\u093f\u0935\u094d\u092f\u093e\u0902\u0917",
    iconLabel: "\u0926\u093f\u0935\u094d\u092f\u093e\u0902\u0917 - Disability support user type",
    icon: "\u267F",
    className: "state-info",
  },
];

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
        {USER_TYPES.map((item) => (
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
