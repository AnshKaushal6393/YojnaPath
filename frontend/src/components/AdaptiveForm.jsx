import {
  CASTE_OPTIONS,
  GENDER_OPTIONS,
  INCOME_BANDS,
  LAND_BANDS,
  STATE_OPTIONS,
} from "../data/profileOptions";
import VoiceInputButton from "./VoiceInputButton";

const USER_TYPE_CONFIG = {
  farmer: ["state", "gender", "caste", "age", "incomeBand", "landBand", "notes"],
  women: ["state", "caste", "age", "incomeBand", "notes"],
  student: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  worker: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  health: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  housing: ["state", "caste", "incomeBand", "notes"],
  senior: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  disability: ["state", "gender", "caste", "age", "incomeBand", "notes"],
};

const AGE_BANDS = [
  { value: "under_18", labelEn: "Under 18", labelHi: "18 से कम" },
  { value: "18_35", labelEn: "18 - 35", labelHi: "18 - 35" },
  { value: "36_59", labelEn: "36 - 59", labelHi: "36 - 59" },
  { value: "60_plus", labelEn: "60+", labelHi: "60+" },
];

function FieldLabel({ children }) {
  return <label className="type-label">{children}</label>;
}

function getIncomeLabel(selectedUserType) {
  if (selectedUserType === "student") {
    return "Family income / पारिवारिक आय";
  }

  return "Annual income / वार्षिक आय";
}

export default function AdaptiveForm({
  selectedUserType,
  formState,
  onChange,
  isSubmitting,
  submitLabel = "Continue to matching",
  title = "Adaptive profile form",
  subtitle = "केवल उन्हीं प्रश्न दिखेंगे जो आपके लिए जरूरी हैं।",
  formId = "onboard-profile-form",
}) {
  const activeFields = USER_TYPE_CONFIG[selectedUserType] || [];

  function updateField(field, value) {
    onChange((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <section className="onboard-card">
      <div className="section-heading">
        <h2 className="type-h2">{title}</h2>
        <p className="type-caption hi" lang="hi">
          {subtitle}
        </p>
      </div>

      <div className="onboard-form-grid">
        {activeFields.includes("state") ? (
          <div className="demo-field">
            <FieldLabel>State / राज्य</FieldLabel>
            <select
              className="demo-select"
              value={formState.state}
              onChange={(event) => updateField("state", event.target.value)}
            >
              <option value="">Select state</option>
              {STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeFields.includes("gender") ? (
          <div className="demo-field">
            <FieldLabel>Gender / लिंग</FieldLabel>
            <select
              className="demo-select"
              value={formState.gender}
              onChange={(event) => updateField("gender", event.target.value)}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labelEn} / {option.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeFields.includes("caste") ? (
          <div className="demo-field">
            <FieldLabel>Category / श्रेणी</FieldLabel>
            <select
              className="demo-select"
              value={formState.caste}
              onChange={(event) => updateField("caste", event.target.value)}
            >
              <option value="">Select category</option>
              {CASTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labelEn} / {option.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeFields.includes("age") ? (
          <div className="demo-field">
            <FieldLabel>Age / आयु</FieldLabel>
            <select
              className="demo-select"
              value={formState.ageBand}
              onChange={(event) => updateField("ageBand", event.target.value)}
            >
              <option value="">Select age band</option>
              {AGE_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelEn} / {band.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeFields.includes("incomeBand") ? (
          <div className="demo-field">
            <FieldLabel>{getIncomeLabel(selectedUserType)}</FieldLabel>
            <select
              className="demo-select"
              value={formState.incomeBand}
              onChange={(event) => updateField("incomeBand", event.target.value)}
            >
              <option value="">Select income band</option>
              {INCOME_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelEn} / {band.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeFields.includes("landBand") ? (
          <div className="demo-field">
            <FieldLabel>Land size / जमीन</FieldLabel>
            <select
              className="demo-select"
              value={formState.landBand}
              onChange={(event) => updateField("landBand", event.target.value)}
            >
              <option value="">Select land size</option>
              {LAND_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelEn} / {band.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {activeFields.includes("notes") ? (
        <div className="demo-field onboard-notes-field">
          <FieldLabel>Anything else we should know? / कुछ और बताना है?</FieldLabel>
          <p className="type-caption">
            Optional. Add any special detail only if it will help us find better schemes.
          </p>
          <p className="type-caption hi" lang="hi">
            वैकल्पिक है। सिर्फ वही अतिरिक्त बात लिखें जो बेहतर योजनाएं ढूंढने में मदद करे।
          </p>
          <textarea
            className="demo-select onboard-notes"
            rows={4}
            value={formState.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
          <VoiceInputButton
            onTranscript={(transcript) =>
              updateField(
                "notes",
                formState.notes ? `${formState.notes} ${transcript}`.trim() : transcript
              )
            }
          />
        </div>
      ) : null}

      <div className="onboard-form-footer">
        <p className="type-caption hi" lang="hi">
          आगे हम इसी जानकारी से आपके लिए सही योजनाएं ढूंढेंगे।
        </p>
        <button
          type="submit"
          form={formId}
          className={`demo-submit-button btn-primary onboard-submit ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving profile..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
