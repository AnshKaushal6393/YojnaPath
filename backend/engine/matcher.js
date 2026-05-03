const { Scheme } = require("../models/Scheme");
const {
  attachDeadlineInfo,
  isSchemeOpenForApplications,
} = require("../services/deadlineTrackerService");

const EDUCATION_LEVELS = [
  "none",
  "5th",
  "8th",
  "10th",
  "12th",
  "graduate",
  "postgraduate",
];

// Frontend profiles intentionally use a smaller set of user types than the
// scheme dataset. Expand them into compatible scheme occupations here so
// matching remains stable without forcing users through a much more detailed
// occupation form.
const OCCUPATION_COMPATIBILITY = {
  farmer: ["farmer", "agricultural_labour", "fisherman"],
  agricultural_labour: ["agricultural_labour", "farmer"],
  fisherman: ["fisherman", "farmer"],
  business: ["self_employed", "shopkeeper", "artisan"],
  self_employed: ["self_employed", "shopkeeper", "artisan", "business"],
  shopkeeper: ["shopkeeper", "self_employed", "business"],
  artisan: ["artisan", "self_employed", "business"],
  worker: ["daily_wage", "migrant_worker", "domestic_worker", "private_job", "agricultural_labour"],
  daily_wage: ["daily_wage", "worker"],
  migrant_worker: ["migrant_worker", "daily_wage", "worker"],
  domestic_worker: ["domestic_worker", "worker"],
  private_job: ["private_job", "worker"],
  government_job: ["government_job"],
  student: ["student"],
  senior: ["retired", "unemployed", "senior"],
  retired: ["retired", "senior"],
  unemployed: ["unemployed", "senior", "disability", "health", "housing", "women"],
  disability: [
    "unemployed",
    "daily_wage",
    "migrant_worker",
    "domestic_worker",
    "private_job",
    "self_employed",
    "shopkeeper",
    "artisan",
    "retired",
    "disability",
  ],
  health: [
    "unemployed",
    "daily_wage",
    "migrant_worker",
    "domestic_worker",
    "private_job",
    "government_job",
    "self_employed",
    "shopkeeper",
    "artisan",
    "retired",
    "health",
  ],
  housing: [
    "unemployed",
    "daily_wage",
    "migrant_worker",
    "domestic_worker",
    "private_job",
    "government_job",
    "self_employed",
    "shopkeeper",
    "artisan",
    "retired",
    "housing",
  ],
  women: [
    "unemployed",
    "daily_wage",
    "migrant_worker",
    "domestic_worker",
    "private_job",
    "government_job",
    "self_employed",
    "shopkeeper",
    "artisan",
    "retired",
    "women",
  ],
};

const EDUCATION_LABELS = {
  none: { en: "no formal education", hi: "कोई औपचारिक शिक्षा नहीं" },
  "5th": { en: "5th pass", hi: "5वीं पास" },
  "8th": { en: "8th pass", hi: "8वीं पास" },
  "10th": { en: "10th pass", hi: "10वीं पास" },
  "12th": { en: "12th pass", hi: "12वीं पास" },
  graduate: { en: "graduate", hi: "स्नातक" },
  postgraduate: { en: "postgraduate", hi: "स्नातकोत्तर" },
};

const STATE_NAMES = {
  central: "Central",
  AN: "Andaman and Nicobar Islands",
  UP: "Uttar Pradesh",
  MP: "Madhya Pradesh",
  RJ: "Rajasthan",
  MH: "Maharashtra",
  BR: "Bihar",
  WB: "West Bengal",
  TN: "Tamil Nadu",
  KA: "Karnataka",
  GJ: "Gujarat",
  AP: "Andhra Pradesh",
  HR: "Haryana",
  PB: "Punjab",
  DL: "Delhi",
  CG: "Chhattisgarh",
  JH: "Jharkhand",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  CH: "Chandigarh",
  DH: "Dadra and Nagar Haveli and Daman and Diu",
  GA: "Goa",
  HP: "Himachal Pradesh",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  PY: "Puducherry",
  SK: "Sikkim",
  TS: "Telangana",
  TR: "Tripura",
  UK: "Uttarakhand",
};

