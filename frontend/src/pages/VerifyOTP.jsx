import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import OTPInput from "../components/OTPInput";
import { fetchSavedProfile, isProfileReadyForMatching } from "../lib/onboardApi";
import { apiPost } from "../utils/api";
import { getTempAuthData, getTempDebugOtp, setTempAuthData, setTempDebugOtp, setToken } from "../utils/auth";


const RESEND_SECONDS = 30;

function normalizeOtp(value) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function VerifyOTP() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
const { type: typeFromState, identifier: identifierFromState } = location.state || {};
  const tempData = useMemo(() => getTempAuthData(), []);
  const type = typeFromState || tempData?.type || 'phone';
  const identifier = identifierFromState || tempData?.identifier || '';
  const [debugOtp, setDebugOtpValue] = useState(() => getTempDebugOtp());

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  if (!identifier) {
    return <Navigate to="/login" replace />;
  }

  async function handleVerify(event) {
    event.preventDefault();

    if (otp.length !== 6) {
      setError(t("auth.verify.invalidOtp"));
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const payload = await apiPost("/api/auth/verify", {
        type,
        identifier,
        otp: normalizeOtp(otp),
      });
      setToken(payload.token);
      setTempAuthData(type, identifier);
      setTempDebugOtp("");

      if (payload.needsRegistration) {
        navigate("/register", { replace: true });
        return;
      }


      const savedProfile = await fetchSavedProfile();
      navigate(isProfileReadyForMatching(savedProfile) ? "/results" : "/onboard", {
        replace: true,
      });
    } catch (verifyError) {
      setError(verifyError.message || t("auth.verify.verifyError"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) {
      return;
    }

    try {
      setIsResending(true);
      setError("");
      const payload = await apiPost("/api/auth/login", { type, identifier });
      setTempAuthData(type, identifier);
      const nextDebugOtp = payload?.debugOtp || "";
      setTempDebugOtp(nextDebugOtp);
      setDebugOtpValue(nextDebugOtp);

      setCountdown(RESEND_SECONDS);
    } catch (resendError) {
      setError(resendError.message || t("auth.verify.resendError"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-93.75 items-center">
        <div className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              {t("auth.verify.eyebrow")}
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-slate-950">
              {t("auth.verify.title")}
            </h1>
  <p className="text-sm leading-6 text-slate-500">
    {t("auth.verify.sentTo", { identifier, phone: identifier })}
    <span className="ml-1 text-xs text-emerald-600 font-medium">({type.toUpperCase()})</span>
  </p>
  {type === "phone" && debugOtp ? (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Your OTP for this number is <span className="font-semibold tracking-[0.25em]">{debugOtp}</span>
    </div>
  ) : null}
  </div>

  <form className="space-y-5" onSubmit={handleVerify}>
    <OTPInput
      value={otp}
      onChange={(value) => {
        setOtp(normalizeOtp(value));
        setError("");
      }}
      disabled={isLoading}
    />


            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isLoading ? t("auth.verify.verifying") : t("auth.verify.verify")}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isResending ? t("auth.verify.resending") : t("auth.verify.resend")}
            </button>
            <span className="text-sm text-slate-500">
              {countdown > 0
                ? t("auth.verify.resendIn", { count: countdown })
                : t("auth.verify.resendNow")}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
