import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import BottomNav from "../components/BottomNav";
import BulkExport from "../components/BulkExport";
import EmptyState from "../components/EmptyState";
import SavedList from "../components/SavedList";
import { fetchSavedSchemes, removeSavedScheme } from "../lib/savedApi";

export default function SavedPage() {
  const { t } = useTranslation();
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
            <p className="eyebrow">{t("saved.eyebrow")}</p>
            <h1 className="type-h1">{t("saved.title")}</h1>
            <p className="type-body-en">{t("saved.subtitle")}</p>
          </div>
          {savedSchemes.length > 0 ? <BulkExport savedSchemes={savedSchemes} /> : null}
        </section>

        {savedQuery.isLoading ? (
          <section className="saved-panel">
            <p className="type-h2">{t("saved.loadingTitle")}</p>
            <p className="type-caption">{t("saved.loadingBody")}</p>
          </section>
        ) : null}

        {savedQuery.error ? (
          <section className="saved-panel">
            <p className="type-h2">{t("saved.errorTitle")}</p>
            <p className="type-caption">{savedQuery.error.message}</p>
          </section>
        ) : null}

        {!savedQuery.isLoading && !savedQuery.error && savedSchemes.length === 0 ? (
          <section className="saved-panel">
            <EmptyState
              title={t("saved.emptyTitle")}
              titleHi={t("saved.emptyTitleHi")}
              description={t("saved.emptyDescription")}
              tips={t("saved.emptyTips", { returnObjects: true })}
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
