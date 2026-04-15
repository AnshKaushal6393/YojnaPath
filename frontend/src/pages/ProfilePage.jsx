import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AccountSection from "../components/AccountSection";
import BottomNav from "../components/BottomNav";
import FamilyProfilesPanel from "../components/FamilyProfilesPanel";
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
import { resizeImageBlobToDataUrl } from "../lib/photoCapture";
import { completeRegistration, fetchCurrentUser } from "../lib/registrationApi";
import { clearStoredPhone, clearToken } from "../utils/auth";
import AdaptiveForm from "../components/AdaptiveForm";

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

async function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the photo for duplicate check."));
    image.src = dataUrl;
  });
}

async function createPhotoFingerprint(photoUrl) {
  if (!photoUrl) {
    return "";
  }

  const image = await loadImageFromDataUrl(photoUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  context.drawImage(image, 0, 0, 8, 8);
  const { data } = context.getImageData(0, 0, 8, 8);
  const values = [];

  for (let index = 0; index < data.length; index += 4) {
    values.push((data[index] + data[index + 1] + data[index + 2]) / 3);
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => (value >= average ? "1" : "0")).join("");
}

function getHammingDistance(left, right) {
  if (!left || !right || left.length !== right.length) {
    return Number.POSITIVE_INFINITY;
  }

  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      distance += 1;
    }
  }

  return distance;
}

