import { useTranslation } from "react-i18next";
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
  business: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  women: ["state", "caste", "age", "incomeBand", "notes"],
  student: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  worker: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  health: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  housing: ["state", "caste", "incomeBand", "notes"],
  senior: ["state", "gender", "caste", "age", "incomeBand", "notes"],
  disability: ["state", "gender", "caste", "age", "incomeBand", "notes"],
};

// Removed AGE_BANDS - now using number input


function FieldLabel({ children }) {
  return <label className="type-label">{children}</label>;
}

function getIncomeLabel(selectedUserType, t) {
  if (["student", "women", "housing"].includes(selectedUserType)) {
    return t("adaptiveForm.familyIncome");
  }

  return t("adaptiveForm.annualIncome");
}

function getIncomeHelp(selectedUserType, t) {
  if (selectedUserType === "women") {
    return t("adaptiveForm.womenIncomeHelp");
  }

  if (["student", "housing"].includes(selectedUserType)) {
    return t("adaptiveForm.familyIncomeHelp");
  }

  return t("adaptiveForm.annualIncomeHelp");
}

export default function AdaptiveForm({
  selectedUserType,
  formState,
  onChange,
  isSubmitting,
  submitLabel,
  title,
  subtitle,
  formId = "onboard-profile-form",
  showNotes = true,
}) {
  const { t } = useTranslation();
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
        <VoiceInputButton
          availableFields={activeFields}
          appendTranscriptToNotes={showNotes && activeFields.includes("notes")}
          onApply={({ updates, transcript, matchedFields, appendTranscriptToNotes }) => {
            onChange((current) => ({
              ...current,
              ...updates,
              ...(appendTranscriptToNotes && !matchedFields.length
                ? {
                    notes: current.notes ? `${current.notes} ${transcript}`.trim() : transcript,
                  }
                : {}),
            }));
          }}
        />
      </div>

      <div className="onboard-form-grid">
        {activeFields.includes("state") ? (
          <div className="demo-field">
            <FieldLabel>{t("adaptiveForm.state")}</FieldLabel>
            <select
              className="demo-select"
              value={formState.state}
              onChange={(event) => updateField("state", event.target.value)}
            >
              <option value="">{t("adaptiveForm.selectState")}</option>
              {STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <p className="type-caption">
              {t("adaptiveForm.stateHelp", {
                defaultValue:
                  "Selecting your state still includes Central government schemes available across India.",
              })}
            </p>
          </div>
        ) : null}

        {activeFields.includes("gender") ? (
          <div className="demo-field">
            <FieldLabel>{t("adaptiveForm.gender")}</FieldLabel>
            <select
              className="demo-select"
              value={formState.gender}
              onChange={(event) => updateField("gender", event.target.value)}
            >
              <option value="">{t("adaptiveForm.selectGender")}</option>
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
            <FieldLabel>{t("adaptiveForm.category")}</FieldLabel>
            <select
              className="demo-select"
              value={formState.caste}
              onChange={(event) => updateField("caste", event.target.value)}
            >
              <option value="">{t("adaptiveForm.selectCategory")}</option>
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
            <FieldLabel>{t("adaptiveForm.age")}</FieldLabel>
            <input
              type="number"
              min="0"
              max="150"
              className="demo-select"
              value={formState.age || ""}
              onChange={(event) => updateField("age", event.target.value)}
              placeholder={t("adaptiveForm.agePlaceholder", { defaultValue: "Enter age in years" })}
            />
            <p className="type-caption">{t("adaptiveForm.ageHelp", { defaultValue: "Enter exact age in years" })}</p>
          </div>
        ) : null}

        {activeFields.includes("incomeBand") ? (
          <div className="demo-field">
            <FieldLabel>{getIncomeLabel(selectedUserType, t)}</FieldLabel>
            <select
              className="demo-select"
              value={formState.incomeBand}
              onChange={(event) => updateField("incomeBand", event.target.value)}
            >
              <option value="">{t("adaptiveForm.selectIncomeBand")}</option>
              {INCOME_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelEn} / {band.labelHi}
                </option>
              ))}
            </select>
            <p className="type-caption">{getIncomeHelp(selectedUserType, t)}</p>
          </div>
        ) : null}

        {activeFields.includes("landBand") ? (
          <div className="demo-field">
            <FieldLabel>{t("adaptiveForm.landSize")}</FieldLabel>
            <select
              className="demo-select"
              value={formState.landBand}
              onChange={(event) => updateField("landBand", event.target.value)}
            >
              <option value="">{t("adaptiveForm.selectLandSize")}</option>
              {LAND_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.labelEn} / {band.labelHi}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {showNotes && activeFields.includes("notes") ? (
        <div className="demo-field onboard-notes-field">
          <FieldLabel>{t("adaptiveForm.notesLabel")}</FieldLabel>
          <p className="type-caption">{t("adaptiveForm.notesHelp")}</p>
          <p className="type-caption hi" lang="hi">
            {t("adaptiveForm.notesHelpHi")}
          </p>
          <textarea
            className="demo-select onboard-notes"
            rows={4}
            value={formState.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </div>
      ) : null}

      <div className="onboard-form-footer">
        <p className="type-caption hi" lang="hi">
          {t("adaptiveForm.footer")}
        </p>
        <button
          type="submit"
          form={formId}
          className={`demo-submit-button btn-primary onboard-submit ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? t("adaptiveForm.savingProfile") : submitLabel}
        </button>
      </div>
    </section>
  );
}
