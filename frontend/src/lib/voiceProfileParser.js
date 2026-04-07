const STATE_MATCHERS = [
  { value: "Central", patterns: ["central", "केंद्रीय", "केन्द्रीय"] },
  { value: "Andhra Pradesh", patterns: ["andhra pradesh", "आंध्र प्रदेश"] },
  { value: "Bihar", patterns: ["bihar", "बिहार"] },
  { value: "Delhi", patterns: ["delhi", "दिल्ली"] },
  { value: "Gujarat", patterns: ["gujarat", "गुजरात"] },
  { value: "Haryana", patterns: ["haryana", "हरियाणा"] },
  { value: "Karnataka", patterns: ["karnataka", "कर्नाटक"] },
  { value: "Kerala", patterns: ["kerala", "केरल"] },
  { value: "Madhya Pradesh", patterns: ["madhya pradesh", "मध्य प्रदेश"] },
  { value: "Maharashtra", patterns: ["maharashtra", "महाराष्ट्र"] },
  { value: "Rajasthan", patterns: ["rajasthan", "राजस्थान"] },
  { value: "Tamil Nadu", patterns: ["tamil nadu", "तमिलनाडु", "तमिल नाडु"] },
  { value: "Telangana", patterns: ["telangana", "तेलंगाना"] },
  { value: "Uttar Pradesh", patterns: ["uttar pradesh", "उत्तर प्रदेश", "यूपी"] },
  { value: "Uttarakhand", patterns: ["uttarakhand", "उत्तराखंड"] },
  { value: "West Bengal", patterns: ["west bengal", "पश्चिम बंगाल", "बंगाल"] },
];

const FIELD_LABELS = {
  state: "state",
  gender: "gender",
  caste: "category",
  ageBand: "age",
  incomeBand: "income",
  landBand: "land size",
};

function normalizeTranscript(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=_`~()?"'[\]-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function parseState(text) {
  return STATE_MATCHERS.find((item) => includesAny(text, item.patterns))?.value || "";
}

function parseGender(text) {
  if (includesAny(text, ["female", "महिला", "औरत", "स्त्री", "लड़की"])) {
    return "female";
  }

  if (includesAny(text, ["male", "पुरुष", "आदमी", "लड़का"])) {
    return "male";
  }

  if (includesAny(text, ["other", "अन्य", "transgender", "ट्रांसजेंडर"])) {
    return "other";
  }

  return "";
}

function parseCategory(text) {
  if (includesAny(text, ["obc", "ओबीसी", "पिछड़ा", "पिछड़ा वर्ग"])) {
    return "obc";
  }

  if (includesAny(text, ["sc", "एससी", "अनुसूचित जाति"])) {
    return "sc";
  }

  if (includesAny(text, ["st", "एसटी", "अनुसूचित जनजाति"])) {
    return "st";
  }

  if (includesAny(text, ["general", "सामान्य", "जनरल"])) {
    return "general";
  }

  return "";
}

function parseIncomeBand(text) {
  const contextualMatch =
    text.match(
      /(?:income|आय|कमाई|family income|पारिवारिक आय)\s*(?:is|है|का|की)?\s*(\d+(?:\.\d+)?)\s*(crore|करोड़|करोड|lakh|लाख|lac|thousand|हजार)?/
    ) ||
    text.match(
      /(\d+(?:\.\d+)?)\s*(crore|करोड़|करोड|lakh|लाख|lac|thousand|हजार)?\s*(?:income|आय|कमाई|family income|पारिवारिक आय)/
    );

  if (!contextualMatch) {
    return "";
  }

  const baseAmount = Number(contextualMatch[1]);
  const unit = contextualMatch[2] || "";

  if (!Number.isFinite(baseAmount)) {
    return "";
  }

  let amount = baseAmount;

  if (["crore", "करोड़", "करोड"].some((pattern) => unit.startsWith(pattern))) {
    amount *= 10000000;
  } else if (["lakh", "लाख", "lac"].some((pattern) => unit.startsWith(pattern))) {
    amount *= 100000;
  } else if (["thousand", "हजार"].some((pattern) => unit.startsWith(pattern))) {
    amount *= 1000;
  }

  if (!amount) {
    return "";
  }

  if (amount < 50000) {
    return "under_50000";
  }

  if (amount <= 120000) {
    return "50000_120000";
  }

  if (amount <= 200000) {
    return "120000_200000";
  }

  if (amount <= 500000) {
    return "200000_500000";
  }

  return "above_500000";
}

function parseAgeBand(text) {
  const ageMatch =
    text.match(/(?:age|उम्र)\s*(?:is|है)?\s*(\d{1,2})/) ||
    text.match(/(\d{1,2})\s*(?:years?|साल|वर्ष)/);

  const age = ageMatch ? Number(ageMatch[1]) : null;
  if (!Number.isFinite(age)) {
    return "";
  }

  if (age < 18) {
    return "under_18";
  }

  if (age <= 35) {
    return "18_35";
  }

  if (age <= 59) {
    return "36_59";
  }

  return "60_plus";
}

function parseLandBand(text) {
  const landMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres|एकड़|एकर)/) ||
    text.match(/(?:land|जमीन)\s*(?:is|है)?\s*(\d+(?:\.\d+)?)/);

  const land = landMatch ? Number(landMatch[1]) : null;
  if (!Number.isFinite(land)) {
    return "";
  }

  if (land <= 0) {
    return "none";
  }

  if (land < 2) {
    return "under_2";
  }

  if (land <= 5) {
    return "2_5";
  }

  if (land <= 10) {
    return "5_10";
  }

  return "above_10";
}

export function parseVoiceProfileTranscript(transcript, availableFields = []) {
  const normalized = normalizeTranscript(transcript);
  const updates = {};
  const matchedFields = [];

  if (!normalized) {
    return { updates, matchedFields, transcript: "" };
  }

  if (availableFields.includes("state")) {
    const state = parseState(normalized);
    if (state) {
      updates.state = state;
      matchedFields.push(FIELD_LABELS.state);
    }
  }

  if (availableFields.includes("gender")) {
    const gender = parseGender(normalized);
    if (gender) {
      updates.gender = gender;
      matchedFields.push(FIELD_LABELS.gender);
    }
  }

  if (availableFields.includes("caste")) {
    const caste = parseCategory(normalized);
    if (caste) {
      updates.caste = caste;
      matchedFields.push(FIELD_LABELS.caste);
    }
  }

  if (availableFields.includes("age")) {
    const ageBand = parseAgeBand(normalized);
    if (ageBand) {
      updates.ageBand = ageBand;
      matchedFields.push(FIELD_LABELS.ageBand);
    }
  }

  if (availableFields.includes("incomeBand")) {
    const incomeBand = parseIncomeBand(normalized);
    if (incomeBand) {
      updates.incomeBand = incomeBand;
      matchedFields.push(FIELD_LABELS.incomeBand);
    }
  }

  if (availableFields.includes("landBand")) {
    const landBand = parseLandBand(normalized);
    if (landBand) {
      updates.landBand = landBand;
      matchedFields.push(FIELD_LABELS.landBand);
    }
  }

  return {
    updates,
    matchedFields,
    transcript: transcript.trim(),
  };
}
