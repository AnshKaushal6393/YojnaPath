const USER_TYPES = [
  {
    key: "farmer",
    label: "Farmer",
    labelHi: "किसान",
    iconLabel: "किसान - Farmer user type",
    token: "KR",
    className: "category-agriculture",
  },
  {
    key: "woman",
    label: "Women",
    labelHi: "महिला",
    iconLabel: "महिला - Women user type",
    token: "MH",
    className: "category-women",
  },
  {
    key: "student",
    label: "Student",
    labelHi: "विद्यार्थी",
    iconLabel: "विद्यार्थी - Student user type",
    token: "ST",
    className: "category-education",
  },
  {
    key: "worker",
    label: "Worker",
    labelHi: "श्रमिक",
    iconLabel: "श्रमिक - Worker user type",
    token: "SR",
    className: "category-finance",
  },
  {
    key: "health",
    label: "Health",
    labelHi: "स्वास्थ्य",
    iconLabel: "स्वास्थ्य - Health support user type",
    token: "SW",
    className: "category-health",
  },
  {
    key: "housing",
    label: "Housing",
    labelHi: "आवास",
    iconLabel: "आवास - Housing support user type",
    token: "AW",
    className: "category-housing",
  },
];

export default function UserTypeGrid() {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2 className="type-h2">Choose your user type</h2>
        <p className="type-caption hi" lang="hi">
          पहले अपनी स्थिति चुनें ताकि सही योजनाएं जल्दी मिलें।
        </p>
      </div>

      <div className="user-type-grid">
        {USER_TYPES.map((item) => (
          <button key={item.key} type="button" className="user-type-card tap-target">
            <span className={`user-type-card__icon ${item.className}`} role="img" aria-label={item.iconLabel}>
              {item.token}
            </span>
            <span className="type-h3">{item.label}</span>
            <span className="type-caption hi" lang="hi">
              {item.labelHi}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
