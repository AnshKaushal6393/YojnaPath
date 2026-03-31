import {
  GENDER_OPTIONS,
  INCOME_BANDS,
  LAND_BANDS,
  STATE_OPTIONS,
} from "../data/profileOptions";
import VoiceInputButton from "./VoiceInputButton";

const USER_TYPE_CONFIG = {
  farmer: ["state", "gender", "age", "incomeBand", "landBand", "notes"],
  women: ["state", "age", "incomeBand", "notes"],
  student: ["state", "gender", "age", "incomeBand", "notes"],
  worker: ["state", "gender", "age", "incomeBand", "notes"],
  health: ["state", "gender", "age", "incomeBand", "notes"],
  housing: ["state", "incomeBand", "notes"],
  senior: ["state", "gender", "age", "incomeBand", "notes"],
  disability: ["state", "gender", "age", "incomeBand", "notes"],
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

export default function AdaptiveForm({ selectedUserType, formState, onChange, isSubmitting }) {
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
        <h2 className="type-h2">Adaptive profile form</h2>
        <p className="type-caption hi" lang="hi">
          {
            "\u0915\u0947\u0935\u0932 \u0909\u0928\u094d\u0939\u0940\u0902 \u092a\u094d\u0930\u0936\u094d\u0928 \u0926\u093f\u0916\u0947\u0902\u0917\u0947 \u091c\u094b \u0906\u092a\u0915\u0947 \u0932\u093f\u090f \u091c\u0930\u0942\u0930\u0940 \u0939\u0948\u0902\u0964"
          }
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
            {
              "\u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u0939\u0948\u0964 \u0938\u093f\u0930\u094d\u092b \u0935\u0939\u0940 \u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u092c\u093e\u0924 \u0932\u093f\u0916\u0947\u0902 \u091c\u094b \u092c\u0947\u0939\u0924\u0930 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0947\u0964"
            }
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
          {
            "\u0906\u0917\u0947 \u0939\u092e \u0907\u0938\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0938\u0947 \u0906\u092a\u0915\u0947 \u0932\u093f\u090f \u0938\u0939\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922\u0947\u0902\u0917\u0947\u0964"
          }
        </p>
        <button
          type="submit"
          form="onboard-profile-form"
          className={`demo-submit-button btn-primary onboard-submit ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving profile..." : "Continue to matching"}
        </button>
      </div>
    </section>
  );
}
