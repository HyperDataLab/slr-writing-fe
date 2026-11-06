import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { listSlrRuns } from "@/features/snapshots/api/snapshots.api";
import type { MvpArtifactState, SlrRunSummary } from "@/features/snapshots/model/snapshot.types";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const MVP_ARTIFACTS = ["A1", "A2", "A7", "A10"] as const;

function artifactVariant(state: MvpArtifactState): "success" | "warning" | "destructive" | "outline" {
  if (state === "approved") return "success";
  if (state === "rejected") return "destructive";
  if (state === "missing") return "outline";
  return "warning";
}

/**
 * Lists the runs of the linked SLR project so a person picks one instead of typing a run id. The list only informs:
 * a run that looks unapproved can still be tried, and the backend's readiness check decides what is importable.
 */
export function SlrRunPicker({
  projectId,
  selectedRunId,
  onSelect,
  refreshKey,
}: {
  projectId: string;
  selectedRunId: string;
  onSelect: (runId: string) => void;
  /** Change it to reload the list, for example after an import. */
  refreshKey: number;
}) {
  const { t, i18n } = useTranslation();
  const stableT = useStableT();
  const [runs, setRuns] = useState<SlrRunSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (isCurrent: () => boolean) => {
    setLoading(true);
    setError(null);
    try {
      const items = await listSlrRuns(projectId);
      if (isCurrent()) setRuns(items);
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setRuns(null);
      setError(err instanceof Error ? err.message : stableT("snapshots.runs.loadError"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [projectId, stableT]);

  useEffect(() => {
    let cancelled = false;
    void load(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey, reloadKey]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{t("snapshots.runs.title")}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
          aria-label={t("snapshots.runs.reload")}
        >
          <ArrowPathIcon aria-hidden="true" className={loading ? "animate-spin" : ""} />
          {t("snapshots.runs.reload")}
        </Button>
      </div>

      {loading && !runs ? (
        <p role="status" className="text-sm text-muted-foreground">{t("snapshots.runs.loading")}</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error} <span className="text-muted-foreground">{t("snapshots.runs.manualFallback")}</span>
        </p>
      ) : runs && runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("snapshots.runs.empty")}</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto" aria-label={t("snapshots.runs.title")}>
          {(runs ?? []).map((run) => {
            const selected = run.runId === selectedRunId;
            return (
              <li key={run.runId}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(run.runId)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {selected && <CheckCircleIcon aria-hidden="true" className="size-4 text-primary" />}
                    <span className="font-mono text-xs font-semibold text-foreground">{run.runId}</span>
                    {run.snapshots.length > 0 && (
                      <Badge variant="outline">{t("snapshots.runs.imported", { count: run.snapshots.length })}</Badge>
                    )}
                    <Badge variant={run.mvpApproved ? "success" : "warning"}>
                      {run.mvpApproved ? t("snapshots.runs.allApproved") : t("snapshots.runs.notAllApproved")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(run.generatedAt).toLocaleString(i18n.resolvedLanguage ?? "vi")}
                    {run.generatedBy ? ` · ${run.generatedBy}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {MVP_ARTIFACTS.map((type) => {
                      const state = run.mvpArtifacts[type] ?? "missing";
                      return (
                        <Badge key={type} variant={artifactVariant(state)} className="gap-1 font-normal">
                          <span className="font-mono">{type}</span> {t(`snapshots.runs.state.${state}`)}
                        </Badge>
                      );
                    })}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
