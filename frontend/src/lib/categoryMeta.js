export const CATEGORY_META = {
  agriculture: {
    icon: "\uD83C\uDF3E",
    tone: "category-agriculture",
    label: "Agriculture",
  },
  health: {
    icon: "\uD83E\uDE7A",
    tone: "category-health",
    label: "Health",
  },
  finance: {
    icon: "\uD83D\uDCB0",
    tone: "category-finance",
    label: "Finance",
  },
  housing: {
    icon: "\uD83C\uDFE0",
    tone: "category-housing",
    label: "Housing",
  },
  women: {
    icon: "\uD83D\uDC69",
    tone: "category-women",
    label: "Women",
  },
  education: {
    icon: "\uD83C\uDF93",
    tone: "category-health",
    label: "Education",
  },
  labour: {
    icon: "\uD83D\uDEE0\uFE0F",
    tone: "category-labour",
    label: "Labour",
  },
  disability: {
    icon: "\u267F",
    tone: "state-info",
    label: "Disability",
  },
  senior: {
    icon: "\uD83D\uDC74",
    tone: "state-warning",
    label: "Senior",
  },
  skill_and_employment: {
    icon: "\uD83D\uDCBC",
    tone: "category-finance",
    label: "Skill & jobs",
  },
};

export function getCategoryMeta(categoryKey, fallbackLabel = "Scheme") {
  return (
    CATEGORY_META[categoryKey] || {
      icon: "\uD83D\uDCC4",
      tone: "surface-structural",
      label: fallbackLabel,
    }
  );
}