export default function ProfilePage() {
  const { t } = useTranslation();
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
  const [newMemberPhotoUrl, setNewMemberPhotoUrl] = useState("");
  const [lang, setLang] = useState("hi");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pendingDeleteMember, setPendingDeleteMember] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [isOpeningMemberCamera, setIsOpeningMemberCamera] = useState(false);
  const [isProcessingMemberPhoto, setIsProcessingMemberPhoto] = useState(false);
  const [memberCameraOpen, setMemberCameraOpen] = useState(false);
  const hasTouchedProfileRef = useRef(false);
  const hasPrefilledProfileRef = useRef(false);
  const hasPrefilledAccountRef = useRef(false);
  const memberVideoRef = useRef(null);
  const memberFileInputRef = useRef(null);
  const memberStreamRef = useRef(null);

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
    setPhotoUrl(currentUserQuery.data.photoUrl || "");
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
    if (!savedProfileQuery.data || hasTouchedProfileRef.current || hasPrefilledProfileRef.current) {
      return;
    }

    setSelectedUserType(savedProfileQuery.data.selectedUserType || "farmer");
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
          photoUrl: savedProfileQuery.data.photoUrl,
        }
      )
    );
  }, [savedProfileQuery.data]);

  useEffect(() => {
    if (!memberCameraOpen || !memberVideoRef.current || !memberStreamRef.current) {
      return;
    }

    memberVideoRef.current.srcObject = memberStreamRef.current;
    memberVideoRef.current.play().catch(() => {});
  }, [memberCameraOpen]);

  useEffect(() => {
    return () => {
      if (memberStreamRef.current) {
        memberStreamRef.current.getTracks().forEach((track) => track.stop());
        memberStreamRef.current = null;
      }
    };
  }, []);

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
      setSubmitMessage(t("profileMessages.profileUpdated"));
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || t("profileMessages.profileSaveError"));
      setSubmitMessage("");
    },
  });

  const accountMutation = useMutation({
    mutationFn: () =>
      completeRegistration({
        name: normalizeName(name).trim(),
        lang,
        photoUrl: photoUrl || undefined,
      }),
    onSuccess: async (user) => {
      setName(user?.name || name);
      setLang(user?.lang || lang);
      setPhotoUrl(user?.photoUrl || photoUrl);
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setSubmitMessage(t("profileMessages.accountUpdated"));
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || t("profileMessages.accountSaveError"));
      setSubmitMessage("");
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: () =>
      saveProfileToBackend("", createEmptyFormState(), lang, {
        profileName: newMemberName.trim(),
        photoUrl: newMemberPhotoUrl,
      }),
    onSuccess: async (result) => {
      const createdProfileId = result.profile?.id || "";
      const createdProfileName = newMemberName.trim();
      const createdUserType = result.profile?.occupation || "farmer";
      const createdFormState = createEmptyFormState();
      const createdPhotoUrl = newMemberPhotoUrl;

      saveProfileDraft(
        buildOnboardDraft(createdUserType, createdFormState, "synced", {
          id: createdProfileId,
          profileName: createdProfileName,
          photoUrl: createdPhotoUrl,
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
      setSubmitMessage(t("profileMessages.memberCreated"));
      setSubmitError("");
    },
    onError: (error) => {
      setSubmitError(error.message || t("profileMessages.memberCreateError"));
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

      setActiveProfileIdState(nextActiveProfileId || "");

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
      setSubmitMessage(t("profileMessages.memberDeleted"));
      setSubmitError("");
    },
    onError: (error) => {
      setPendingDeleteMember(null);
      setSubmitError(error.message || t("profileMessages.memberDeleteError"));
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
    return (
      memberName.trim().length >= 2 && requiredFields.every((field) => Boolean(formState[field]))
    );
  }, [formState, memberName, selectedUserType]);

  const canSaveNewMember = useMemo(() => {
    return newMemberName.trim().length >= 2 && Boolean(newMemberPhotoUrl);
  }, [newMemberName, newMemberPhotoUrl]);

  const accountOwnerHasProfile = useMemo(() => {
    const ownerName = normalizeComparisonName(name);
    if (!ownerName) {
      return false;
    }

    return (profileMembersQuery.data || []).some(
      (member) => normalizeComparisonName(member.profileName) === ownerName
    );
  }, [name, profileMembersQuery.data]);

  const accountOwnerProfileId = useMemo(() => {
    const ownerName = normalizeComparisonName(name);
    if (!ownerName) {
      return "";
    }

    return (
      (profileMembersQuery.data || []).find(
        (member) => normalizeComparisonName(member.profileName) === ownerName
      )?.id || ""
    );
  }, [name, profileMembersQuery.data]);

  const isOwnerProfile = useMemo(() => {
    const ownerName = normalizeComparisonName(name);
    const currentMemberName = normalizeComparisonName(memberName);

    if (activeProfileId && accountOwnerProfileId) {
      return activeProfileId === accountOwnerProfileId;
    }

    return Boolean(ownerName && currentMemberName && ownerName === currentMemberName);
  }, [activeProfileId, accountOwnerProfileId, memberName, name]);

  function resetCreateMemberModal() {
    setShowCreateMemberModal(false);
    setNewMemberName("");
    setNewMemberUserType("farmer");
    setNewMemberFormState(createEmptyFormState());
    setNewMemberPhotoUrl("");
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
    setMemberCameraOpen(false);
    setIsOpeningMemberCamera(false);
    setIsProcessingMemberPhoto(false);
    if (memberStreamRef.current) {
      memberStreamRef.current.getTracks().forEach((track) => track.stop());
      memberStreamRef.current = null;
    }
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
      setSubmitError(t("profileMessages.completeProfileFields"));
      setSubmitMessage("");
      return;
    }

    await profileMutation.mutateAsync();
  }

  async function handleAccountSave() {
    if (normalizeName(name).trim().length < 2) {
      setSubmitError(t("profileMessages.enterName"));
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
    setSelectedUserType(member.selectedUserType || "farmer");
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
    setNewMemberPhotoUrl("");
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
    setPendingDeleteMember(null);
    setSubmitMessage("");
    setSubmitError("");
  }

  function handleCreateOwnerProfile() {
    setShowCreateMemberModal(true);
    setNewMemberName(normalizeName(name));
    setNewMemberPhotoUrl(photoUrl || "");
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
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

  function stopMemberCameraStream() {
    if (memberStreamRef.current) {
      memberStreamRef.current.getTracks().forEach((track) => track.stop());
      memberStreamRef.current = null;
    }
  }

  async function handleOpenMemberCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSubmitError("Camera is not available on this device. Upload a photo instead.");
      setSubmitMessage("");
      return;
    }

    try {
      setIsOpeningMemberCamera(true);
      setSubmitError("");
      stopMemberCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      memberStreamRef.current = stream;
      setMemberCameraOpen(true);
    } catch (error) {
      setSubmitError(error.message || "Could not open the camera right now.");
      setSubmitMessage("");
    } finally {
      setIsOpeningMemberCamera(false);
    }
  }

  async function handleCaptureMemberPhoto() {
    if (!memberVideoRef.current) {
      return;
    }

    try {
      setIsProcessingMemberPhoto(true);
      setSubmitError("");
      const video = memberVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not open the camera right now.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const captured = await new Promise((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Could not prepare the photo. Please try again."));
              return;
            }

            try {
              resolve(await resizeImageBlobToDataUrl(blob));
            } catch (error) {
              reject(error);
            }
          },
          "image/jpeg",
          0.8
        );
      });

      setNewMemberPhotoUrl(captured);
      setDuplicateWarning(null);
      setDuplicateConfirmed(false);
      setMemberCameraOpen(false);
      stopMemberCameraStream();
    } catch (error) {
      setSubmitError(error.message || "Could not prepare the photo. Please try again.");
      setSubmitMessage("");
    } finally {
      setIsProcessingMemberPhoto(false);
    }
  }

  async function handleMemberPhotoFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsProcessingMemberPhoto(true);
      setSubmitError("");
      const processed = await resizeImageBlobToDataUrl(file);
      setNewMemberPhotoUrl(processed);
      setDuplicateWarning(null);
      setDuplicateConfirmed(false);
      setMemberCameraOpen(false);
      stopMemberCameraStream();
    } catch (error) {
      setSubmitError(error.message || "Could not prepare the photo. Please try again.");
      setSubmitMessage("");
    } finally {
      setIsProcessingMemberPhoto(false);
      event.target.value = "";
    }
  }

  async function findDuplicateMemberCandidate() {
    const normalizedNewName = normalizeComparisonName(newMemberName);
    const isCreatingOwnerProfile =
      Boolean(normalizedNewName) &&
      normalizedNewName === normalizeComparisonName(name) &&
      Boolean(photoUrl) &&
      newMemberPhotoUrl === photoUrl;

    if (isCreatingOwnerProfile && !accountOwnerHasProfile) {
      return null;
    }

    const comparisonPool = [
      ...(photoUrl
        ? [
            {
              label: name || "account owner",
              name: normalizeComparisonName(name),
              photoUrl,
            },
          ]
        : []),
      ...((profileMembersQuery.data || []).map((member) => ({
        label: member.profileName || "family member",
        name: normalizeComparisonName(member.profileName),
        photoUrl: member.photoUrl || "",
      }))),
    ];

    const sameNameCandidate = comparisonPool.find(
      (entry) => normalizedNewName && entry.name && entry.name === normalizedNewName
    );

    if (sameNameCandidate) {
      return `${sameNameCandidate.label} already has the same name. Please confirm this is a different person.`;
    }

    if (!newMemberPhotoUrl) {
      return null;
    }

    try {
      const nextFingerprint = await createPhotoFingerprint(newMemberPhotoUrl);
      for (const entry of comparisonPool) {
        if (!entry.photoUrl) {
          continue;
        }

        const currentFingerprint = await createPhotoFingerprint(entry.photoUrl);
        if (getHammingDistance(nextFingerprint, currentFingerprint) <= 6) {
          return `${entry.label} already has a very similar photo. Please confirm this is a different person before saving.`;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  async function handleCreateMemberSubmit(event) {
    event.preventDefault();

    if (!canSaveNewMember) {
      setSubmitError(
        newMemberPhotoUrl
          ? t("profileMessages.completeMemberFields")
          : "Please add the family member photo before saving."
      );
      setSubmitMessage("");
      return;
    }

    const duplicateMessage = await findDuplicateMemberCandidate();
    if (duplicateMessage && !duplicateConfirmed) {
      setDuplicateWarning(duplicateMessage);
      setSubmitError("");
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
            <p className="eyebrow">{t("profilePage.eyebrow")}</p>
            <h1 className="type-h1">{t("profilePage.title")}</h1>
            <p className="type-body-en">{t("profilePage.subtitle")}</p>
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
          accountOwnerProfileId={accountOwnerProfileId}
        />

        <ProfileIdentityCard
          name={memberName || name}
          photoUrl={isOwnerProfile ? photoUrl : savedProfileQuery.data?.photoUrl || ""}
          selectedUserType={selectedUserType}
          state={formState.state}
          caste={formState.caste}
        />

        <section className="profile-card">
          <label className="demo-field">
            <span className="type-label">
              {isOwnerProfile ? t("profilePage.profileName") : t("profilePage.memberName")}
            </span>
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
              placeholder={
                isOwnerProfile
                  ? t("profilePage.profileNamePlaceholder")
                  : t("profilePage.memberNamePlaceholder")
              }
              autoComplete="off"
            />
          </label>
        </section>

        <form id="profile-form" className="profile-form-shell" onSubmit={handleProfileSubmit}>
          <ProfileForm
            selectedUserType={selectedUserType}
            formState={formState}
            onUserTypeChange={handleUserTypeChange}
            onFormStateChange={handleFormStateChange}
            isSubmitting={profileMutation.isPending}
            allowUserTypeChange={!isOwnerProfile || !savedProfileQuery.data?.selectedUserType}
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
              <p className="eyebrow">{t("profilePage.newMemberEyebrow")}</p>
              <h2 id="create-member-title" className="type-h2">
                {t("profilePage.newMemberTitle")}
              </h2>
              <p className="type-caption">{t("profilePage.newMemberSubtitle")}</p>
            </div>

            <form
              id="create-member-profile-form"
              className="profile-create-modal__form"
              onSubmit={handleCreateMemberSubmit}
            >
              <section className="profile-card">
                <label className="demo-field">
                  <span className="type-label">{t("profilePage.memberName")}</span>
                  <input
                    type="text"
                    className="demo-select"
                    value={newMemberName}
                    onChange={(event) => {
                      setNewMemberName(normalizeName(event.target.value));
                      setDuplicateWarning(null);
                      setDuplicateConfirmed(false);
                    }}
                    placeholder={t("profilePage.memberNamePlaceholder")}
                    autoComplete="off"
                  />
                </label>
              </section>

              <section className="profile-card">
                <div className="space-y-3">
                  <div className="section-heading">
                    <h3 className="type-h2">Family member photo</h3>
                    <p className="type-caption">
                      Add a clear face photo so CSC workers can confirm the correct person.
                    </p>
                  </div>

                  {newMemberPhotoUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3">
                        <img
                          src={newMemberPhotoUrl}
                          alt="Selected family member"
                          className="h-20 w-20 rounded-full border border-emerald-100 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">Photo ready</p>
                          <p className="text-sm text-slate-500">
                            This picture will be saved with the family member profile.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="onboard-secondary-button"
                          onClick={handleOpenMemberCamera}
                          disabled={isOpeningMemberCamera || isProcessingMemberPhoto}
                        >
                          Retake photo
                        </button>
                        <button
                          type="button"
                          className="onboard-logout-button"
                          onClick={() => setNewMemberPhotoUrl("")}
                          disabled={isProcessingMemberPhoto}
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        className="onboard-secondary-button"
                        onClick={handleOpenMemberCamera}
                        disabled={isOpeningMemberCamera || isProcessingMemberPhoto}
                      >
                        {isOpeningMemberCamera ? "Opening camera..." : "Open camera"}
                      </button>
                      <button
                        type="button"
                        className="onboard-secondary-button"
                        onClick={() => memberFileInputRef.current?.click()}
                        disabled={isProcessingMemberPhoto}
                      >
                        Upload from gallery
                      </button>
                    </div>
                  )}

                  <input
                    ref={memberFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleMemberPhotoFileChange}
                    className="hidden"
                  />

                  {memberCameraOpen ? (
                    <div className="space-y-3 rounded-3xl border border-emerald-100 bg-white p-3">
                      <div className="overflow-hidden rounded-[24px] bg-slate-950">
                        <video
                          ref={memberVideoRef}
                          playsInline
                          muted
                          autoPlay
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="onboard-secondary-button"
                          onClick={handleCaptureMemberPhoto}
                          disabled={isProcessingMemberPhoto}
                        >
                          {isProcessingMemberPhoto ? "Preparing photo..." : "Take photo"}
                        </button>
                        <button
                          type="button"
                          className="onboard-logout-button"
                          onClick={() => {
                            setMemberCameraOpen(false);
                            stopMemberCameraStream();
                          }}
                        >
                          {t("common.buttons.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="profile-card">
                <div className="section-heading">
                  <h3 className="type-h2">Create member</h3>
                  <p className="type-caption">
                    Save the person first with name and photo. We will ask scheme-matching details
                    after that.
                  </p>
                </div>

                {duplicateWarning ? (
                  <div className="onboard-feedback state-info" role="alert">
                    <span className="type-caption">{duplicateWarning}</span>
                    <button
                      type="button"
                      className="onboard-feedback__action"
                      onClick={() => setDuplicateConfirmed(true)}
                    >
                      Continue anyway
                    </button>
                  </div>
                ) : null}

                <div className="profile-create-modal__actions">
                  <button
                    type="submit"
                    className="demo-submit-button btn-primary onboard-submit"
                    disabled={createMemberMutation.isPending || !canSaveNewMember}
                  >
                    {createMemberMutation.isPending ? t("common.buttons.saving") : t("profilePage.newMemberTitle")}
                  </button>
                  <button
                    type="button"
                    className="onboard-logout-button"
                    onClick={resetCreateMemberModal}
                  >
                    {t("common.buttons.cancel")}
                  </button>
                </div>
              </section>
            </form>
          </section>
        </div>
      ) : null}

      <BottomNav active="profile" />
    </main>
  );
}
