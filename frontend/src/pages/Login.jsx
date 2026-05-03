import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import InstallAppButton from "../components/InstallAppButton";
import { fetchSavedProfile, isProfileReadyForMatching } from "../lib/onboardApi";
import { loadGoogleIdentityScript } from "../lib/googleAuth";
import { setTempDebugOtp } from "../utils/auth";
import { apiPost } from "../utils/api";

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState("phone");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleRenderedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  function getOptionClass(option) {
    const isActive = type === option;
    return [
      "rounded-xl border p-3 text-center transition-all duration-200",
      isActive
        ? "border-emerald-500 bg-emerald-50 shadow-[0_10px_24px_rgba(5,150,105,0.14)] ring-2 ring-emerald-200"
        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-100",
    ].join(" ");
  }

  function getIconClass(option) {
    return [
      "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
      type === option ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700",
    ].join(" ");
  }

  function getLabelClass(option) {
    return type === option
      ? "text-sm font-semibold text-emerald-900"
      : "text-sm font-medium text-slate-900";
  }

  function normalizeIdentifier(value, loginType) {
    if (loginType === "phone") {
      return value.replace(/\D/g, "").slice(0, 10);
    }
    return value.toLowerCase().trim().slice(0, 100);
  }

  function handleIdentifierChange(event) {
    const value = event.target.value;
    setIdentifier(normalizeIdentifier(value, type));
    setError("");
  }

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    let isMounted = true;

    async function setupGoogleButton() {
      try {
        const google = await loadGoogleIdentityScript();
        if (!isMounted || !googleButtonRef.current || !google?.accounts?.id) {
          return;
        }

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response?.credential) {
              setError(t("auth.login.googleError", { defaultValue: "Could not sign in with Google." }));
              return;
            }

            try {
              setIsGoogleLoading(true);
              setError("");
              const payload = await apiPost("/api/auth/google", {
                credential: response.credential,
                lang: i18n.resolvedLanguage === "en" ? "en" : "hi",
              });

              localStorage.setItem("tempAuthType", "google");
              localStorage.setItem("tempAuthIdentifier", payload?.user?.email || "");
              localStorage.setItem("yojnapath_auth_token", payload.token);
              setTempDebugOtp("");

              if (payload.needsRegistration) {
                navigate("/register", { replace: true });
                return;
              }

              const savedProfile = await fetchSavedProfile();
              navigate(isProfileReadyForMatching(savedProfile) ? "/results" : "/onboard", {
                replace: true,
              });
            } catch (submitError) {
              setError(
                submitError.message ||
                  t("auth.login.googleError", { defaultValue: "Could not sign in with Google." })
              );
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });

        if (!googleRenderedRef.current) {
          google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            text: "continue_with",
            shape: "pill",
            size: "large",
            width: "320",
          });
          googleRenderedRef.current = true;
        }

        setGoogleReady(true);
      } catch (loadError) {
        if (isMounted) {
          setGoogleReady(false);
        }
      }
    }

    setupGoogleButton();

    return () => {
      isMounted = false;
    };
  }, [googleClientId, i18n.resolvedLanguage, navigate, t]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (type === "phone" && identifier.length !== 10) {
      setError(t("auth.login.invalidPhone"));
      return;
    }

    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError(t("auth.login.invalidEmail"));
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const payload = await apiPost("/api/auth/login", { type, identifier });
      localStorage.setItem("tempAuthType", type);
      localStorage.setItem("tempAuthIdentifier", identifier);
      setTempDebugOtp(payload?.debugOtp || "");
      navigate("/verify", { state: { type, identifier } });
    } catch (submitError) {
      setError(submitError.message || t("auth.login.sendOtpError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[420px] items-center">
        <div className="w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mb-8 space-y-3">
            <BrandLogo variant="dark" alt="YojnaPath" className="mb-2" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              {t("auth.login.eyebrow")}
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-slate-950">
              {t("auth.login.title")}
            </h1>
            <p className="text-sm leading-6 text-slate-500">{t("auth.login.subtitle")}</p>
            <InstallAppButton
              buttonClassName="install-app-button install-app-button--surface"
              hintClassName="install-app__hint--surface"
            />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {googleClientId ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div ref={googleButtonRef} className="flex min-h-11 items-center justify-center" />
                  {!googleReady ? (
                    <div className="mt-2 text-center text-sm font-medium text-slate-500">
                      {isGoogleLoading
                        ? t("auth.login.googleLoading", { defaultValue: "Signing in with Google..." })
                        : t("auth.login.googleCta", { defaultValue: "Continue with Google" })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {t("auth.login.orDivider", { defaultValue: "Or use OTP" })}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
            ) : null}

            <div className="mb-4 space-y-3">
              <label className="text-sm font-medium text-slate-700">{t("auth.login.methodLabel")}</label>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="phone"
                    checked={type === "phone"}
                    onChange={(event) => setType(event.target.value)}
                    className="sr-only"
                  />
                  <div className={getOptionClass("phone")}>
                    <div className={getIconClass("phone")}>PH</div>
                    <div className={getLabelClass("phone")}>Phone</div>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="email"
                    checked={type === "email"}
                    onChange={(event) => setType(event.target.value)}
                    className="sr-only"
                  />
                  <div className={getOptionClass("email")}>
                    <div className={getIconClass("email")}>&#64;</div>
                    <div className={getLabelClass("email")}>{t("auth.login.emailLabel")}</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                {type === "phone" ? t("auth.login.phoneLabel") : t("auth.login.emailLabel")}
              </label>
              <input
                id="identifier"
                type={type === "phone" ? "tel" : "email"}
                inputMode={type === "phone" ? "numeric" : "email"}
                autoComplete={type === "phone" ? "tel" : "email"}
                placeholder={
                  type === "phone" ? t("auth.login.phonePlaceholder") : t("auth.login.emailPlaceholder")
                }
                value={identifier}
                onChange={handleIdentifierChange}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="text-xs text-slate-500">
                {type === "phone" ? t("auth.login.phoneHint") : t("auth.login.emailHint")}
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isLoading ? t("auth.login.sendingOtp") : t("auth.login.sendOtp")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
