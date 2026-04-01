import { USER_TYPE_OPTIONS } from "../data/profileOptions";

function getUserTypeMeta(userType) {
  return (
    USER_TYPE_OPTIONS.find((option) => option.key === userType) || USER_TYPE_OPTIONS[0]
  );
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfileIdentityCard({
  name,
  selectedUserType,
  state,
  caste,
}) {
  const userTypeMeta = getUserTypeMeta(selectedUserType);
  const summaryBits = [state ? toTitleCase(state) : "", caste ? caste.toUpperCase() : ""].filter(Boolean);

  return (
    <section className="profile-identity-card">
      <div className={`profile-identity-card__avatar ${userTypeMeta.className}`} aria-hidden="true">
        {userTypeMeta.icon}
      </div>
      <div className="profile-identity-card__copy">
        <h2 className="type-h2">{name || "Your profile"}</h2>
        <p className="type-body-en">
          {userTypeMeta.label}
          {" \u00B7 "}
          <span className="hi" lang="hi">
            {userTypeMeta.labelHi}
          </span>
        </p>
        {summaryBits.length ? (
          <p className="type-caption">{summaryBits.join(" \u00B7 ")}</p>
        ) : (
          <p className="type-caption">Add your state and category to complete your profile summary.</p>
        )}
      </div>
    </section>
  );
}
