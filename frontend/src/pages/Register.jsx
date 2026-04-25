import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getStoredAppLanguage, setAppLanguage } from "../i18n/language";
import LanguageToggle from "../components/LanguageToggle";
import { blobToDataUrl, resizeImageBlobToSquareBlob } from "../lib/photoCapture";
import { uploadProfilePhoto } from "../lib/photoUploadApi";
import {
  completeRegistration,
  fetchCurrentUser,
  getPostRegistrationDestination,
} from "../lib/registrationApi";

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 120);
}

const CAPTURE_PHOTO_QUALITY = 0.8;

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lang, setLang] = useState(() => getStoredAppLanguage() || "hi");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBlob, setPhotoBlob] = useState(null);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const isValid = useMemo(
    () => normalizeName(name).trim().length >= 2 && Boolean(photoUrl),
    [name, photoUrl]
  );

  function stopCameraStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraOpen]);

  async function handleLanguageChange(nextLang) {
    setLang(nextLang);
    setError("");
    await setAppLanguage(nextLang);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const user = await fetchCurrentUser();
        if (!isMounted) {
          return;
        }

        const storedLang = getStoredAppLanguage();

        if (!storedLang && user?.lang) {
          setLang(user.lang);
          setAppLanguage(user.lang);
        }

        if (user?.name) {
          setName(user.name);
        }

        if (user?.photoUrl) {
          setPhotoUrl(user.photoUrl);
          setPhotoBlob(null);
        }

        if (user?.name && user?.photoUrl) {
          const nextPath = await getPostRegistrationDestination();
          if (isMounted) {
            navigate(nextPath, { replace: true });
          }
          return;
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || t("auth.register.loadError"));
        }
      } finally {
        if (isMounted) {
          setIsCheckingUser(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleUsePhoto(nextPhotoBlob) {
    setPhotoBlob(nextPhotoBlob);
    setPhotoUrl(await blobToDataUrl(nextPhotoBlob));
    setCameraOpen(false);
    stopCameraStream();
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        t("auth.register.cameraUnsupported", {
          defaultValue: "Camera is not available on this device. Upload a photo instead.",
        })
      );
      return;
    }

    try {
      setIsOpeningCamera(true);
      setError("");
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraError) {
      setError(
        cameraError.message ||
          t("auth.register.cameraError", {
            defaultValue: "Could not open the camera right now.",
          })
      );
    } finally {
      setIsOpeningCamera(false);
    }
  }

  async function handleCapturePhoto() {
    if (!videoRef.current) {
      return;
    }

    try {
      setIsProcessingPhoto(true);
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          t("auth.register.cameraError", {
            defaultValue: "Could not open the camera right now.",
          })
        );
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const captured = await new Promise((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(
                new Error(
                  t("auth.register.photoProcessError", {
                    defaultValue: "Could not prepare the photo. Please try again.",
                  })
                )
              );
              return;
            }

            try {
              resolve(await resizeImageBlobToSquareBlob(blob));
            } catch (processingError) {
              reject(processingError);
            }
          },
          "image/jpeg",
          CAPTURE_PHOTO_QUALITY
        );
      });

      await handleUsePhoto(captured);
    } catch (captureError) {
      setError(
        captureError.message ||
          t("auth.register.photoProcessError", {
            defaultValue: "Could not prepare the photo. Please try again.",
          })
      );
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsProcessingPhoto(true);
      setError("");
      const processed = await resizeImageBlobToSquareBlob(file);
      setPhotoBlob(processed);
      setPhotoUrl(await blobToDataUrl(processed));
      setCameraOpen(false);
      stopCameraStream();
    } catch (fileError) {
      setError(
        fileError.message ||
          t("auth.register.photoProcessError", {
            defaultValue: "Could not prepare the photo. Please try again.",
          })
      );
    } finally {
      setIsProcessingPhoto(false);
      event.target.value = "";
    }
  }

  function handleRemovePhoto() {
    setPhotoUrl("");
    setPhotoBlob(null);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (normalizeName(name).trim().length < 2) {
      setError(t("auth.register.nameError"));
      return;
    }

    if (!photoUrl) {
      setError(
        t("auth.register.photoRequired", {
          defaultValue: "Please add your photo before continuing.",
        })
      );
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const uploadedPhotoUrl = photoBlob
        ? await uploadProfilePhoto(photoBlob, {
            folder: "yojnapath/profiles",
            publicId: `user_${Date.now()}`,
            filename: "registration-photo.jpg",
          })
        : photoUrl;
      await completeRegistration({
        name: normalizeName(name).trim(),
        lang,
        photoUrl: uploadedPhotoUrl,
        photoType: "upload",
      });
      await setAppLanguage(lang);
      const nextPath = await getPostRegistrationDestination();
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message || t("auth.register.saveError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[375px] items-center">
        <div className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              {t("auth.register.eyebrow")}
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-slate-950">
              {t("auth.register.title")}
            </h1>
            <p className="text-sm leading-6 text-slate-500">{t("auth.register.subtitle")}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                {t("auth.register.nameLabel")}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(normalizeName(event.target.value));
                  setError("");
                }}
                placeholder={t("auth.register.namePlaceholder")}
                disabled={isLoading || isCheckingUser}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  {t("auth.register.photoLabel", { defaultValue: "Your photo" })}
                </label>
                <p className="text-sm leading-6 text-slate-500">
                  {t("auth.register.photoHint", {
                    defaultValue:
                      "Take a clear face photo now. You can use the camera or upload one from your gallery.",
                  })}
                </p>
              </div>

              {photoUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3">
                    <img
                      src={photoUrl}
                      alt={t("auth.register.photoPreviewAlt", {
                        defaultValue: "Selected profile photo",
                      })}
                      className="h-20 w-20 rounded-full border border-emerald-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {t("auth.register.photoReadyTitle", { defaultValue: "Photo ready" })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("auth.register.photoReadyBody", {
                          defaultValue: "This picture will be used as your profile photo after signup.",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={isLoading || isCheckingUser || isOpeningCamera || isProcessingPhoto}
                      className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("auth.register.retakePhoto", { defaultValue: "Retake photo" })}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isLoading || isCheckingUser || isProcessingPhoto}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("auth.register.removePhoto", { defaultValue: "Remove photo" })}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-28 items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-white text-center">
                    <div className="space-y-1 px-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {t("auth.register.photoEmptyTitle", {
                          defaultValue: "Add your profile photo",
                        })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("auth.register.photoEmptyBody", {
                          defaultValue:
                            "This helps show the right person on profile and assisted CSC flows.",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      disabled={isLoading || isCheckingUser || isOpeningCamera || isProcessingPhoto}
                      className="flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      {isOpeningCamera
                        ? t("auth.register.openingCamera", {
                            defaultValue: "Opening camera...",
                          })
                        : t("auth.register.openCamera", { defaultValue: "Open camera" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isCheckingUser || isProcessingPhoto}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("auth.register.uploadPhoto", { defaultValue: "Upload from gallery" })}
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {cameraOpen ? (
                <div className="space-y-3 rounded-3xl border border-emerald-100 bg-white p-3">
                  <div className="overflow-hidden rounded-[24px] bg-slate-950">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      disabled={isProcessingPhoto}
                      className="flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      {isProcessingPhoto
                        ? t("auth.register.processingPhoto", {
                            defaultValue: "Preparing photo...",
                          })
                        : t("auth.register.capturePhoto", { defaultValue: "Take photo" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraOpen(false);
                        stopCameraStream();
                      }}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {t("common.buttons.cancel")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="register-language-shell">
              <LanguageToggle
                value={lang}
                onChange={handleLanguageChange}
                disabled={isLoading}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading || isCheckingUser || !isValid}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isCheckingUser
                ? t("auth.register.loading")
                : isLoading
                  ? t("auth.register.saving")
                  : t("auth.register.continue")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
