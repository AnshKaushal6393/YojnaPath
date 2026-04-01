import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BottomNav from "../components/BottomNav";
import BulkExport from "../components/BulkExport";
import EmptyState from "../components/EmptyState";
import SavedList from "../components/SavedList";
import { fetchSavedSchemes, removeSavedScheme } from "../lib/savedApi";

export default function SavedPage() {
  const queryClient = useQueryClient();
  const savedQuery = useQuery({
    queryKey: ["saved-schemes"],
    queryFn: fetchSavedSchemes,
  });

  const removeMutation = useMutation({
    mutationFn: removeSavedScheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-schemes"] });
    },
  });

  const savedSchemes = savedQuery.data || [];

  return (
    <main className="app-shell">
      <div className="saved-page">
        <section className="saved-header">
          <div className="section-heading">
            <p className="eyebrow">Saved</p>
            <h1 className="type-h1">Bookmarked schemes</h1>
            <p className="type-body-en">
              Keep useful schemes in one place, watch discontinued ones, and export the list when
              needed.
            </p>
          </div>
          {savedSchemes.length > 0 ? <BulkExport savedSchemes={savedSchemes} /> : null}
        </section>

        {savedQuery.isLoading ? (
          <section className="saved-panel">
            <p className="type-h2">Loading saved schemes...</p>
            <p className="type-caption">Bringing your bookmarks from the backend.</p>
          </section>
        ) : null}

        {savedQuery.error ? (
          <section className="saved-panel">
            <p className="type-h2">Could not load saved schemes</p>
            <p className="type-caption">{savedQuery.error.message}</p>
          </section>
        ) : null}

        {!savedQuery.isLoading && !savedQuery.error && savedSchemes.length === 0 ? (
          <section className="saved-panel">
            <EmptyState
              title="No saved schemes yet"
              titleHi="अभी कोई सेव योजना नहीं है"
              description="Save useful schemes from detail pages to revisit them later."
              tips={[
                "Open any scheme and tap Save scheme.",
                "Use saved schemes to keep track of applications you may want to start.",
              ]}
            />
          </section>
        ) : null}

        {!savedQuery.isLoading && !savedQuery.error && savedSchemes.length > 0 ? (
          <section className="saved-panel">
            <SavedList
              savedSchemes={savedSchemes}
              onRemove={(schemeId) => removeMutation.mutate(schemeId)}
              removingSchemeId={removeMutation.variables}
            />
          </section>
        ) : null}
      </div>

      <BottomNav active="saved" />
    </main>
  );
}
