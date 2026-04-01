import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import KioskForm from "../components/KioskForm";
import KioskPdfExport from "../components/KioskPdfExport";
import KioskResults from "../components/KioskResults";
import { clearKioskSession, fetchKioskMatches, loginKiosk } from "../lib/kioskApi";

export default function KioskPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const kioskMutation = useMutation({
    mutationFn: async (formState) => {
      await loginKiosk(formState.kioskCode);

      return fetchKioskMatches({
        state: formState.state,
        occupation: formState.occupation,
        annualIncome: formState.annualIncome ? Number(formState.annualIncome) : 0,
        caste: formState.caste || null,
        gender: formState.gender || null,
        age: formState.age ? Number(formState.age) : null,
        landAcres: formState.landAcres ? Number(formState.landAcres) : 0,
        disabilityPct: formState.disabilityPct ? Number(formState.disabilityPct) : 0,
        isStudent: Boolean(formState.isStudent),
      });
    },
    onSuccess: (payload) => {
      setResults(payload);
      setError("");
    },
    onError: (mutationError) => {
      setError(mutationError.message || "Could not generate kiosk results right now.");
      setResults(null);
    },
  });

  return (
    <main className="app-shell">
      <div className="kiosk-page">
        <section className="kiosk-hero">
          <div className="section-heading">
            <p className="eyebrow">KIOSK</p>
            <h1 className="type-h1">CSC worker kiosk interface</h1>
            <p className="type-body-en">
              Run quick guided matches for walk-in visitors and export a printable result sheet.
            </p>
          </div>
          <div className="kiosk-hero__actions">
            <Link to="/" className="detail-card__secondary-button">
              Back to home
            </Link>
            <button
              type="button"
              className="onboard-logout-button"
              onClick={() => {
                clearKioskSession();
                setResults(null);
                setError("");
              }}
            >
              Clear kiosk session
            </button>
          </div>
        </section>

        <KioskForm onSubmit={(formState) => kioskMutation.mutate(formState)} isBusy={kioskMutation.isPending} />

        {error ? (
          <section className="kiosk-card">
            <div className="onboard-feedback state-danger" role="alert">
              <span className="type-caption">{error}</span>
            </div>
          </section>
        ) : null}

        {results ? (
          <>
            <section className="kiosk-card kiosk-card__actions">
              <KioskPdfExport pdfData={results.pdfData} disabled={!results.pdfData} />
            </section>
            <KioskResults results={results} />
          </>
        ) : (
          !kioskMutation.isPending && (
            <section className="kiosk-card">
              <EmptyState
                title="No kiosk results yet"
                titleHi="अभी कोई कियोस्क परिणाम नहीं है"
                description="Enter the kiosk code and visitor profile to generate an instant printable list."
                tips={[
                  "Use the assigned kiosk code first.",
                  "Fill visitor details and generate the result sheet.",
                ]}
              />
            </section>
          )
        )}
      </div>
    </main>
  );
}
