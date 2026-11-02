import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ReadinessSummary } from "@/features/snapshots/components/ReadinessSummary";
import { getSnapshot, listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { useSnapshotImport } from "@/features/snapshots/hooks/use-snapshot-import";
import { MotionListItem, MotionReveal } from "@/shared/ui/motion";
import type {
  ReadinessReport,
  SnapshotDetail,
  SnapshotSummary,
} from "@/features/snapshots/model/snapshot.types";

export function SnapshotReadinessPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId") ?? "";
  const { projects, isLoading: projectsLoading, error: projectsError, load: loadProjects } = useProjects();
  const {
    isImporting,
    readiness: importReadiness,
    error: importError,
    importRun,
    reset: resetImport,
  } = useSnapshotImport();
  const [runId, setRunId] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [snapshotDetail, setSnapshotDetail] = useState<SnapshotDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedReadiness, setSelectedReadiness] = useState<ReadinessReport | null>(null);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedProjectId) {
      setSnapshots([]);
      setSnapshotsError(null);
      setSnapshotsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSnapshotsLoading(true);
    setSnapshotsError(null);
    void listSnapshots(selectedProjectId)
      .then((items) => {
        if (cancelled) return;
        setSnapshots(items);
        setSelectedSnapshotId((current) =>
          items.some((snapshot) => snapshot.id === current) ? current : (items[0]?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSnapshotsError(error instanceof Error ? error.message : t("snapshots.loadError"));
        setSnapshots([]);
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, snapshotRefreshKey, t]);

  const loadSnapshotDetail = useCallback(async (
    projectId: string,
    snapshotId: string,
    isCurrent: () => boolean,
  ) => {
    if (isCurrent()) {
      setDetailLoading(true);
      setDetailError(null);
      setSnapshotDetail(null);
    }

    try {
      const detail = await getSnapshot(projectId, snapshotId);
      if (!isCurrent()) return;
      setSnapshotDetail(detail);
      setSelectedReadiness(
        detail.status === "READY" || detail.status === "BLOCKED"
          ? { status: detail.status, issues: detail.issues ?? [] }
          : null,
      );
    } catch (error) {
      if (isCurrent()) {
        setDetailError(error instanceof Error ? error.message : t("snapshots.detailError"));
      }
    } finally {
      if (isCurrent()) setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedProjectId || !selectedSnapshotId) {
      setSnapshotDetail(null);
      setSelectedReadiness(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    void loadSnapshotDetail(selectedProjectId, selectedSnapshotId, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadSnapshotDetail, selectedProjectId, selectedSnapshotId]);

  function handleProjectChange(projectId: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (projectId) nextParams.set("projectId", projectId);
    else nextParams.delete("projectId");
    setSearchParams(nextParams, { replace: true });
    setRunId("");
    setSelectedSnapshotId("");
    setSnapshotDetail(null);
    setSelectedReadiness(null);
    setDetailError(null);
    resetImport();
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId) return;

    setSelectedReadiness(null);
    const imported = await importRun(selectedProjectId, runId);
    if (imported) {
      setRunId("");
      setSelectedSnapshotId(imported.snapshot.id);
      setSelectedReadiness({ status: "READY", issues: imported.warnings });
      setSnapshotRefreshKey((current) => current + 1);
    }
  }

  const readiness = selectedReadiness ?? importReadiness;
  const activeProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <div className="space-y-7">
      <MotionReveal>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("snapshots.step")}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("snapshots.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("snapshots.description")}
          </p>
        </div>
      </MotionReveal>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <MotionReveal className="space-y-5" effect="fade">
          <Card>
            <CardHeader>
              <CardTitle>{t("snapshots.projectAndImportTitle")}</CardTitle>
              <CardDescription>{t("snapshots.projectAndImportDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {projectsLoading ? (
                <p role="status" className="text-sm text-muted-foreground">{t("snapshots.loadingProjects")}</p>
              ) : projectsError ? (
                <div className="space-y-3">
                  <p role="alert" className="text-sm text-destructive">{projectsError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadProjects()}>
                    {t("common.retry")}
                  </Button>
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-center">
                  <p className="text-sm text-muted-foreground">{t("snapshots.noProjects")}</p>
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to="/projects">
                      {t("snapshots.openProjects")}
                      <ArrowRightIcon aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="snapshot-project" className="text-sm font-medium text-foreground">
                      {t("snapshots.projectLabel")}
                    </label>
                    <select
                      id="snapshot-project"
                      value={selectedProjectId}
                      onChange={(event) => handleProjectChange(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/40"
                    >
                      <option value="">{t("snapshots.chooseProject")}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  {activeProject && (
                    <form className="space-y-3" onSubmit={handleImport}>
                      <div className="space-y-2">
                        <label htmlFor="snapshot-run-id" className="text-sm font-medium text-foreground">
                          {t("snapshots.runIdLabel")}
                        </label>
                        <input
                          id="snapshot-run-id"
                          autoComplete="off"
                          maxLength={128}
                          required
                          value={runId}
                          onChange={(event) => setRunId(event.target.value)}
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/40"
                          placeholder={t("snapshots.runIdPlaceholder")}
                        />
                        <p className="text-xs leading-5 text-muted-foreground">
                          {t("snapshots.runIdHelp", { project: activeProject.name })}
                        </p>
                      </div>
                      {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
                      <Button type="submit" disabled={isImporting}>
                        <DocumentArrowUpIcon aria-hidden="true" />
                        {t(isImporting ? "snapshots.importing" : "snapshots.importAction")}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {selectedProjectId && (
            <Card>
              <CardHeader>
                <CardTitle>{t("snapshots.historyTitle")}</CardTitle>
                <CardDescription>{t("snapshots.historyDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {snapshotsLoading ? (
                  <p role="status" className="py-4 text-sm text-muted-foreground">{t("snapshots.loadingSnapshots")}</p>
                ) : snapshotsError ? (
                  <div className="space-y-3 py-2">
                    <p role="alert" className="text-sm text-destructive">{snapshotsError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSnapshotRefreshKey((value) => value + 1)}>
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : snapshots.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">{t("snapshots.emptyHistory")}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {snapshots.map((snapshot, index) => (
                      <MotionListItem key={snapshot.id} delay={index * 0.035} className="py-3 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => setSelectedSnapshotId(snapshot.id)}
                          aria-pressed={selectedSnapshotId === snapshot.id}
                          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{snapshot.sourceRunId}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {new Date(snapshot.importedAt).toLocaleString(i18n.resolvedLanguage ?? "vi")}
                            </span>
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                            {t(`snapshots.status.${snapshot.status}`)}
                          </span>
                        </button>
                      </MotionListItem>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </MotionReveal>

        <MotionReveal delay={0.07} className="space-y-5" effect="fade">
          {detailLoading ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("snapshots.loadingDetail")}</CardContent></Card>
          ) : detailError ? (
            <Card><CardContent className="py-6"><p role="alert" className="text-sm text-destructive">{detailError}</p></CardContent></Card>
          ) : readiness ? (
            <ReadinessSummary report={readiness} />
          ) : (
            <Card className="flex min-h-64 items-center justify-center">
              <CardContent className="max-w-sm px-6 py-10 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  <DocumentArrowUpIcon className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("snapshots.readinessPrompt")}</p>
              </CardContent>
            </Card>
          )}

          {snapshotDetail && (
            <Card>
              <CardHeader>
                <CardTitle>{t("snapshots.detailTitle")}</CardTitle>
                <CardDescription>{snapshotDetail.sourceRunId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(snapshotDetail._count).map(([key, value], index) => (
                    <MotionReveal key={key} delay={index * 0.035} className="rounded-lg bg-secondary/70 p-3">
                      <dt className="text-xs text-muted-foreground">{t(`snapshots.counts.${key}`)}</dt>
                      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
                    </MotionReveal>
                  ))}
                </dl>
                <p className="break-all text-xs text-muted-foreground">
                  {t("snapshots.integrityHash", { hash: snapshotDetail.integrityHash })}
                </p>
                {snapshotDetail.status === "READY" && (
                  <Button asChild className="w-full sm:w-auto">
                    <Link to={`/methods?projectId=${encodeURIComponent(snapshotDetail.projectId)}&snapshotId=${encodeURIComponent(snapshotDetail.id)}`}>
                      {t("snapshots.openMethods")}
                      <ArrowRightIcon aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("snapshots.checksTitle")}</CardTitle>
              <CardDescription>{t("snapshots.checksDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <MotionListItem key={index} delay={index * 0.04} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-5 text-muted-foreground">{t(`snapshots.requirements.${index}`)}</span>
                  </MotionListItem>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-primary/15 bg-secondary/60 p-3.5">
                <p className="text-xs leading-5 text-muted-foreground">{t("snapshots.missingInfo")}</p>
              </div>
            </CardContent>
          </Card>
        </MotionReveal>
      </div>
    </div>
  );
}
