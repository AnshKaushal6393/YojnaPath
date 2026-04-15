import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import InstallAppButton from "../components/InstallAppButton";
import { apiPost } from "../utils/api";
import { setStoredPhone } from "../utils/auth";

function normalizePhone(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handlePhoneChange(event) {
    setPhone(normalizePhone(event.target.value));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (phone.length !== 10) {
      setError(t("auth.login.invalidPhone"));
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await apiPost("/api/auth/login", { phone });
      setStoredPhone(phone);
      navigate("/verify", { state: { phone } });
    } catch (submitError) {
      setError(submitError.message || t("auth.login.sendOtpError"));
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
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                {t("auth.login.phoneLabel")}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={t("auth.login.phonePlaceholder")}
                value={phone}
                onChange={handlePhoneChange}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="text-xs text-slate-500">{t("auth.login.phoneHint")}</p>
            </div>

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
              {isLoading ? t("auth.login.sendingOtp") : t("auth.login.sendOtp")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
