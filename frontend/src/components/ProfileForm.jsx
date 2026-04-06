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
  const userTypeLabel = getUserTypeLabel(selectedUserType);

  return (
    <>
      {allowUserTypeChange ? (
        <UserTypeSelector selectedUserType={selectedUserType} onSelect={onUserTypeChange} />
      ) : (
        <section className="profile-card">
          <div className="section-heading">
            <h2 className="type-h2">Member type</h2>
            <p className="type-caption">
              This profile is currently set as <strong>{userTypeLabel}</strong>. If this
              member needs a different profile type, create a new member profile instead.
            </p>
          </div>
        </section>
      )}
      <AdaptiveForm
        selectedUserType={selectedUserType}
        formState={formState}
        onChange={onFormStateChange}
        isSubmitting={isSubmitting}
        submitLabel="Save profile changes"
        title="Profile details"
        subtitle="अपनी जानकारी बदलें ताकि मिलान बेहतर और सही रहे।"
        formId="profile-form"
        showNotes={false}
      />
    </>
  );
}
