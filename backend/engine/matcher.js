const { Scheme } = require("../models/Scheme");

const EDUCATION_LEVELS = [
  "none",
  "5th",
  "8th",
  "10th",
  "12th",
  "graduate",
  "postgraduate",
];

const GAP_MESSAGE_BUILDERS = {
  occupation: (profile, scheme) => {
    const allowed = scheme?.eligibility?.occupation ?? [];
    return {
      en: `This scheme is only for ${allowed.join(", ")} occupations.`,
      hi: `यह योजना केवल ${allowed.join(", ")} व्यवसाय श्रेणियों के लिए है।`,
    };
  },
  beneficiaryType: (profile, scheme) => {
    const allowed = scheme?.eligibility?.beneficiaryType ?? [];
    return {
      en: `This scheme is only for ${allowed.join(", ")} beneficiary groups.`,
      hi: `यह योजना केवल ${allowed.join(", ")} लाभार्थी समूहों के लिए है।`,
    };
  },
  caste: (profile, scheme) => {
    const allowed = scheme?.eligibility?.caste ?? [];
    return {
      en: `This scheme is limited to ${allowed.join(", ")} caste categories.`,
      hi: `यह योजना केवल ${allowed.join(", ")} जाति श्रेणियों के लिए उपलब्ध है।`,
    };
  },
  gender: (profile, scheme) => {
    const allowed = scheme?.eligibility?.gender ?? [];
    return {
      en: `This scheme is meant for ${allowed.join(", ")} applicants only.`,
      hi: `यह योजना केवल ${allowed.join(", ")} आवेदकों के लिए है।`,
    };
  },
  maxAnnualIncome: (profile, scheme) => {
    const limit = scheme?.eligibility?.maxAnnualIncome ?? 0;
    return {
      en: `Annual income must be Rs. ${limit.toLocaleString("en-IN")} or below.`,
      hi: `वार्षिक आय Rs. ${limit.toLocaleString("en-IN")} या उससे कम होनी चाहिए।`,
    };
  },
  minAge: (profile, scheme) => {
    const minAge = scheme?.eligibility?.minAge ?? 0;
    return {
      en: `Applicant must be at least ${minAge} years old.`,
      hi: `आवेदक की आयु कम से कम ${minAge} वर्ष होनी चाहिए।`,
    };
  },
  maxAge: (profile, scheme) => {
    const maxAge = scheme?.eligibility?.maxAge ?? 0;
    return {
      en: `Applicant age must be ${maxAge} years or less.`,
      hi: `आवेदक की आयु ${maxAge} वर्ष या उससे कम होनी चाहिए।`,
    };
  },
  landOwned: (profile, scheme) => {
    const min = scheme?.eligibility?.landOwned?.min ?? 0;
    const max = scheme?.eligibility?.landOwned?.max;
    const maxTextEn = max == null ? "any" : `${max}`;
    const maxTextHi = max == null ? "कोई भी" : `${max}`;
    return {
      en: `Land ownership must be between ${min} and ${maxTextEn} acres.`,
      hi: `भूमि स्वामित्व ${min} से ${maxTextHi} एकड़ के बीच होना चाहिए।`,
    };
  },
  minDisabilityPct: (profile, scheme) => {
    const minPct = scheme?.eligibility?.minDisabilityPct ?? 0;
    return {
      en: `Disability certificate must show at least ${minPct}% disability.`,
      hi: `दिव्यांगता प्रमाणपत्र में कम से कम ${minPct}% दिव्यांगता दर्ज होनी चाहिए।`,
    };
  },
  minEducation: (profile, scheme) => {
    const minEducation = scheme?.eligibility?.minEducation ?? "";
    return {
      en: `Minimum education required is ${minEducation}.`,
      hi: `न्यूनतम शैक्षणिक योग्यता ${minEducation} होनी चाहिए।`,
    };
  },
  mustBeStudent: (profile, scheme) => {
    const required = scheme?.eligibility?.mustBeStudent;
    return required
      ? {
          en: "Applicant must currently be a student.",
          hi: "आवेदक वर्तमान में छात्र होना चाहिए।",
        }
      : {
          en: "This scheme is not open to current students.",
          hi: "यह योजना वर्तमान छात्रों के लिए उपलब्ध नहीं है।",
        };
  },
  mustHaveBankAccount: () => ({
    en: "A bank account is required to receive this scheme benefit.",
    hi: "इस योजना का लाभ लेने के लिए बैंक खाता होना जरूरी है।",
  }),
  mustHaveAadhaar: () => ({
    en: "An Aadhaar card is required for this scheme.",
    hi: "इस योजना के लिए आधार कार्ड जरूरी है।",
  }),
  state: (profile, scheme) => {
    const state = scheme?.state ?? "";
    return {
      en: `This scheme is only available in ${state}.`,
      hi: `यह योजना केवल ${state} राज्य में उपलब्ध है।`,
    };
  },
};