const STATE_NAMES_HI = {
  central: "केंद्रीय",
  AN: "अंडमान और निकोबार द्वीपसमूह",
  UP: "उत्तर प्रदेश",
  MP: "मध्य प्रदेश",
  RJ: "राजस्थान",
  MH: "महाराष्ट्र",
  BR: "बिहार",
  WB: "पश्चिम बंगाल",
  TN: "तमिलनाडु",
  KA: "कर्नाटक",
  GJ: "गुजरात",
  AP: "आंध्र प्रदेश",
  HR: "हरियाणा",
  PB: "पंजाब",
  DL: "दिल्ली",
  CG: "छत्तीसगढ़",
  JH: "झारखंड",
  AR: "अरुणाचल प्रदेश",
  AS: "असम",
  CH: "चंडीगढ़",
  DH: "दादरा और नगर हवेली और दमन और दीव",
  GA: "गोवा",
  HP: "हिमाचल प्रदेश",
  KL: "केरल",
  LA: "लद्दाख",
  LD: "लक्षद्वीप",
  MN: "मणिपुर",
  ML: "मेघालय",
  MZ: "मिजोरम",
  NL: "नागालैंड",
  OD: "ओडिशा",
  PY: "पुदुचेरी",
  SK: "सिक्किम",
  TS: "तेलंगाना",
  TR: "त्रिपुरा",
  UK: "उत्तराखंड",
};

