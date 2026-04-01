export default function AccountSection({
  name,
  phone,
  lang,
  onNameChange,
  onLangChange,
  onSave,
  onLogout,
  isSaving = false,
}) {
  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">Account info</h2>
        <p className="type-caption">Keep your basic account details up to date.</p>
      </div>

      <div className="profile-account-grid">
        <label className="demo-field">
          <span className="type-label">Name</span>
          <input
            type="text"
            className="demo-select"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />
        </label>

        <div className="demo-field">
          <span className="type-label">Phone number</span>
          <div className="profile-account-value">
            <p className="type-body-en">{phone || "Not available"}</p>
          </div>
        </div>

        <div className="demo-field">
          <span className="type-label">Preferred language</span>
          <div className="profile-account-value">
            <p className="type-body-en">{lang === "en" ? "English" : "हिंदी"}</p>
          </div>
        </div>
      </div>

      <div className="profile-account-actions">
        <button
          type="button"
          className="onboard-secondary-button"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving account..." : "Save account info"}
        </button>
        <button type="button" className="onboard-logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </section>
  );
}
