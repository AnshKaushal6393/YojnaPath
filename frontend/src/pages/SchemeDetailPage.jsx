import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import SchemeDetail from "../components/SchemeDetail";
import { fetchSchemeDetail } from "../lib/schemeDetailApi";
import { fetchSavedSchemes, removeSavedScheme, saveScheme } from "../lib/savedApi";
import { createTrackedApplication } from "../lib/trackerApi";

export default function SchemeDetailPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { schemeId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: ["scheme-detail", schemeId],
    queryFn: () => fetchSchemeDetail(schemeId),
    enabled: Boolean(schemeId),
  });
  const savedQuery = useQuery({
    queryKey: ["saved-schemes"],
    queryFn: fetchSavedSchemes,
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const savedSchemes = savedQuery.data || [];
      const isSaved = savedSchemes.some((item) => item.id === schemeId);
      if (isSaved) {
        await removeSavedScheme(schemeId);
      } else {
        await saveScheme(schemeId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-schemes"] });
    },
  });
  const trackMutation = useMutation({
    mutationFn: () =>
      createTrackedApplication({
        schemeId,
        appliedAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-applications"] });
      navigate("/tracker");
    },
  });

  const scheme = detailQuery.data;
  const schemeUrl = typeof window !== "undefined" ? window.location.href : "";
  const isSaved = (savedQuery.data || []).some((item) => item.id === schemeId);

  return (
    <main className="app-shell">
      <div className="detail-page">
        <div className="detail-page__header">
          <Link to="/" className="detail-page__back type-label tap-target">
            {"\u2190"} Back to schemes
          </Link>
        </div>

        {detailQuery.isLoading ? (
          <section className="detail-card">
            <p className="type-h2">Loading scheme details...</p>
            <p className="type-caption">Fetching full information from the live backend.</p>
          </section>
        ) : null}

        {detailQuery.error ? (
          <section className="detail-card">
            <p className="type-h2">Could not load scheme details</p>
            <p className="type-caption">{detailQuery.error.message}</p>
          </section>
        ) : null}

        {scheme ? (
          <SchemeDetail
            scheme={scheme}
            schemeUrl={schemeUrl}
            isSaved={isSaved}
            isSavePending={saveMutation.isPending}
            onToggleSave={() => saveMutation.mutate()}
            onTrackApplication={() => trackMutation.mutate()}
            isTrackPending={trackMutation.isPending}
          />
        ) : null}
      </div>

      <BottomNav active="home" />
    </main>
  );
}
