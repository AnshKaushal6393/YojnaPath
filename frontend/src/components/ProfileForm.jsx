import AdaptiveForm from "./AdaptiveForm";
import UserTypeSelector from "./UserTypeSelector";

export default function ProfileForm({
  selectedUserType,
  formState,
  onUserTypeChange,
  onFormStateChange,
  isSubmitting,
}) {
  return (
    <>
      <UserTypeSelector selectedUserType={selectedUserType} onSelect={onUserTypeChange} />
      <AdaptiveForm
        selectedUserType={selectedUserType}
        formState={formState}
        onChange={onFormStateChange}
        isSubmitting={isSubmitting}
        submitLabel="Save profile changes"
        title="Profile form"
        subtitle="अपनी जानकारी बदलें ताकि मिलान बेहतर और सही रहे।"
        formId="profile-form"
      />
    </>
  );
}
