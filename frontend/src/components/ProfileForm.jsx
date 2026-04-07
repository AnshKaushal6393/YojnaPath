import { useTranslation } from "react-i18next";
import AdaptiveForm from "./AdaptiveForm";
import { USER_TYPE_OPTIONS } from "../data/profileOptions";
import UserTypeSelector from "./UserTypeSelector";

function getUserTypeLabel(selectedUserType) {
  return (
    USER_TYPE_OPTIONS.find((option) => option.key === selectedUserType)?.label ||
    selectedUserType
  );
}

export default function ProfileForm({
  selectedUserType,
  formState,
  onUserTypeChange,
  onFormStateChange,
  isSubmitting,
  allowUserTypeChange = false,
}) {
  const { t } = useTranslation();
  const userTypeLabel = getUserTypeLabel(selectedUserType);

  return (
    <>
      {allowUserTypeChange ? (
        <UserTypeSelector selectedUserType={selectedUserType} onSelect={onUserTypeChange} />
      ) : (
        <section className="profile-card">
          <div className="section-heading">
            <h2 className="type-h2">{t("profileForm.memberTypeTitle")}</h2>
            <p className="type-caption">
              {t("profileForm.memberTypeBody.before")}
              <strong>{userTypeLabel}</strong>
              {t("profileForm.memberTypeBody.after")}
            </p>
          </div>
        </section>
      )}
      <AdaptiveForm
        selectedUserType={selectedUserType}
        formState={formState}
        onChange={onFormStateChange}
        isSubmitting={isSubmitting}
        submitLabel={t("profileForm.saveChanges")}
        title={t("profileForm.detailsTitle")}
        subtitle={t("profileForm.detailsSubtitle")}
        formId="profile-form"
        showNotes={false}
      />
    </>
  );
}