function fmt(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function fmtHi(amount) {
  return `${Number(amount || 0).toLocaleString("en-IN")} रुपये`;
}

function getEducationRank(level) {
  if (!level) {
    return -1;
  }

  return EDUCATION_LEVELS.indexOf(level);
}

function getEducationLabel(level, locale = "en") {
  const labels = EDUCATION_LABELS[level];
  if (!labels) {
    return level ?? "";
  }

  return locale === "hi" ? labels.hi : labels.en;
}

function normalizeOccupationValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function expandOccupationCompatibility(value) {
  const normalized = normalizeOccupationValue(value);
  if (!normalized) {
    return new Set();
  }

  const compatible = OCCUPATION_COMPATIBILITY[normalized] || [normalized];
  return new Set([normalized, ...compatible.map(normalizeOccupationValue)]);
}

function occupationMatches(profileOccupation, schemeOccupations = []) {
  if (!Array.isArray(schemeOccupations) || schemeOccupations.length === 0) {
    return true;
  }

  const profileOptions = expandOccupationCompatibility(profileOccupation);
  if (!profileOptions.size) {
    return false;
  }

  return schemeOccupations.some((schemeOccupation) => {
    const schemeOptions = expandOccupationCompatibility(schemeOccupation);
    return [...schemeOptions].some((option) => profileOptions.has(option));
  });
}

function buildRuleChecks(profile, scheme) {
  const e = scheme?.eligibility ?? {};
  const profileOccupation = profile?.occupation ?? null;
  const profileBeneficiaryType = profile?.beneficiaryType ?? null;
  const profileCaste = profile?.caste ?? null;
  const profileGender = profile?.gender ?? null;
  const profileIncome = profile?.annual_income ?? profile?.income ?? null;
  const profileAge = profile?.age ?? null;
  const profileLandAcres = profile?.landAcres ?? 0;
  const profileDisabilityPct = profile?.disabilityPct ?? 0;
  const profileEducation = profile?.education ?? null;
  const profileIsStudent = profile?.isStudent ?? false;
  const profileHasBankAccount = profile?.hasBankAccount ?? false;
  const profileHasAadhaar = profile?.hasAadhaar ?? false;
  const profileState = profile?.state ?? null;
  const schemeState = scheme?.state ?? null;

  return [
    {
      key: "occupation",
      applies: Boolean(e.occupation?.length),
      passed: occupationMatches(profileOccupation, e.occupation),
    },
    {
      key: "beneficiaryType",
      applies: Boolean(e.beneficiaryType?.length),
      passed: !e.beneficiaryType?.length || e.beneficiaryType.includes(profileBeneficiaryType),
    },
    {
      key: "caste",
      applies: Boolean(e.caste?.length),
      passed: !e.caste?.length || e.caste.includes(profileCaste),
    },
    {
      key: "gender",
      applies: Boolean(e.gender?.length),
      passed: !e.gender?.length || e.gender.includes(profileGender),
    },
    {
      key: "maxAnnualIncome",
      applies: e.maxAnnualIncome != null,
      passed: e.maxAnnualIncome == null || profileIncome <= e.maxAnnualIncome,
    },
    {
      key: "minAge",
      applies: e.minAge != null,
      passed: e.minAge == null || profileAge >= e.minAge,
    },
    {
      key: "maxAge",
      applies: e.maxAge != null,
      passed: e.maxAge == null || profileAge <= e.maxAge,
    },
    {
      key: "landOwned",
      applies: e.landOwned != null,
      passed:
        e.landOwned == null ||
        (
          profileLandAcres >= (e.landOwned.min ?? 0) &&
          profileLandAcres <= (e.landOwned.max ?? Infinity)
        ),
    },
    {
      key: "minDisabilityPct",
      applies: e.minDisabilityPct != null,
      passed: e.minDisabilityPct == null || profileDisabilityPct >= e.minDisabilityPct,
    },
    {
      key: "minEducation",
      applies: e.minEducation != null,
      passed:
        e.minEducation == null ||
        getEducationRank(profileEducation) >= getEducationRank(e.minEducation),
    },
    {
      key: "mustBeStudent",
      applies: e.mustBeStudent != null,
      passed: e.mustBeStudent == null || profileIsStudent === e.mustBeStudent,
    },
    {
      key: "mustHaveBankAccount",
      applies: e.mustHaveBankAccount != null,
      passed:
        e.mustHaveBankAccount == null || profileHasBankAccount === e.mustHaveBankAccount,
    },
    {
      key: "mustHaveAadhaar",
      applies: e.mustHaveAadhaar != null,
      passed: e.mustHaveAadhaar == null || profileHasAadhaar === e.mustHaveAadhaar,
    },
    {
      key: "state",
      applies: Boolean(schemeState && schemeState !== "central"),
      passed: !schemeState || schemeState === "central" || schemeState === profileState,
    },
  ];
}

function matchScheme(profile, scheme) {
  return buildRuleChecks(profile, scheme).every((check) => check.passed);
}

function matchScore(profile, scheme) {
  return buildRuleChecks(profile, scheme).reduce((score, check) => {
    if (!check.applies) {
      return score;
    }

    return check.passed ? score + 1 : score;
  }, 0);
}

function totalCriteria(scheme) {
  return buildRuleChecks({}, scheme).reduce((count, check) => {
    return check.applies ? count + 1 : count;
  }, 0);
}

function getFailedCriteria(profile, scheme) {
  const e = scheme?.eligibility ?? {};
  const profileIncome = profile?.annual_income ?? profile?.income ?? null;
  const fails = [];

  if (e.occupation?.length && !occupationMatches(profile?.occupation, e.occupation)) {
    fails.push({ type: "occupation", required: e.occupation });
  }

  if (e.beneficiaryType?.length && !e.beneficiaryType.includes(profile?.beneficiaryType)) {
    fails.push({ type: "beneficiaryType", required: e.beneficiaryType });
  }

  if (e.caste?.length && !e.caste.includes(profile?.caste)) {
    fails.push({ type: "caste", required: e.caste });
  }

  if (e.gender?.length && !e.gender.includes(profile?.gender)) {
    fails.push({ type: "gender", required: e.gender });
  }

  if (e.maxAnnualIncome != null && profileIncome > e.maxAnnualIncome) {
    fails.push({ type: "maxAnnualIncome", limit: e.maxAnnualIncome });
  }

  if (e.minAge != null && (profile?.age ?? null) < e.minAge) {
    fails.push({ type: "minAge", required: e.minAge });
  }

  if (e.maxAge != null && (profile?.age ?? null) > e.maxAge) {
    fails.push({ type: "maxAge", limit: e.maxAge });
  }

  if (e.landOwned) {
    if ((profile?.landAcres ?? 0) < (e.landOwned.min ?? 0)) {
      fails.push({ type: "landMin", required: e.landOwned.min });
    }

    if ((profile?.landAcres ?? 0) > (e.landOwned.max ?? Infinity)) {
      fails.push({ type: "landMax", limit: e.landOwned.max });
    }
  }

  if (e.minDisabilityPct != null && (profile?.disabilityPct ?? 0) < e.minDisabilityPct) {
    fails.push({ type: "disabilityPct", required: e.minDisabilityPct });
  }

  if (
    e.minEducation != null &&
    getEducationRank(profile?.education ?? null) < getEducationRank(e.minEducation)
  ) {
    fails.push({ type: "minEducation", required: e.minEducation });
  }

  if (e.mustBeStudent != null && (profile?.isStudent ?? false) !== e.mustBeStudent) {
    fails.push({ type: "mustBeStudent", required: e.mustBeStudent });
  }

  if (
    e.mustHaveBankAccount != null &&
    (profile?.hasBankAccount ?? false) !== e.mustHaveBankAccount
  ) {
    fails.push({ type: "mustHaveBankAccount", required: e.mustHaveBankAccount });
  }

  if (e.mustHaveAadhaar != null && (profile?.hasAadhaar ?? false) !== e.mustHaveAadhaar) {
    fails.push({ type: "mustHaveAadhaar", required: e.mustHaveAadhaar });
  }

  if (scheme?.state && scheme.state !== "central" && scheme.state !== profile?.state) {
    fails.push({ type: "state", required: scheme.state });
  }

  return fails;
}

const GAP_MESSAGES = {
  occupation: (profile, fail) => ({
    en: `Only for ${fail.required.join("/")} occupations.`,
    hi: `केवल ${fail.required.join("/")} व्यवसाय श्रेणियों के लिए।`,
  }),
  beneficiaryType: (profile, fail) => ({
    en: `Only for ${fail.required.join("/")} beneficiary groups.`,
    hi: `केवल ${fail.required.join("/")} लाभार्थी समूहों के लिए।`,
  }),
  caste: (profile, fail) => ({
    en: `Only for ${fail.required.join("/")} categories. You are ${(profile?.caste ?? "").toUpperCase()}.`,
    hi: `केवल ${fail.required.join("/")} श्रेणियों के लिए। आप ${(profile?.caste ?? "").toUpperCase()} हैं।`,
  }),
  gender: (profile, fail) => ({
    en: `Only for ${fail.required.join("/")} applicants.`,
    hi: `केवल ${fail.required.join("/")} आवेदकों के लिए।`,
  }),
  maxAnnualIncome: (profile, fail) => ({
    en: `Income is ${fmt(((profile?.annual_income ?? profile?.income) ?? 0) - fail.limit)} above the ${fmt(fail.limit)} limit.`,
    hi: `आय सीमा से ${fmtHi(((profile?.annual_income ?? profile?.income) ?? 0) - fail.limit)} अधिक है।`,
  }),
  minAge: (profile, fail) => ({
    en: `Minimum age is ${fail.required} years. You are ${profile?.age ?? 0}.`,
    hi: `न्यूनतम आयु ${fail.required} वर्ष है। आपकी आयु ${profile?.age ?? 0} वर्ष है।`,
  }),
  maxAge: (profile, fail) => ({
    en: `Age limit is ${fail.limit} years. You are ${profile?.age ?? 0}.`,
    hi: `आयु सीमा ${fail.limit} वर्ष है। आपकी आयु ${profile?.age ?? 0} वर्ष है।`,
  }),
  landMin: (profile, fail) => ({
    en: `At least ${fail.required} acres of land is required. You have ${profile?.landAcres ?? 0} acres.`,
    hi: `कम से कम ${fail.required} एकड़ भूमि चाहिए। आपके पास ${profile?.landAcres ?? 0} एकड़ है।`,
  }),
  landMax: (profile, fail) => ({
    en: `Land limit is ${fail.limit} acres. You have ${profile?.landAcres ?? 0} acres.`,
    hi: `भूमि सीमा ${fail.limit} एकड़ है। आपके पास ${profile?.landAcres ?? 0} एकड़ है।`,
  }),
  disabilityPct: (profile, fail) => ({
    en: `Needs ${fail.required}% disability. Certificate shows ${profile?.disabilityPct ?? 0}%.`,
    hi: `${fail.required}% दिव्यांगता चाहिए। प्रमाणपत्र में ${profile?.disabilityPct ?? 0}% है।`,
  }),
  minEducation: (profile, fail) => ({
    en: `Minimum education is ${getEducationLabel(fail.required, "en")}.`,
    hi: `न्यूनतम शैक्षणिक योग्यता ${getEducationLabel(fail.required, "hi")} है।`,
  }),
  mustBeStudent: (profile, fail) =>
    fail.required
      ? {
          en: "Applicant must currently be a student.",
          hi: "आवेदक वर्तमान में छात्र होना चाहिए।",
        }
      : {
          en: "This scheme is not open to current students.",
          hi: "यह योजना वर्तमान छात्रों के लिए उपलब्ध नहीं है।",
        },
  mustHaveBankAccount: () => ({
    en: "A bank account is required for this scheme.",
    hi: "इस योजना के लिए बैंक खाता जरूरी है।",
  }),
  mustHaveAadhaar: () => ({
    en: "An Aadhaar card is required for this scheme.",
    hi: "इस योजना के लिए आधार कार्ड जरूरी है।",
  }),
  state: (profile, fail) => ({
    en: `Only for ${STATE_NAMES[fail.required] ?? fail.required} residents.`,
    hi: `केवल ${STATE_NAMES_HI[fail.required] ?? fail.required} निवासियों के लिए।`,
  }),
};

function buildGapMessage(profile, fail) {
  const builder = GAP_MESSAGES[fail?.type];

  if (!builder) {
    return {
      en: "You are close, but one eligibility condition is not satisfied.",
      hi: "आप पात्रता के करीब हैं, लेकिन एक शर्त पूरी नहीं हो रही है।",
    };
  }

  return builder(profile, fail);
}

function sortByRelevance(a, b) {
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }

  if (b.totalCriteria !== a.totalCriteria) {
    return b.totalCriteria - a.totalCriteria;
  }

  return (b.benefitAmount ?? 0) - (a.benefitAmount ?? 0);
}

