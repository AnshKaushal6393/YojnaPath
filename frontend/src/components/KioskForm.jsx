import { useState } from "react";

const USER_TYPES = [
  { value: "farmer", label: "Farmer" },
  { value: "business", label: "MSME / Business" },
  { value: "women", label: "Women" },
  { value: "student", label: "Student" },
  { value: "worker", label: "Worker" },
  { value: "health", label: "Health" },
  { value: "housing", label: "Housing" },
  { value: "senior", label: "Senior" },
  { value: "disability", label: "Disability" },
];

const STATES = [
  "CENTRAL",
  "ANDHRA PRADESH",
  "BIHAR",
  "DELHI",
  "GUJARAT",
  "HARYANA",
  "KARNATAKA",
  "KERALA",
  "MADHYA PRADESH",
  "MAHARASHTRA",
  "RAJASTHAN",
  "TAMIL NADU",
  "TELANGANA",
  "UTTAR PRADESH",
  "UTTARAKHAND",
  "WEST BENGAL",
];

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const CASTES = [
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
  { value: "obc", label: "OBC" },
  { value: "general", label: "General" },
];

function getInitialState() {
  return {
    kioskCode: "",
    state: "",
    occupation: "farmer",
    annualIncome: "",
    caste: "",
    gender: "",
    age: "",
    landAcres: "",
    disabilityPct: "",
    isStudent: false,
  };
}

export default function KioskForm({ onSubmit, isBusy }) {
  const [formState, setFormState] = useState(() => getInitialState());

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="kiosk-card">
      <div className="section-heading">
        <h2 className="type-h2">Kiosk worker form</h2>
        <p className="type-caption">
          Enter kiosk code once, then fill the visitor details to generate a quick result sheet.
        </p>
        {import.meta.env.DEV ? (
          <p className="type-caption">
            Development demo code: <strong>DEMO1234</strong>
          </p>
        ) : null}
      </div>

      <form
        className="kiosk-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(formState);
        }}
      >
        <label className="demo-field">
          <span className="type-label">Kiosk code</span>
          <input
            id="kiosk-code"
            name="kioskCode"
            type="text"
            className="demo-select"
            value={formState.kioskCode}
            onChange={(event) => updateField("kioskCode", event.target.value.toUpperCase())}
            placeholder="Enter 8-character kiosk code"
            maxLength={8}
          />
        </label>

        <label className="demo-field">
          <span className="type-label">State</span>
          <select
            id="kiosk-state"
            name="state"
            className="demo-select"
            value={formState.state}
            onChange={(event) => updateField("state", event.target.value)}
          >
            <option value="">Select state</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>

        <label className="demo-field">
          <span className="type-label">User type</span>
          <select
            id="kiosk-occupation"
            name="occupation"
            className="demo-select"
            value={formState.occupation}
            onChange={(event) => {
              const nextOccupation = event.target.value;
              updateField("occupation", nextOccupation);
              updateField("isStudent", nextOccupation === "student");
            }}
          >
            {USER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="demo-field">
          <span className="type-label">Annual income</span>
          <input
            id="kiosk-annual-income"
            name="annualIncome"
            type="number"
            min="0"
            className="demo-select"
            value={formState.annualIncome}
            onChange={(event) => updateField("annualIncome", event.target.value)}
            placeholder="Enter annual income"
          />
        </label>

        <label className="demo-field">
          <span className="type-label">Category</span>
          <select
            id="kiosk-caste"
            name="caste"
            className="demo-select"
            value={formState.caste}
            onChange={(event) => updateField("caste", event.target.value)}
          >
            <option value="">Select category</option>
            {CASTES.map((caste) => (
              <option key={caste.value} value={caste.value}>
                {caste.label}
              </option>
            ))}
          </select>
        </label>

        <label className="demo-field">
          <span className="type-label">Gender</span>
          <select
            id="kiosk-gender"
            name="gender"
            className="demo-select"
            value={formState.gender}
            onChange={(event) => updateField("gender", event.target.value)}
          >
            <option value="">Select gender</option>
            {GENDERS.map((gender) => (
              <option key={gender.value} value={gender.value}>
                {gender.label}
              </option>
            ))}
          </select>
        </label>

        <label className="demo-field">
          <span className="type-label">Age</span>
          <input
            id="kiosk-age"
            name="age"
            type="number"
            min="0"
            className="demo-select"
            value={formState.age}
            onChange={(event) => updateField("age", event.target.value)}
            placeholder="Enter age"
          />
        </label>

        <label className="demo-field">
          <span className="type-label">Land acres</span>
          <input
            id="kiosk-land-acres"
            name="landAcres"
            type="number"
            min="0"
            step="0.1"
            className="demo-select"
            value={formState.landAcres}
            onChange={(event) => updateField("landAcres", event.target.value)}
            placeholder="Enter land acres"
          />
        </label>

        <label className="demo-field">
          <span className="type-label">Disability percent</span>
          <input
            id="kiosk-disability-pct"
            name="disabilityPct"
            type="number"
            min="0"
            max="100"
            className="demo-select"
            value={formState.disabilityPct}
            onChange={(event) => updateField("disabilityPct", event.target.value)}
            placeholder="0 to 100"
          />
        </label>

        <button type="submit" className="demo-submit-button btn-primary" disabled={isBusy}>
          {isBusy ? "Generating results..." : "Generate kiosk results"}
        </button>
      </form>
    </section>
  );
}
