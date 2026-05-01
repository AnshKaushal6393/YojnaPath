const mongoose = require("mongoose");

const STATE_CODES = [
  "central",
  "AN",
  "UP",
  "MP",
  "RJ",
  "MH",
  "BR",
  "WB",
  "TN",
  "KA",
  "GJ",
  "AP",
  "HR",
  "PB",
  "DL",
  "CG",
  "JH",
  "AR",
  "AS",
  "CH",
  "DH",
  "GA",
  "HP",
  "KL",
  "LA",
  "LD",
  "MN",
  "ML",
  "MZ",
  "NL",
  "OD",
  "PY",
  "SK",
  "TS",
  "TR",
  "UK",
];

const SCHEME_CATEGORIES = [
  "agriculture",
  "health",
  "finance",
  "housing",
  "women",
  "education",
  "disability",
  "senior",
  "skill_and_employment",
  "labour",
  "youth",
  "minority",
  "entrepreneur",
  "sc_st_obc",
  "environment",
  "food_and_nutrition",
];

const OCCUPATION_TYPES = [
  "farmer",
  "agricultural_labour",
  "fisherman",
  "self_employed",
  "domestic_worker",
  "private_job",
  "government_job",
  "shopkeeper",
  "artisan",
  "daily_wage",
  "student",
  "unemployed",
  "retired",
  "migrant_worker",
];

const BENEFICIARY_TYPES = [
  "bpl",
  "apl",
  "antyodaya",
  "ews",
  "disabled",
  "widow",
  "orphan",
  "transgender",
  "minority",
  "nri",
];

const CASTES = ["sc", "st", "obc", "general"];
const GENDERS = ["male", "female", "other"];
const EDUCATION_LEVELS = [
  "none",
  "5th",
  "8th",
  "10th",
  "12th",
  "graduate",
  "postgraduate",
];

const BENEFIT_TYPES = [
  "cash_transfer",
  "loan",
  "insurance",
  "subsidy",
  "service",
  "equipment",
  "scholarship",
];

const APPLY_MODES = ["online", "offline", "both"];
const SOURCES = ["myscheme", "datagov", "manual"];

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    hi: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const numericRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0, default: 0 },
    max: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const eligibilitySchema = new mongoose.Schema(
  {
    occupation: {
      type: [String],
      enum: OCCUPATION_TYPES,
      default: [],
    },
    beneficiaryType: {
      type: [String],
      enum: BENEFICIARY_TYPES,
      default: [],
    },
    caste: {
      type: [String],
      enum: CASTES,
      default: [],
    },
    gender: {
      type: [String],
      enum: GENDERS,
      default: [],
    },
    maxAnnualIncome: {
      type: Number,
      default: null,
      min: 0,
    },
    minAge: {
      type: Number,
      default: null,
      min: 0,
    },
    maxAge: {
      type: Number,
      default: null,
      min: 0,
    },
    landOwned: {
      type: numericRangeSchema,
      default: null,
    },
    minDisabilityPct: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    minEducation: {
      type: String,
      enum: EDUCATION_LEVELS,
      default: null,
    },
    mustBeStudent: {
      type: Boolean,
      default: null,
    },
    mustHaveBankAccount: {
      type: Boolean,
      default: null,
    },
    mustHaveAadhaar: {
      type: Boolean,
      default: null,
    },
  },
  { _id: false }
);

const deadlineSchema = new mongoose.Schema(
  {
    opens: { type: Date, default: null },
    closes: { type: Date, default: null },
    recurring: { type: Boolean, required: true, default: false },
    recurringMonth: {
      type: Number,
      default: null,
      min: 1,
      max: 12,
    },
    recurringDay: {
      type: Number,
      default: null,
      min: 1,
      max: 31,
    },
  },
  { _id: false }
);