function isStateRelevant(profile, scheme) {
  const schemeState = String(scheme?.state || "").trim();
  const profileState = String(profile?.state || "").trim();

  if (!schemeState || schemeState.toLowerCase() === "central") {
    return true;
  }

  return Boolean(profileState) && schemeState === profileState;
}

function hasBlockingNearMissFailure(fails) {
  return fails.some((fail) =>
    ["state", "occupation", "beneficiaryType", "gender", "caste"].includes(fail?.type)
  );
}

function getNearMisses(profile, allSchemes, matchedIds = new Set(), options = {}) {
  const {
    nearMissGap = 1,
    limitNearMisses = Infinity,
    now = new Date(),
  } = options;

  const nearMisses = allSchemes
    .filter((scheme) => isSchemeOpenForApplications(scheme, now))
    .filter((scheme) => !matchedIds.has(scheme.schemeId))
    .filter((scheme) => isStateRelevant(profile, scheme))
    .map((scheme) => ({
      scheme,
      fails: getFailedCriteria(profile, scheme),
    }))
    .filter(
      ({ fails }) =>
        fails.length > 0 &&
        fails.length <= nearMissGap &&
        !hasBlockingNearMissFailure(fails)
    )
    .map(({ scheme, fails }) =>
      attachDeadlineInfo(
        {
          ...scheme,
          failedCriteria: fails,
          missedCriterion: buildGapMessage(profile, fails[0]),
          totalCriteria: totalCriteria(scheme),
          matchScore: matchScore(profile, scheme),
        },
        now
      )
    );

  nearMisses.sort(sortByRelevance);
  return nearMisses.slice(0, limitNearMisses);
}

