const STEP_ITEMS = [
  {
    icon: "\uD83D\uDCDD",
    label: "Fill profile",
    labelHi: "\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u092D\u0930\u0947\u0902",
  },
  {
    icon: "\uD83D\uDD0D",
    label: "We match",
    labelHi: "\u092E\u093F\u0932\u093E\u0928 \u0939\u094B\u0917\u093E",
  },
  {
    icon: "\u2705",
    label: "Apply now",
    labelHi: "\u0906\u0935\u0947\u0926\u0928 \u0915\u0930\u0947\u0902",
  },
];

export default function OnboardingSteps() {
  return (
    <section className="onboard-steps-card">
      <div className="section-heading">
        <p className="eyebrow">How it works</p>
        <h2 className="type-h2">Three quick steps</h2>
        <p className="type-caption">A simple path from profile to matching to application.</p>
      </div>

      <div className="onboard-steps" aria-label="Three step onboarding flow">
        {STEP_ITEMS.map((step, index) => (
          <div key={step.label} className="onboard-step">
            <div className="onboard-step__bubble" aria-hidden="true">
              {step.icon}
            </div>
            <p className="type-label">{step.label}</p>
            <p className="type-caption hi" lang="hi">
              {step.labelHi}
            </p>
            {index < STEP_ITEMS.length - 1 ? (
              <span className="onboard-step__arrow" aria-hidden="true">
                {"\u2192"}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
