import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { setAppLanguage } from "../i18n/language";
import LanguageToggle from "../components/LanguageToggle";
import {
  completeRegistration,
  fetchCurrentUser,
  getPostRegistrationDestination,
} from "../lib/registrationApi";

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 120);
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lang, setLang] = useState("hi");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const isValid = useMemo(() => normalizeName(name).trim().length >= 2, [name]);

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

        if (user?.lang) {
          setLang(user.lang);
          setAppLanguage(user.lang);
        }

        if (user?.name) {
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
  }, [navigate, t]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValid) {
      setError(t("auth.register.nameError"));
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await completeRegistration({
        name: normalizeName(name).trim(),
        lang,
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

            <div className="register-language-shell">
              <LanguageToggle
                value={lang}
                onChange={handleLanguageChange}
                disabled={isLoading || isCheckingUser}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading || isCheckingUser}
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
