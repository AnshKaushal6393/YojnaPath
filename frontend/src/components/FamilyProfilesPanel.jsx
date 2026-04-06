import { USER_TYPE_OPTIONS } from "../data/profileOptions";

function getUserTypeLabel(userType) {
  return (
    USER_TYPE_OPTIONS.find((option) => option.key === userType)?.label || userType || "Profile"
  );
}

function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export default function FamilyProfilesPanel({
  members = [],
  activeProfileId,
  onSelect,
  onCreateNew,
  onCreateOwnerProfile,
  onDelete,
  pendingDeleteMemberId = "",
  onCancelDelete,
  onConfirmDelete,
  isDeleting = false,
  accountOwnerName = "",
  accountOwnerHasProfile = false,
}) {
  const accountOwnerMember =
    members.find(
      (member) =>
        normalizeComparisonName(member.profileName) ===
        normalizeComparisonName(accountOwnerName)
    ) || null;
  const primaryMember = members.find((member) => member.isPrimary) || accountOwnerMember || null;
  const familyMembers = members.filter((member) => member.id !== primaryMember?.id);

  function renderMemberCard(member, options = {}) {
    const isPrimary = Boolean(options.isPrimary);
    const displayName = isPrimary
      ? "My profile"
      : member.profileName || "Family member";
    const secondaryText = isPrimary
      ? accountOwnerName || member.profileName || "Account owner"
      : getUserTypeLabel(member.selectedUserType);
    const isDeletePending = pendingDeleteMemberId === member.id;

    return (
      <div
        key={member.id}
        className={`family-profile-chip ${member.id === activeProfileId ? "family-profile-chip--active" : ""} ${
          isPrimary ? "family-profile-chip--primary" : ""
        }`.trim()}
      >
        <button
          type="button"
          className="family-profile-chip__main"
          onClick={() => onSelect(member)}
        >
          <div className="family-profile-chip__heading">
            <span className="type-label">{displayName}</span>
            {isPrimary ? (
              <span className="family-profile-chip__badge">Logged in member</span>
            ) : null}
          </div>
          <span className="type-caption">{secondaryText}</span>
          {isPrimary ? (
            <span className="type-caption">{getUserTypeLabel(member.selectedUserType)}</span>
          ) : null}
        </button>

        {!isPrimary && members.length > 1 && typeof onDelete === "function" ? (
          isDeletePending ? (
            <div className="family-profile-chip__confirm">
              <span className="type-caption">Delete this profile?</span>
              <div className="family-profile-chip__confirm-actions">
                <button
                  type="button"
                  className="family-profile-chip__confirm-button"
                  onClick={() => onCancelDelete?.()}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="family-profile-chip__confirm-button family-profile-chip__confirm-button--danger"
                  onClick={() => onConfirmDelete?.()}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="family-profile-chip__delete"
              onClick={() => onDelete?.(member)}
              disabled={isDeleting}
              aria-label={`Delete ${member.profileName || "family member"} profile`}
              title="Delete profile"
            >
              Delete
            </button>
          )
        ) : null}
      </div>
    );
  }

  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">Profiles for this account</h2>
        <p className="type-caption">
          One phone login can manage your own scheme profile plus separate family-member profiles.
        </p>
      </div>

      {primaryMember ? (
        <div className="family-profiles-primary">
          {renderMemberCard(primaryMember, { isPrimary: true })}
        </div>
      ) : !accountOwnerHasProfile ? (
        <div className="family-profiles-primary">
          <div className="family-profile-chip family-profile-chip--primary family-profile-chip--owner-empty">
            <div className="family-profile-chip__main">
              <div className="family-profile-chip__heading">
                <span className="type-label">My profile</span>
                <span className="family-profile-chip__badge">Logged in member</span>
              </div>
              <span className="type-caption">{accountOwnerName || "Account owner"}</span>
              <span className="type-caption">
                Your own scheme profile has not been created yet.
              </span>
            </div>
            <button
              type="button"
              className="onboard-secondary-button family-profile-chip__owner-action"
              onClick={onCreateOwnerProfile}
            >
              Create my own profile
            </button>
          </div>
        </div>
      ) : null}

      {familyMembers.length ? (
        <div className="family-profiles-secondary">
          <div className="section-heading family-profiles-secondary__heading">
            <h3 className="type-h2">Other family members</h3>
            <p className="type-caption">Switch between added member profiles for matching.</p>
          </div>

          <div className="family-profiles-grid">
            {familyMembers.map((member) => renderMemberCard(member))}
          </div>
        </div>
      ) : null}

      <div className="family-profiles-grid">
        
        <button
          type="button"
          className="family-profile-chip family-profile-chip--create"
          onClick={onCreateNew}
        >
          <span className="type-label">+ Add member</span>
          <span className="type-caption">Create another family profile</span>
        </button>
      </div>
    </section>
  );
}
