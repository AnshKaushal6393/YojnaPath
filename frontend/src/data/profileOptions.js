export const INCOME_BANDS = [
  {
    value: "under_50000",
    labelEn: "Under Rs. 50,000",
    labelHi: "\u20b9 50,000 \u0938\u0947 \u0915\u092e",
  },
  {
    value: "50000_120000",
    labelEn: "Rs. 50k-Rs. 1.2L",
    labelHi: "\u20b9 50 \u0939\u091c\u093e\u0930 - \u20b9 1.2 \u0932\u093e\u0916",
  },
  {
    value: "120000_200000",
    labelEn: "Rs. 1.2L-Rs. 2L",
    labelHi: "\u20b9 1.2 \u0932\u093e\u0916 - \u20b9 2 \u0932\u093e\u0916",
  },
  {
    value: "200000_500000",
    labelEn: "Rs. 2L-Rs. 5L",
    labelHi: "\u20b9 2 \u0932\u093e\u0916 - \u20b9 5 \u0932\u093e\u0916",
  },
  {
    value: "above_500000",
    labelEn: "Above Rs. 5L",
    labelHi: "\u20b9 5 \u0932\u093e\u0916 \u0938\u0947 \u0905\u0927\u093f\u0915",
  },
];

export const LAND_BANDS = [
  { value: "none", labelEn: "None", labelHi: "\u0915\u094b\u0908 \u0928\u0939\u0940\u0902" },
  {
    value: "under_2",
    labelEn: "Under 2 acres",
    labelHi: "2 \u090f\u0915\u0921\u093c \u0938\u0947 \u0915\u092e",
  },
  { value: "2_5", labelEn: "2-5 acres", labelHi: "2-5 \u090f\u0915\u0921\u093c" },
  { value: "5_10", labelEn: "5-10 acres", labelHi: "5-10 \u090f\u0915\u0921\u093c" },
  {
    value: "above_10",
    labelEn: "Above 10 acres",
    labelHi: "10 \u090f\u0915\u0921\u093c \u0938\u0947 \u0905\u0927\u093f\u0915",
  },
];

export const STATE_OPTIONS = [
  "Central",
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const GENDER_OPTIONS = [
  { value: "female", labelEn: "Female", labelHi: "\u092e\u0939\u093f\u0932\u093e" },
  { value: "male", labelEn: "Male", labelHi: "\u092a\u0941\u0930\u0941\u0937" },
  { value: "other", labelEn: "Other", labelHi: "\u0905\u0928\u094d\u092f" },
];

export const USER_TYPE_OPTIONS = [
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
