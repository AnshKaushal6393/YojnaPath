import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AccountSection from "../components/AccountSection";
import AdaptiveForm from "../components/AdaptiveForm";
import BottomNav from "../components/BottomNav";
import FamilyProfilesPanel from "../components/FamilyProfilesPanel";
import LanguageToggle from "../components/LanguageToggle";
import ProfileIdentityCard from "../components/ProfileIdentityCard";
import ProfileForm from "../components/ProfileForm";
import UserTypeSelector from "../components/UserTypeSelector";
import { clearActiveProfileId, getActiveProfileId, setActiveProfileId } from "../lib/activeProfile";
import { clearAuthToken } from "../lib/authStorage";
import {
  buildOnboardDraft,
  deleteProfileMember,
  fetchProfileMembers,
  fetchSavedProfile,
  saveProfileToBackend,
} from "../lib/onboardApi";
import { clearProfileDraft, saveProfileDraft } from "../lib/profileDraft";
import { completeRegistration, fetchCurrentUser } from "../lib/registrationApi";
import { clearStoredPhone, clearToken } from "../utils/auth";

const REQUIRED_FIELDS_BY_USER_TYPE = {
  farmer: ["state", "gender", "caste", "ageBand", "incomeBand", "landBand"],
  business: ["state", "gender", "caste", "ageBand", "incomeBand"],
  women: ["state", "caste", "ageBand", "incomeBand"],
  student: ["state", "gender", "caste", "ageBand", "incomeBand"],
  worker: ["state", "gender", "caste", "ageBand", "incomeBand"],
  health: ["state", "gender", "caste", "ageBand", "incomeBand"],
  housing: ["state", "caste", "incomeBand"],
  senior: ["state", "gender", "caste", "ageBand", "incomeBand"],
  disability: ["state", "gender", "caste", "ageBand", "incomeBand"],
};

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 120);
}

