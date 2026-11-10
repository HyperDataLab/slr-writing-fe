import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { getSlrHealth, listSlrRuns } from "@/features/snapshots/api/snapshots.api";
import type { MvpArtifactState, SlrHealthStatus, SlrRunSummary } from "@/features/snapshots/model/snapshot.types";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { ApiError } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const MVP_ARTIFACTS = ["A1", "A2", "A7", "A10"] as const;

function artifactVariant(state: MvpArtifactState): "success" | "warning" | "destructive" | "outline" {
  if (state === "approved") return "success";
  if (state === "rejected") return "destructive";
  if (state === "missing") return "outline";
  return "warning";
}

function formatTime(value: string, language: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language);
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
  const [slrStatus, setSlrStatus] = useState<SlrHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (isCurrent: () => boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [items, health] = await Promise.all([
        listSlrRuns(projectId),
        getSlrHealth().catch(() => null),
      ]);
      if (isCurrent()) {
        setRuns(items);
        if (health) setSlrStatus(health);
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setRuns(null);
      const health = await getSlrHealth().catch(() => null);
      if (isCurrent() && health) setSlrStatus(health);

      if (err instanceof ApiError) {
        if (err.code === "SLR_UNREACHABLE") {
          setError(stableT("snapshots.runs.unreachableError"));
        } else if (err.code === "SLR_PROJECT_ACCESS_DENIED" || err.code === "SLR_FORBIDDEN") {
          setError(stableT("snapshots.runs.forbiddenError"));
        } else {
          setError(err.message || stableT("snapshots.runs.loadError"));
        }
      } else {
        setError(err instanceof Error ? err.message : stableT("snapshots.runs.loadError"));
      }
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{t("snapshots.runs.title")}</span>
          {slrStatus && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                slrStatus.reachable
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  slrStatus.reachable ? "bg-emerald-500" : "bg-destructive animate-pulse"
                }`}
              />
              {slrStatus.reachable
                ? `SLR Online${slrStatus.latencyMs ? ` (${slrStatus.latencyMs}ms)` : ""}`
                : "SLR Offline"}
            </span>
          )}
        </div>
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
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("snapshots.runs.manualFallback")}</p>
        </div>
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
                    <Badge variant={run.importable ? "success" : "warning"}>
                      {run.importable ? t("snapshots.runs.importable") : t("snapshots.runs.notImportable")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTime(run.generatedAt, i18n.resolvedLanguage ?? "vi")}
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