async function getMatchingSchemes(profile, options = {}) {
  const {
    schemeModel = Scheme,
    nearMissGap = 1,
    limitMatches = 50,
    limitNearMisses = 10,
  } = options;

  const now = new Date();
  const allSchemes = await schemeModel
    .find({
      active: true,
    })
    .lean();
  const matched = [];
  const matchedIds = new Set();

  for (const scheme of allSchemes) {
    if (!isSchemeOpenForApplications(scheme, now)) {
      continue;
    }

    if (matchScheme(profile, scheme)) {
      matched.push(attachDeadlineInfo({
        ...scheme,
        matchScore: matchScore(profile, scheme),
        totalCriteria: totalCriteria(scheme),
      }, now));
      matchedIds.add(scheme.schemeId);
      continue;
    }
  }

  matched.sort(sortByRelevance);
  const nearMisses = getNearMisses(profile, allSchemes, matchedIds, {
    nearMissGap,
    limitNearMisses,
    now,
  });

  return {
    count: matched.length,
    schemes: matched.slice(0, limitMatches),
    nearMissCount: nearMisses.length,
    nearMisses: nearMisses.slice(0, limitNearMisses),
    totalScanned: allSchemes.length,
  };
}

module.exports = {
  EDUCATION_LEVELS,
  GAP_MESSAGES,
  STATE_NAMES,
  STATE_NAMES_HI,
  buildGapMessage,
  getFailedCriteria,
  getNearMisses,
  getMatchingSchemes,
  matchScore,
  matchScheme,
  occupationMatches,
  totalCriteria,
};