function getEducationRank(level) {
  if (!level) {
    return -1;
  }

  return EDUCATION_LEVELS.indexOf(level);
}

function buildRuleChecks(profile, scheme) {
  const e = scheme?.eligibility ?? {};
  const profileOccupation = profile?.occupation ?? null;
  const profileBeneficiaryType = profile?.beneficiaryType ?? null;
  const profileCaste = profile?.caste ?? null;
  const profileGender = profile?.gender ?? null;
  const profileIncome = profile?.income ?? null;
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
      passed: !e.occupation?.length || e.occupation.includes(profileOccupation),
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

function failedCriteria(profile, scheme) {
  return buildRuleChecks(profile, scheme)
    .filter((check) => check.applies && !check.passed)
    .map((check) => check.key);
}

function buildGapMessage(profile, criterionKey, scheme) {
  const builder = GAP_MESSAGE_BUILDERS[criterionKey];

  if (!builder) {
    return {
      en: "You are close, but one eligibility condition is not satisfied.",
      hi: "आप पात्रता के करीब हैं, लेकिन एक शर्त पूरी नहीं हो रही है।",
    };
  }

  return builder(profile, scheme);
}

function sortByRelevance(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  if (b.totalCriteria !== a.totalCriteria) {
    return b.totalCriteria - a.totalCriteria;
  }

  return (b.scheme?.benefitAmount ?? 0) - (a.scheme?.benefitAmount ?? 0);
}

async function getMatchingSchemes(profile, options = {}) {
  const {
    schemeModel = Scheme,
    nearMissGap = 1,
    limitMatches = null,
    limitNearMisses = null,
  } = options;

  const schemes = await schemeModel
    .find({ active: true })
    .lean();

  const matches = [];
  const nearMisses = [];

  for (const scheme of schemes) {
    const eligible = matchScheme(profile, scheme);
    const score = matchScore(profile, scheme);
    const criteriaCount = totalCriteria(scheme);
    const unmetCriteria = failedCriteria(profile, scheme);
    const result = {
      scheme,
      eligible,
      score,
      totalCriteria: criteriaCount,
      unmetCriteria,
    };

    if (eligible) {
      matches.push(result);
      continue;
    }

    if (
      criteriaCount > 0 &&
      unmetCriteria.length > 0 &&
      unmetCriteria.length <= nearMissGap
    ) {
      nearMisses.push(result);
    }
  }

  matches.sort(sortByRelevance);
  nearMisses.sort(sortByRelevance);

  return {
    profile,
    totals: {
      activeSchemesChecked: schemes.length,
      matched: matches.length,
      nearMisses: nearMisses.length,
    },
    matches: limitMatches == null ? matches : matches.slice(0, limitMatches),
    nearMisses:
      limitNearMisses == null ? nearMisses : nearMisses.slice(0, limitNearMisses),
  };
}

module.exports = {
  EDUCATION_LEVELS,
  GAP_MESSAGE_BUILDERS,
  buildGapMessage,
  failedCriteria,
  getMatchingSchemes,
  matchScore,
  matchScheme,
  totalCriteria,
};
