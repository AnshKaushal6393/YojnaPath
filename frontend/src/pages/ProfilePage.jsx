import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AccountSection from "../components/AccountSection";
import BottomNav from "../components/BottomNav";
import LanguageToggle from "../components/LanguageToggle";
import ProfileIdentityCard from "../components/ProfileIdentityCard";
import ProfileForm from "../components/ProfileForm";
import { clearAuthToken } from "../lib/authStorage";
import {
  buildOnboardDraft,
  fetchSavedProfile,
  saveProfileToBackend,
} from "../lib/onboardApi";
import { clearProfileDraft, saveProfileDraft } from "../lib/profileDraft";
import { completeRegistration, fetchCurrentUser } from "../lib/registrationApi";
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

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 120);
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [selectedUserType, setSelectedUserType] = useState("farmer");
  const [formState, setFormState] = useState({
    state: "",
    gender: "",
    caste: "",
    ageBand: "",
    incomeBand: "",
    landBand: "",
    notes: "",
  });
  const [lang, setLang] = useState("hi");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const hasTouchedProfileRef = useRef(false);
  const hasPrefilledProfileRef = useRef(false);
  const hasPrefilledAccountRef = useRef(false);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  });

  const savedProfileQuery = useQuery({
    queryKey: ["saved-profile"],
    queryFn: fetchSavedProfile,
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
    if (
      !savedProfileQuery.data ||
      hasTouchedProfileRef.current ||
      hasPrefilledProfileRef.current
    ) {
      return;
    }

    setSelectedUserType(savedProfileQuery.data.selectedUserType);
    setFormState(savedProfileQuery.data.formState);
    hasPrefilledProfileRef.current = true;
    saveProfileDraft(
      buildOnboardDraft(
        savedProfileQuery.data.selectedUserType,
        savedProfileQuery.data.formState,
        savedProfileQuery.data.storageMode
      )
    );
  }, [savedProfileQuery.data]);

  const profileMutation = useMutation({
    mutationFn: () => saveProfileToBackend(selectedUserType, formState, lang),
    onSuccess: () => {
      saveProfileDraft(buildOnboardDraft(selectedUserType, formState, "synced"));
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

  const isBusy = profileMutation.isPending || accountMutation.isPending;

  const canSaveProfile = useMemo(() => {
    const requiredFields = REQUIRED_FIELDS_BY_USER_TYPE[selectedUserType] || [];
    return requiredFields.every((field) => Boolean(formState[field]));
  }, [formState, selectedUserType]);

  function handleFormStateChange(updater) {
    setFormState((current) => {
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      hasTouchedProfileRef.current = true;
      saveProfileDraft(buildOnboardDraft(selectedUserType, nextValue));
      return nextValue;
    });
  }

  function handleUserTypeChange(nextType) {
    hasTouchedProfileRef.current = true;
    setSelectedUserType(nextType);
    saveProfileDraft(buildOnboardDraft(nextType, formState));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!canSaveProfile) {
      setSubmitError("Please complete all required profile fields before saving.");
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
    navigate("/login", { replace: true });
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
            <p className="type-body-hi hi" lang="hi">
              अपनी प्रोफाइल, पसंद की भाषा और अकाउंट जानकारी यहां से बदलें।
            </p>
          </div>
        </section>

        <ProfileIdentityCard
          name={name}
          selectedUserType={selectedUserType}
          state={formState.state}
          caste={formState.caste}
        />

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
          lang={lang}
          onNameChange={(value) => setName(normalizeName(value))}
          onLangChange={setLang}
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

      <BottomNav active="profile" />
    </main>
  );
}
