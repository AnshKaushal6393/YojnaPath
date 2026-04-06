import { useTranslation } from "react-i18next";

export default function AccountSection({
  name,
  phone,
  currentProfileName,
  onNameChange,
  onSave,
  onLogout,
  isSaving = false,
}) {
  const { t } = useTranslation();
  const phoneText = phone ? ` · ${phone}` : "";

  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">{t("profile.account.title")}</h2>
        <p className="type-caption">
          {t("profile.account.loggedInAs", {
            name: name || t("profile.account.accountOwnerFallback"),
            phone: phoneText,
          })}
          {currentProfileName
            ? ` ${t("profile.account.currentProfile", { name: currentProfileName })}`
            : ""}
        </p>
      </div>

      <div className="profile-account-grid">
        <label className="demo-field">
          <span className="type-label">{t("profile.account.name")}</span>
          <input
            type="text"
            className="demo-select"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t("profile.account.namePlaceholder")}
            autoComplete="name"
          />
        </label>

        <div className="demo-field">
          <span className="type-label">{t("profile.account.phone")}</span>
          <div className="profile-account-value">
            <p className="type-body-en">{phone || t("profile.account.phoneUnavailable")}</p>
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
          {isSaving ? t("profile.account.savingAccount") : t("profile.account.saveAccount")}
        </button>
        <button type="button" className="onboard-logout-button" onClick={onLogout}>
          {t("profile.account.logout")}
        </button>
      </div>
    </section>
  );
}