function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function createEmptyFormState() {
  return {
    state: "",
    gender: "",
    caste: "",
    ageBand: "",
    incomeBand: "",
    landBand: "",
    notes: "",
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeProfileId, setActiveProfileIdState] = useState(() => getActiveProfileId());
  const [selectedUserType, setSelectedUserType] = useState("farmer");
  const [memberName, setMemberName] = useState("");
  const [formState, setFormState] = useState(createEmptyFormState);
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberUserType, setNewMemberUserType] = useState("farmer");
  const [newMemberFormState, setNewMemberFormState] = useState(createEmptyFormState);
  const [lang, setLang] = useState("hi");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pendingDeleteMember, setPendingDeleteMember] = useState(null);
  const hasTouchedProfileRef = useRef(false);
  const hasPrefilledProfileRef = useRef(false);
  const hasPrefilledAccountRef = useRef(false);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  });

  const profileMembersQuery = useQuery({
    queryKey: ["profile-members"],
    queryFn: fetchProfileMembers,
  });

  const savedProfileQuery = useQuery({
    queryKey: ["saved-profile", activeProfileId],
    queryFn: () => fetchSavedProfile(activeProfileId),
  });

  useEffect(() => {
    if (!currentUserQuery.data || hasPrefilledAccountRef.current) {
      return;
    }

    setName(currentUserQuery.data.name || "");
    setLang(currentUserQuery.data.lang || "hi");
    setPhone(currentUserQuery.data.phone || "");
    hasPrefilledAccountRef.current = true;
  }, [currentUserQuery.data]);

  useEffect(() => {
    const members = profileMembersQuery.data || [];
    if (!members.length) {
      return;
    }

    const hasActiveMember = members.some((member) => member.id === activeProfileId);
    if (hasActiveMember) {
      return;
    }

    const nextActiveMember = members[0];
    setActiveProfileId(nextActiveMember.id);
    setActiveProfileIdState(nextActiveMember.id);
  }, [activeProfileId, profileMembersQuery.data]);

  useEffect(() => {
    if (
      !savedProfileQuery.data ||
      hasTouchedProfileRef.current ||
      hasPrefilledProfileRef.current
    ) {
      return;
    }

    setSelectedUserType(savedProfileQuery.data.selectedUserType);
    setFormState(savedProfileQuery.data.formState);
    setMemberName(savedProfileQuery.data.profileName || "");
    hasPrefilledProfileRef.current = true;
    saveProfileDraft(
      buildOnboardDraft(
        savedProfileQuery.data.selectedUserType,
        savedProfileQuery.data.formState,
        savedProfileQuery.data.storageMode,
        {
          id: savedProfileQuery.data.id,
          profileName: savedProfileQuery.data.profileName,
          relation: savedProfileQuery.data.relation,
        }
      )
    );
  }, [savedProfileQuery.data]);

  const profileMutation = useMutation({
    mutationFn: () =>
      saveProfileToBackend(selectedUserType, formState, lang, {
        profileId: activeProfileId || null,
        profileName: memberName.trim(),
      }),
    onSuccess: async (result) => {
      saveProfileDraft(
        buildOnboardDraft(selectedUserType, formState, "synced", {
          id: result.profile?.id,
          profileName: memberName,
        })
      );
      if (result.profile?.id) {
        setActiveProfileId(result.profile.id);
        setActiveProfileIdState(result.profile.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["profile-members"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      await queryClient.invalidateQueries({ queryKey: ["home-saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["results-data"] });
      setSubmitMessage("Profile details updated successfully.");
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || "Could not save profile changes right now.");
      setSubmitMessage("");
    },
  });

  const accountMutation = useMutation({
    mutationFn: () =>
      completeRegistration({
        name: normalizeName(name).trim(),
        lang,
      }),
    onSuccess: (user) => {
      setName(user?.name || name);
      setLang(user?.lang || lang);
      setSubmitMessage("Account info updated successfully.");
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || "Could not save account info right now.");
      setSubmitMessage("");
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: () =>
      saveProfileToBackend(newMemberUserType, newMemberFormState, lang, {
        profileName: newMemberName.trim(),
      }),
    onSuccess: async (result) => {
      const createdProfileId = result.profile?.id || "";
      const createdProfileName = newMemberName.trim();
      const createdUserType = newMemberUserType;
      const createdFormState = { ...newMemberFormState };

      saveProfileDraft(
        buildOnboardDraft(createdUserType, createdFormState, "synced", {
          id: createdProfileId,
          profileName: createdProfileName,
        })
      );
      if (createdProfileId) {
        hasTouchedProfileRef.current = false;
        hasPrefilledProfileRef.current = true;
        setActiveProfileId(createdProfileId);
        setActiveProfileIdState(createdProfileId);
        setSelectedUserType(createdUserType);
        setFormState(createdFormState);
        setMemberName(createdProfileName);
      }
      await queryClient.invalidateQueries({ queryKey: ["profile-members"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      await queryClient.invalidateQueries({ queryKey: ["home-saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["results-data"] });
      resetCreateMemberModal();
      setSubmitMessage("New family member profile added successfully.");
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || "Could not add the family member right now.");
      setSubmitMessage("");
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: ({ profileId, preferredActiveProfileId }) =>
      deleteProfileMember(profileId, preferredActiveProfileId),
    onSuccess: async ({ members, nextActiveProfileId }) => {
      const nextActiveMember =
        members.find((member) => member.id === nextActiveProfileId) || members[0] || null;

      hasTouchedProfileRef.current = false;
      hasPrefilledProfileRef.current = false;

      if (nextActiveProfileId) {
        setActiveProfileIdState(nextActiveProfileId);
      } else {
        setActiveProfileIdState("");
      }

      if (nextActiveMember) {
        setSelectedUserType(nextActiveMember.selectedUserType);
        setFormState(nextActiveMember.formState);
        setMemberName(nextActiveMember.profileName || "");
      }

      await queryClient.invalidateQueries({ queryKey: ["profile-members"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      await queryClient.invalidateQueries({ queryKey: ["home-saved-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["results-data"] });
      setPendingDeleteMember(null);
      setSubmitMessage("Family member profile deleted successfully.");
      setSubmitError("");
    },
    onError: (error) => {
      setPendingDeleteMember(null);
      setSubmitError(error.message || "Could not delete the family member right now.");
      setSubmitMessage("");
    },
  });

  const isBusy =
    profileMutation.isPending ||
    accountMutation.isPending ||
    createMemberMutation.isPending ||
    deleteMemberMutation.isPending;

  const canSaveProfile = useMemo(() => {
    const requiredFields = REQUIRED_FIELDS_BY_USER_TYPE[selectedUserType] || [];
    return memberName.trim().length >= 2 && requiredFields.every((field) => Boolean(formState[field]));
  }, [formState, memberName, selectedUserType]);

  const canSaveNewMember = useMemo(() => {
    const requiredFields = REQUIRED_FIELDS_BY_USER_TYPE[newMemberUserType] || [];
    return (
      newMemberName.trim().length >= 2 &&
      requiredFields.every((field) => Boolean(newMemberFormState[field]))
    );
  }, [newMemberFormState, newMemberName, newMemberUserType]);

  const accountOwnerHasProfile = useMemo(() => {
    const ownerName = normalizeComparisonName(name);
    if (!ownerName) {
      return false;
    }

    return (profileMembersQuery.data || []).some(
      (member) => normalizeComparisonName(member.profileName) === ownerName
    );
  }, [name, profileMembersQuery.data]);

  function resetCreateMemberModal() {
    setShowCreateMemberModal(false);
    setNewMemberName("");
    setNewMemberUserType("farmer");
    setNewMemberFormState(createEmptyFormState());
  }

  function handleFormStateChange(updater) {
    setFormState((current) => {
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      hasTouchedProfileRef.current = true;
      saveProfileDraft(
        buildOnboardDraft(selectedUserType, nextValue, "draft_only", {
          id: activeProfileId,
          profileName: memberName,
        })
      );
      return nextValue;
    });
  }

  function handleUserTypeChange(nextType) {
    hasTouchedProfileRef.current = true;
    setSelectedUserType(nextType);
    saveProfileDraft(
      buildOnboardDraft(nextType, formState, "draft_only", {
        id: activeProfileId,
        profileName: memberName,
      })
    );
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!canSaveProfile) {
      setSubmitError("Please add the member name and complete all required profile fields before saving.");
      setSubmitMessage("");
      return;
    }

    await profileMutation.mutateAsync();
  }

  async function handleAccountSave() {
    if (normalizeName(name).trim().length < 2) {
      setSubmitError("Please enter your name before saving account info.");
      setSubmitMessage("");
      return;
    }

    await accountMutation.mutateAsync();
  }

  function handleLogout() {
    clearAuthToken();
    clearToken();
    clearStoredPhone();
    clearProfileDraft();
    clearActiveProfileId();
    navigate("/login", { replace: true });
  }

  function handleSelectMember(member) {
    hasTouchedProfileRef.current = false;
    hasPrefilledProfileRef.current = false;
    setActiveProfileId(member.id);
    setActiveProfileIdState(member.id);
    setSelectedUserType(member.selectedUserType);
    setFormState(member.formState);
    setMemberName(member.profileName || "");
    setSubmitMessage("");
    setSubmitError("");
    queryClient.invalidateQueries({ queryKey: ["home-data"] });
    queryClient.invalidateQueries({ queryKey: ["home-saved-profile"] });
    queryClient.invalidateQueries({ queryKey: ["results-data"] });
    queryClient.invalidateQueries({ queryKey: ["saved-profile"] });
  }

  function handleCreateNewMember() {
    setShowCreateMemberModal(true);
    setPendingDeleteMember(null);
    setSubmitMessage("");
    setSubmitError("");
  }

  function handleCreateOwnerProfile() {
    setShowCreateMemberModal(true);
    setNewMemberName(normalizeName(name));
    setPendingDeleteMember(null);
    setSubmitMessage("");
    setSubmitError("");
  }

  function handleDeleteMember(member) {
    setPendingDeleteMember(member);
    setSubmitMessage("");
    setSubmitError("");
  }

  async function confirmDeleteMember() {
    if (!pendingDeleteMember?.id) {
      return;
    }

    await deleteMemberMutation.mutateAsync({
      profileId: pendingDeleteMember.id,
      preferredActiveProfileId:
        pendingDeleteMember.id === activeProfileId ? "" : activeProfileId,
    });
  }

  function handleNewMemberFormStateChange(updater) {
    setNewMemberFormState((current) =>
      typeof updater === "function" ? updater(current) : updater
    );
  }

  async function handleCreateMemberSubmit(event) {
    event.preventDefault();

    if (!canSaveNewMember) {
      setSubmitError("Please complete the new member name and required profile fields.");
      setSubmitMessage("");
      return;
    }

    await createMemberMutation.mutateAsync();
  }

  return (
    <main className="app-shell">
      <div className="profile-page">
        <section className="profile-hero">
          <div className="matching-hero-shape matching-hero-shape--one" aria-hidden="true" />
          <div className="matching-hero-shape matching-hero-shape--two" aria-hidden="true" />

          <div className="section-heading">
            <p className="eyebrow">PROFILE</p>
            <h1 className="type-h1">Manage your saved details</h1>
            <p className="type-body-en">
              Update your profile, preferred language, and account details from one place.
            </p>
            <p className="type-body-hi hi profile-hero__copy-clean" lang="hi">
              {
                "\u0905\u092a\u0928\u0940 \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932, \u092a\u0938\u0902\u0926 \u0915\u0940 \u092d\u093e\u0937\u093e \u0914\u0930 \u0905\u0915\u093e\u0909\u0902\u091f \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u092f\u0939\u093e\u0901 \u0938\u0947 \u092c\u0926\u0932\u0947\u0902\u0964"
              }
            </p>
            <p className="type-body-hi hi" lang="hi">
              अपनी प्रोफाइल, पसंद की भाषा और अकाउंट जानकारी यहां से बदलें।
            </p>
          </div>
        </section>

        <FamilyProfilesPanel
          members={profileMembersQuery.data || []}
          activeProfileId={activeProfileId}
          onSelect={handleSelectMember}
          onCreateNew={handleCreateNewMember}
          onCreateOwnerProfile={handleCreateOwnerProfile}
          onDelete={handleDeleteMember}
          pendingDeleteMemberId={pendingDeleteMember?.id || ""}
          onCancelDelete={() => setPendingDeleteMember(null)}
          onConfirmDelete={confirmDeleteMember}
          isDeleting={deleteMemberMutation.isPending}
          accountOwnerName={name}
          accountOwnerHasProfile={accountOwnerHasProfile}
        />

        <ProfileIdentityCard
          name={memberName || name}
          selectedUserType={selectedUserType}
          state={formState.state}
          caste={formState.caste}
        />

        <section className="profile-card">
          <label className="demo-field">
            <span className="type-label">Family member name</span>
            <input
              type="text"
              className="demo-select"
              value={memberName}
              onChange={(event) => {
                const nextName = normalizeName(event.target.value);
                setMemberName(nextName);
                saveProfileDraft(
                  buildOnboardDraft(selectedUserType, formState, "draft_only", {
                    id: activeProfileId,
                    profileName: nextName,
                  })
                );
              }}
              placeholder="Enter family member name"
              autoComplete="off"
            />
          </label>
        </section>

        <LanguageToggle value={lang} onChange={setLang} disabled={isBusy} />

        <form id="profile-form" className="profile-form-shell" onSubmit={handleProfileSubmit}>
          <ProfileForm
            selectedUserType={selectedUserType}
            formState={formState}
            onUserTypeChange={handleUserTypeChange}
            onFormStateChange={handleFormStateChange}
            isSubmitting={profileMutation.isPending}
          />
        </form>

        <AccountSection
          name={name}
          phone={phone}
          currentProfileName={memberName}
          onNameChange={(value) => setName(normalizeName(value))}
          onSave={handleAccountSave}
          onLogout={handleLogout}
          isSaving={accountMutation.isPending}
        />

        {submitMessage ? (
          <div className="onboard-feedback state-success" role="status" aria-live="polite">
            <span className="type-caption">{submitMessage}</span>
          </div>
        ) : null}

        {submitError ? (
          <div className="onboard-feedback state-danger" role="alert">
            <span className="type-caption">{submitError}</span>
          </div>
        ) : null}

      </div>

      {showCreateMemberModal ? (
        <div className="app-modal-backdrop" role="presentation" onClick={resetCreateMemberModal}>
          <section
            className="app-modal profile-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-member-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <p className="eyebrow">NEW MEMBER</p>
              <h2 id="create-member-title" className="type-h2">
                Add family member profile
              </h2>
              <p className="type-caption">
                Create a separate scheme profile for another person in the family.
              </p>
            </div>

            <form
              id="create-member-profile-form"
              className="profile-create-modal__form"
              onSubmit={handleCreateMemberSubmit}
            >
              <section className="profile-card">
                <label className="demo-field">
                  <span className="type-label">Family member name</span>
                  <input
                    type="text"
                    className="demo-select"
                    value={newMemberName}
                    onChange={(event) => setNewMemberName(normalizeName(event.target.value))}
                    placeholder="Enter family member name"
                    autoComplete="off"
                  />
                </label>
              </section>

              <UserTypeSelector
                selectedUserType={newMemberUserType}
                onSelect={setNewMemberUserType}
              />

              <AdaptiveForm
                selectedUserType={newMemberUserType}
                formState={newMemberFormState}
                onChange={handleNewMemberFormStateChange}
                isSubmitting={createMemberMutation.isPending}
                submitLabel="Create member profile"
                title="Member profile form"
                subtitle="Create this profile separately so the family can switch between members."
                formId="create-member-profile-form"
              />

              <div className="profile-create-modal__actions">
                <button
                  type="button"
                  className="onboard-logout-button"
                  onClick={resetCreateMemberModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <BottomNav active="profile" />
    </main>
  );
}
