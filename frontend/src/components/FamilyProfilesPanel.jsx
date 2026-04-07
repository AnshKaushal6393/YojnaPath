import { useTranslation } from "react-i18next";
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
  accountOwnerProfileId = "",
}) {
  const { t } = useTranslation();
  const accountOwnerMember =
    members.find((member) => member.id === accountOwnerProfileId) ||
    members.find(
      (member) =>
        normalizeComparisonName(member.profileName) ===
        normalizeComparisonName(accountOwnerName)
    ) || null;
  const primaryMember = members.find((member) => member.isPrimary) || accountOwnerMember || null;
  const familyMembers = members.filter((member) => member.id !== primaryMember?.id);

  function renderMemberCard(member, options = {}) {
    const isPrimary = Boolean(options.isPrimary);
    const displayName = isPrimary ? t("profilePanel.myProfile") : member.profileName || t("profilePanel.familyMember");
    const secondaryText = isPrimary
      ? accountOwnerName || member.profileName || t("profile.account.accountOwnerFallback")
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
              <span className="family-profile-chip__badge">{t("profilePanel.loggedInMember")}</span>
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
              <span className="type-caption">{t("profilePanel.deleteConfirm")}</span>
              <div className="family-profile-chip__confirm-actions">
                <button
                  type="button"
                  className="family-profile-chip__confirm-button"
                  onClick={() => onCancelDelete?.()}
                  disabled={isDeleting}
                >
                  {t("common.buttons.cancel")}
                </button>
                <button
                  type="button"
                  className="family-profile-chip__confirm-button family-profile-chip__confirm-button--danger"
                  onClick={() => onConfirmDelete?.()}
                  disabled={isDeleting}
                >
                  {isDeleting ? t("profilePanel.deleting") : t("common.buttons.delete")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="family-profile-chip__delete"
              onClick={() => onDelete?.(member)}
              disabled={isDeleting}
              aria-label={t("profilePanel.deleteAria", {
                name: member.profileName || t("profilePanel.familyMember"),
              })}
              title={t("profilePanel.deleteTitle")}
            >
              {t("common.buttons.delete")}
            </button>
          )
        ) : null}
      </div>
    );
  }

  return (
    <section className="profile-card">
      <div className="section-heading">
        <h2 className="type-h2">{t("profilePanel.title")}</h2>
        <p className="type-caption">{t("profilePanel.subtitle")}</p>
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
                <span className="type-label">{t("profilePanel.myProfile")}</span>
                <span className="family-profile-chip__badge">{t("profilePanel.loggedInMember")}</span>
              </div>
              <span className="type-caption">
                {accountOwnerName || t("profile.account.accountOwnerFallback")}
              </span>
              <span className="type-caption">{t("profilePanel.ownerMissing")}</span>
            </div>
            <button
              type="button"
              className="onboard-secondary-button family-profile-chip__owner-action"
              onClick={onCreateOwnerProfile}
            >
              {t("profilePanel.createOwn")}
            </button>
          </div>
        </div>
      ) : null}

      {familyMembers.length ? (
        <div className="family-profiles-secondary">
          <div className="section-heading family-profiles-secondary__heading">
            <h3 className="type-h2">{t("profilePanel.otherMembers")}</h3>
            <p className="type-caption">{t("profilePanel.otherMembersSubtitle")}</p>
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
          <span className="type-label">{t("profilePanel.addMember")}</span>
          <span className="type-caption">{t("profilePanel.addMemberSubtitle")}</span>
        </button>
      </div>
    </section>
  );
}
