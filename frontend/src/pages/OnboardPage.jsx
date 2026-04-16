import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AdaptiveForm from "../components/AdaptiveForm";
import OnboardingSteps from "../components/OnboardingSteps";
import UserTypeSelector from "../components/UserTypeSelector";
import { clearActiveProfileId } from "../lib/activeProfile";
import { clearAuthToken, getAuthToken } from "../lib/authStorage";
import {
  buildOnboardDraft,
  fetchProfileMembers,
  saveProfileToBackend,
} from "../lib/onboardApi";
import { fetchCurrentUser } from "../lib/registrationApi";
import {
  clearProfileDraft,
  getProfileDraft,
  saveProfileDraft,
} from "../lib/profileDraft";
import { clearStoredPhone, clearToken } from "../utils/auth";

const DEFAULT_USER_TYPE = "farmer";

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

function getInitialDraft() {
  const draft = getProfileDraft();

  return {
    id: draft?.id || "",
    profileName: draft?.profileName || "",
    selectedUserType: draft?.selectedUserType || DEFAULT_USER_TYPE,
    formState: {
      state: draft?.formState?.state || "",
      gender: draft?.formState?.gender || "",
      caste: draft?.formState?.caste || "",
      ageBand: draft?.formState?.ageBand || "",
      incomeBand: draft?.formState?.incomeBand || "",
      landBand: draft?.formState?.landBand || "",
      notes: draft?.formState?.notes || "",
    },
  };
}

function normalizeComparisonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export default function OnboardPage() {
  const navigate = useNavigate();
  const authToken = getAuthToken();
  const initialDraft = useMemo(() => getInitialDraft(), []);
  const [memberName, setMemberName] = useState(initialDraft.profileName);
  const [accountName, setAccountName] = useState("");
  const [accountLang, setAccountLang] = useState("hi");
  const [selectedUserType, setSelectedUserType] = useState(
    initialDraft.selectedUserType || DEFAULT_USER_TYPE
  );
  const [formState, setFormState] = useState(initialDraft.formState);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const hasTouchedFormRef = useRef(false);
  const hasPrefilledOwnerProfileRef = useRef(false);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: Boolean(authToken),
  });

  const profileMembersQuery = useQuery({
    queryKey: ["profile-members"],
    queryFn: fetchProfileMembers,
    enabled: Boolean(authToken),
  });

  const ownerProfile = useMemo(() => {
    const ownerName = normalizeComparisonName(currentUserQuery.data?.name);
    if (!ownerName) {
      return null;
    }

    return (
      (profileMembersQuery.data || []).find(
        (member) => normalizeComparisonName(member.profileName) === ownerName
      ) || null
    );
  }, [currentUserQuery.data?.name, profileMembersQuery.data]);

  useEffect(() => {
    const currentUserName = currentUserQuery.data?.name || "";
    if (!currentUserName) {
      return;
    }

    setAccountName(currentUserName);
    setAccountLang(currentUserQuery.data?.lang || "hi");

    if (!ownerProfile && !hasTouchedFormRef.current && !memberName.trim()) {
      setMemberName(currentUserName);
      saveProfileDraft(
        buildOnboardDraft(selectedUserType || DEFAULT_USER_TYPE, formState, "draft_only", {
          id: initialDraft.id,
          profileName: currentUserName,
        })
      );
    }
  }, [
    currentUserQuery.data?.lang,
    currentUserQuery.data?.name,
    formState,
    initialDraft.id,
    memberName,
    ownerProfile,
    selectedUserType,
  ]);

  useEffect(() => {
    if (!ownerProfile || hasTouchedFormRef.current || hasPrefilledOwnerProfileRef.current) {
      return;
    }

    setSelectedUserType(ownerProfile.selectedUserType || DEFAULT_USER_TYPE);
    setMemberName(ownerProfile.profileName || currentUserQuery.data?.name || "");
    setFormState(ownerProfile.formState || initialDraft.formState);
    hasPrefilledOwnerProfileRef.current = true;
    saveProfileDraft(
      buildOnboardDraft(
        ownerProfile.selectedUserType || DEFAULT_USER_TYPE,
        ownerProfile.formState || initialDraft.formState,
        ownerProfile.storageMode,
        {
          id: ownerProfile.id,
          profileName: ownerProfile.profileName || currentUserQuery.data?.name || "",
          relation: ownerProfile.relation,
          photoUrl: ownerProfile.photoUrl,
        }
      )
    );
  }, [currentUserQuery.data?.name, initialDraft.formState, ownerProfile]);

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      saveProfileToBackend(selectedUserType, formState, accountLang || "hi", {
        profileId: ownerProfile?.id || initialDraft.id || null,
        profileName: memberName.trim(),
      }),
    onError: (error) => {
      saveProfileDraft(
        buildOnboardDraft(selectedUserType, formState, "draft_only", {
          id: ownerProfile?.id || initialDraft.id || "",
          profileName: memberName,
        })
      );
      setSubmitError(error.message || "Could not save profile right now.");
      setSubmitMessage("Your draft is safe on this device.");
    },
  });

  function handleFormStateChange(updater) {
    setFormState((current) => {
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      hasTouchedFormRef.current = true;
      saveProfileDraft(
        buildOnboardDraft(selectedUserType, nextValue, "draft_only", {
          id: ownerProfile?.id || initialDraft.id || "",
          profileName: memberName,
        })
      );
      return nextValue;
    });
  }

  function handleUserTypeChange(nextType) {
    hasTouchedFormRef.current = true;
    setSelectedUserType(nextType || DEFAULT_USER_TYPE);
    saveProfileDraft(
      buildOnboardDraft(nextType || DEFAULT_USER_TYPE, formState, "draft_only", {
        id: ownerProfile?.id || initialDraft.id || "",
        profileName: memberName,
      })
    );
  }

  function validateRequiredFields() {
    if (!selectedUserType) {
      return false;
    }

    const requiredFields = REQUIRED_FIELDS_BY_USER_TYPE[selectedUserType] || [];
    return requiredFields.every((field) => Boolean(formState[field]));
  }

  function handleLogout() {
    clearAuthToken();
    clearToken();
    clearStoredPhone();
    clearProfileDraft();
    clearActiveProfileId();
    navigate("/login", { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUserType) {
      setSubmitError("Please choose a user type before continuing.");
      setSubmitMessage("");
      return;
    }

    if (!validateRequiredFields()) {
      setSubmitError("Please complete the required profile fields before continuing.");
      setSubmitMessage("");
      return;
    }

    if (memberName.trim().length < 2) {
      setSubmitError("Please enter your profile name before continuing.");
      setSubmitMessage("");
      return;
    }

    setSubmitError("");
    setSubmitMessage("");

    try {
      const result = await saveProfileMutation.mutateAsync();
      saveProfileDraft(
        buildOnboardDraft(selectedUserType, formState, result.mode, {
          id: result.profile?.id || ownerProfile?.id || initialDraft.id || "",
          profileName: memberName,
          relation: result.profile?.relation || ownerProfile?.relation || "",
          photoUrl: result.profile?.photoUrl || ownerProfile?.photoUrl || "",
        })
      );
      navigate("/results", { replace: true });
    } catch {
      // handled by mutation onError
    }
  }

  return (
    <main className="app-shell">
      <div className="onboard-page">
        <section className="onboard-hero">
          <div className="matching-hero-shape matching-hero-shape--one" aria-hidden="true" />
          <div className="matching-hero-shape matching-hero-shape--two" aria-hidden="true" />

          <div className="section-heading">
            <p className="eyebrow">ONBOARDING</p>
            <h1 className="type-h1">Tell us who you are</h1>
            <p className="type-body-en">
              We only ask the fields that matter for your profile so you can reach matching
              schemes faster.
            </p>
            <p className="type-body-hi hi" lang="hi">
              {
                "\u0939\u092e \u0938\u093f\u0930\u094d\u092b \u0935\u0939\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u092a\u0942\u091b\u0947\u0902\u0917\u0947 \u091c\u094b \u0906\u092a\u0915\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u091c\u0930\u0942\u0930\u0940 \u0939\u0948\u0964"
              }
            </p>
          </div>

          <div className="onboard-hero__actions">
            <button type="button" className="onboard-secondary-button" onClick={() => navigate("/profile")}>
              Manage profiles
            </button>
            <button type="button" className="onboard-logout-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </section>

        <OnboardingSteps />

        <section className="onboard-card">
          <label className="demo-field">
            <span className="type-label">Profile name</span>
            <input
              type="text"
              className="demo-select"
              value={memberName}
              onChange={(event) => {
                const nextName = event.target.value;
                hasTouchedFormRef.current = true;
                setMemberName(nextName);
                saveProfileDraft(
                  buildOnboardDraft(selectedUserType, formState, "draft_only", {
                    id: ownerProfile?.id || initialDraft.id || "",
                    profileName: nextName,
                  })
                );
              }}
              placeholder="Enter your name"
              autoComplete="name"
            />
          </label>
        </section>

        <UserTypeSelector selectedUserType={selectedUserType} onSelect={handleUserTypeChange} />

        <form id="onboard-profile-form" className="onboard-form-shell" onSubmit={handleSubmit}>
          <AdaptiveForm
            selectedUserType={selectedUserType}
            formState={formState}
            onChange={handleFormStateChange}
            isSubmitting={
              saveProfileMutation.isPending ||
              currentUserQuery.isLoading ||
              profileMembersQuery.isLoading
            }
            submitLabel="Continue to matching"
          />
        </form>

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

      <BottomNav active="profile" />
    </main>
  );
}
