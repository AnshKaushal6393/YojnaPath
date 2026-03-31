import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeRegistration, fetchCurrentUser, getPostRegistrationDestination } from "../lib/registrationApi";

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 120);
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lang, setLang] = useState("hi");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const isValid = useMemo(() => normalizeName(name).trim().length >= 2, [name]);

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
          setError(loadError.message || "Could not load your account.");
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValid) {
      setError("Please enter your name.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await completeRegistration({
        name: normalizeName(name).trim(),
        lang,
      });
      const nextPath = await getPostRegistrationDestination();
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Could not save your details.");
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
              Welcome
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-slate-950">
              Complete your account
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Add your name once so the app can greet you properly and save your account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Your name
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
                placeholder="Enter your full name"
                disabled={isLoading || isCheckingUser}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">Preferred language</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "hi", label: "हिंदी" },
                  { value: "en", label: "English" },
                ].map((option) => {
                  const isSelected = lang === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLang(option.value);
                        setError("");
                      }}
                      disabled={isLoading || isCheckingUser}
                      className={`flex h-14 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      } disabled:cursor-not-allowed disabled:bg-slate-50`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

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
              {isCheckingUser ? "Loading..." : isLoading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