const schemeSchema = new mongoose.Schema(
  {
    schemeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: localizedTextSchema,
      required: true,
    },
    description: {
      type: localizedTextSchema,
      default: null,
    },
    ministry: {
      type: String,
      required: true,
      trim: true,
    },
    categories: {
      type: [String],
      required: true,
      enum: SCHEME_CATEGORIES,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "A scheme must have at least one category.",
      },
    },
    state: {
      type: String,
      required: true,
      enum: STATE_CODES,
    },
    eligibility: {
      type: eligibilitySchema,
      required: true,
      default: () => ({}),
    },
    benefitAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    benefitType: {
      type: String,
      required: true,
      enum: BENEFIT_TYPES,
    },
    documents: {
      type: [localizedTextSchema],
      default: [],
    },
    applyUrl: {
      type: String,
      required: true,
      trim: true,
    },
    originalApplyUrl: {
      type: String,
      default: null,
      trim: true,
    },
    applyUrlStatus: {
      type: String,
      enum: ["unknown", "ok", "redirected", "blocked", "dead", "fallback"],
      default: "unknown",
    },
    applyUrlCheckedAt: {
      type: Date,
      default: null,
    },
    applyUrlFinal: {
      type: String,
      default: null,
      trim: true,
    },
    applyUrlError: {
      type: String,
      default: null,
      trim: true,
    },
    urlStatus: {
      type: String,
      enum: ["unknown", "live", "dead"],
      default: "unknown",
    },
    urlCheckedAt: {
      type: Date,
      default: null,
    },
    urlHttpStatus: {
      type: Number,
      default: null,
    },
    applyUrlRedirect: {
      type: String,
      default: null,
      trim: true,
    },
    applyMode: {
      type: String,
      required: true,
      enum: APPLY_MODES,
    },
    officeAddress: {
      type: localizedTextSchema,
      default: null,
    },
    deadline: {
      type: deadlineSchema,
      required: true,
      default: () => ({}),
    },
    tags: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
    },
    source: {
      type: String,
      required: true,
      enum: SOURCES,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

schemeSchema.index({ state: 1, categories: 1, active: 1 });
schemeSchema.index({ "eligibility.occupation": 1 });
schemeSchema.index({ "eligibility.beneficiaryType": 1 });
schemeSchema.index({ "eligibility.caste": 1 });
schemeSchema.index({ "eligibility.maxAnnualIncome": 1 });
schemeSchema.index({ ministry: 1 });
schemeSchema.index({ verified: 1, active: 1 });
schemeSchema.index({ "deadline.closes": 1 });
schemeSchema.index(
  { "name.en": "text", "name.hi": "text", tags: "text" },
  {
    name: "scheme_text_search",
    weights: { "name.en": 10, "name.hi": 10, tags: 3 },
  }
);

schemeSchema.pre("validate", function validateEligibilityRanges() {
  const e = this.eligibility;

  if (e) {
    if (e.minAge !== null && e.maxAge !== null && e.minAge > e.maxAge) {
      throw new Error("eligibility.minAge cannot be greater than eligibility.maxAge");
    }

    if (e.landOwned && e.landOwned.min > e.landOwned.max) {
      throw new Error("eligibility.landOwned.min cannot be greater than landOwned.max");
    }
  }
});

schemeSchema.pre("validate", function validateDeadline() {
  const d = this.deadline;

  if (!d) {
    return;
  }

  if (d.opens && d.closes && d.opens > d.closes) {
    throw new Error("deadline.opens cannot be after deadline.closes");
  }

  if (d.recurring && (d.recurringMonth === null || d.recurringDay === null)) {
    throw new Error("Recurring deadlines require both recurringMonth and recurringDay");
  }
});

schemeSchema.pre("validate", function validateOfflineAddress() {
  if ((this.applyMode === "offline" || this.applyMode === "both") && !this.officeAddress) {
    console.warn(
      `[scheme] ${this.schemeId}: applyMode is '${this.applyMode}' but officeAddress is empty`
    );
  }
});

module.exports = {
  Scheme: mongoose.models.Scheme || mongoose.model("Scheme", schemeSchema),
  STATE_CODES,
  SCHEME_CATEGORIES,
  OCCUPATION_TYPES,
  BENEFICIARY_TYPES,
  CASTES,
  GENDERS,
  EDUCATION_LEVELS,
  BENEFIT_TYPES,
  APPLY_MODES,
  SOURCES,
};
