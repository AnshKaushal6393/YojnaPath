import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AdaptiveForm from "../components/AdaptiveForm";
import OnboardingSteps from "../components/OnboardingSteps";
import UserTypeSelector from "../components/UserTypeSelector";
import { clearAuthToken, getAuthToken } from "../lib/authStorage";
import {
  buildOnboardDraft,
  fetchSavedProfile,
  saveProfileToBackend,
} from "../lib/onboardApi";
import {
  clearProfileDraft,
  getProfileDraft,
  saveProfileDraft,
} from "../lib/profileDraft";
import { clearStoredPhone, clearToken } from "../utils/auth";

const REQUIRED_FIELDS_BY_USER_TYPE = {
  farmer: ["state", "gender", "caste", "ageBand", "incomeBand", "landBand"],
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
    selectedUserType: draft?.selectedUserType || "farmer",
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

export default function OnboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authToken = getAuthToken();
  const initialDraft = useMemo(() => getInitialDraft(), []);
  const [selectedUserType, setSelectedUserType] = useState(initialDraft.selectedUserType);
  const [formState, setFormState] = useState(initialDraft.formState);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const hasTouchedFormRef = useRef(false);
  const hasPrefilledFromSavedProfileRef = useRef(false);
  const isProfileEditMode = location.pathname === "/profile";

  const savedProfileQuery = useQuery({
    queryKey: ["saved-profile"],
    queryFn: fetchSavedProfile,
    enabled: Boolean(authToken),
  });

  useEffect(() => {
    if (
      !savedProfileQuery.data ||
      hasTouchedFormRef.current ||
      hasPrefilledFromSavedProfileRef.current
    ) {
      return;
    }

    setSelectedUserType(savedProfileQuery.data.selectedUserType);
    setFormState(savedProfileQuery.data.formState);
    hasPrefilledFromSavedProfileRef.current = true;
    saveProfileDraft(
      buildOnboardDraft(
        savedProfileQuery.data.selectedUserType,
        savedProfileQuery.data.formState,
        savedProfileQuery.data.storageMode
      )
    );
  }, [savedProfileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: () => saveProfileToBackend(selectedUserType, formState),
    onError: (error) => {
      saveProfileDraft(buildOnboardDraft(selectedUserType, formState, "draft_only"));
      setSubmitError(error.message || "Could not save profile right now.");
      setSubmitMessage("Your draft is safe on this device.");
    },
  });

  function handleFormStateChange(updater) {
    setFormState((current) => {
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      hasTouchedFormRef.current = true;
      saveProfileDraft(buildOnboardDraft(selectedUserType, nextValue));
      return nextValue;
    });
  }

  function handleUserTypeChange(nextType) {
    hasTouchedFormRef.current = true;
    setSelectedUserType(nextType);
    saveProfileDraft(buildOnboardDraft(nextType, formState));
  }

  function validateRequiredFields() {
    const requiredFields = REQUIRED_FIELDS_BY_USER_TYPE[selectedUserType] || [];
    return requiredFields.every((field) => Boolean(formState[field]));
  }

  function handleLogout() {
    clearAuthToken();
    clearToken();
    clearStoredPhone();
    clearProfileDraft();
    navigate("/login", { replace: true });
  }

  function handleViewResults() {
    navigate("/results");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateRequiredFields()) {
      setSubmitError("Please complete the required profile fields before continuing.");
      setSubmitMessage("");
      return;
    }

    setSubmitError("");
    setSubmitMessage("");

    try {
      const result = await saveProfileMutation.mutateAsync();
      saveProfileDraft(buildOnboardDraft(selectedUserType, formState, result.mode));

      if (isProfileEditMode) {
        setSubmitMessage("Details updated successfully.");
        return;
      }

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
            <h1 className="type-h1">
              {isProfileEditMode ? "Update your details" : "Tell us who you are"}
            </h1>
            <p className="type-body-en">
              {isProfileEditMode
                ? "Keep your saved details accurate so we can continue matching the right schemes."
                : "We only ask the fields that matter for your profile so you can reach matching schemes faster."}
            </p>
            <p className="type-body-hi hi" lang="hi">
              {isProfileEditMode
                ? "\u0905\u092a\u0928\u0940 \u0938\u0947\u0935 \u0915\u0940 \u0917\u0908 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0915\u094b \u0938\u0939\u0940 \u0930\u0916\u0947\u0902 \u0924\u093e\u0915\u093f \u0939\u092e \u0906\u092a\u0915\u0947 \u0932\u093f\u090f \u0938\u0939\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u092e\u093f\u0932\u093e \u0938\u0915\u0947\u0902\u0964"
                : "\u0939\u092e \u0938\u093f\u0930\u094d\u092b \u0935\u0939\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u092a\u0942\u091b\u0947\u0902\u0917\u0947 \u091c\u094b \u0906\u092a\u0915\u0940 \u092f\u094b\u091c\u0928\u093e\u090f\u0902 \u0922\u0942\u0902\u0922\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u091c\u0930\u0942\u0930\u0940 \u0939\u0948\u0964"}
            </p>
          </div>
          {isProfileEditMode ? (
            <div className="onboard-hero__actions">
              <button
                type="button"
                className="onboard-secondary-button"
                onClick={handleViewResults}
              >
                View matched schemes
              </button>
              <button
                type="button"
                className="onboard-logout-button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          ) : null}
        </section>

        <OnboardingSteps />
        <UserTypeSelector selectedUserType={selectedUserType} onSelect={handleUserTypeChange} />
        <form id="onboard-profile-form" className="onboard-form-shell" onSubmit={handleSubmit}>
          <AdaptiveForm
            selectedUserType={selectedUserType}
            formState={formState}
            onChange={handleFormStateChange}
            isSubmitting={saveProfileMutation.isPending || savedProfileQuery.isLoading}
            submitLabel={isProfileEditMode ? "Save changes" : "Continue to matching"}
          />
        </form>
        {submitMessage ? (
          <div className="onboard-feedback state-success" role="status" aria-live="polite">
            <span className="type-caption">{submitMessage}</span>
            {isProfileEditMode ? (
              <button
                type="button"
                className="onboard-feedback__action"
                onClick={handleViewResults}
              >
                View updated matches
              </button>
            ) : null}
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
