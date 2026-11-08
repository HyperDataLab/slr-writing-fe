import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ReadinessSummary } from "@/features/snapshots/components/ReadinessSummary";
import { SlrRunPicker } from "@/features/snapshots/components/SlrRunPicker";
import { getSnapshot, listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { useSnapshotImport } from "@/features/snapshots/hooks/use-snapshot-import";
import { MotionListItem, MotionReveal } from "@/shared/ui/motion";
import { cn } from "@/shared/utils/cn";
import type {
  ReadinessReport,
  SnapshotDetail,
  SnapshotStatus,
  SnapshotSummary,
} from "@/features/snapshots/model/snapshot.types";

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusVariant(status: SnapshotStatus): "success" | "warning" | "destructive" | "outline" {
  if (status === "READY") return "success";
  if (status === "BLOCKED") return "destructive";
  if (status === "STALE") return "warning";
  return "outline";
}

function SnapshotHistoryRow({
  snapshot,
  selected,
  latest,
  locale,
  onSelect,
}: {
  snapshot: SnapshotSummary;
  selected: boolean;
  latest: boolean;
  locale: string;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          selected ? "border-primary/20 bg-secondary/55" : "border-transparent hover:bg-muted/50",
        )}
      >
        <span className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          <CircleStackIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate text-sm font-semibold text-foreground">{snapshot.sourceRunId}</span>
            {latest && <Badge variant="success">{t("snapshots.latest")}</Badge>}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatDate(snapshot.importedAt, locale)} <span aria-hidden="true">·</span> {snapshot.corpusVersion}
          </span>
        </span>
        <Badge variant={statusVariant(snapshot.status)}>{t("snapshots.status." + snapshot.status)}</Badge>
      </button>
    </li>
  );
}

export function SnapshotReadinessPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId")
    || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_project_id") : null)
    || "";
  const { projects, isLoading: projectsLoading, error: projectsError, load: loadProjects } = useProjects();
  const {
    isImporting,
    readiness: importReadiness,
    error: importError,
    importRun,
    reset: resetImport,
  } = useSnapshotImport();
  const [runId, setRunId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsProjectId, setSnapshotsProjectId] = useState("");
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(
    () => searchParams.get("snapshotId")
      || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_snapshot_id") : null)
      || "",
  );
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

    setSnapshots([]);
    setSnapshotsProjectId("");
    setSelectedSnapshotId("");
    setSnapshotDetail(null);
    setSelectedReadiness(null);
    setSnapshotsError(null);

    if (!selectedProjectId) {
      setSnapshotsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSnapshotsLoading(true);
    void listSnapshots(selectedProjectId)
      .then((items) => {
        if (cancelled) return;
        setSnapshots(items);
        setSnapshotsProjectId(selectedProjectId);
        setSelectedSnapshotId((current) =>
          items.some((snapshot) => snapshot.id === current)
            ? current
            : (items[0]?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSnapshotsError(error instanceof Error ? error.message : t("snapshots.loadError"));
        setSnapshots([]);
        setSnapshotsProjectId(selectedProjectId);
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
      setSelectedReadiness(null);
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

    if (!selectedProjectId || !selectedSnapshotId || snapshotsProjectId !== selectedProjectId) {
      setSnapshotDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void loadSnapshotDetail(selectedProjectId, selectedSnapshotId, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadSnapshotDetail, selectedProjectId, selectedSnapshotId, snapshotsProjectId]);

  useEffect(() => {
    if (snapshotsLoading || snapshotsProjectId !== selectedProjectId) return;

    const selectionIsValid = snapshots.some((snapshot) => snapshot.id === selectedSnapshotId);
    if (!selectionIsValid) {
      if (selectedSnapshotId) setSelectedSnapshotId("");
      const next = new URLSearchParams(searchParams);
      if (next.has("snapshotId")) {
        next.delete("snapshotId");
        setSearchParams(next, { replace: true });
      }
      if (typeof window !== "undefined") localStorage.removeItem("slrw_selected_snapshot_id");
      return;
    }

    if (typeof window !== "undefined") localStorage.setItem("slrw_selected_snapshot_id", selectedSnapshotId);
    if (searchParams.get("snapshotId") !== selectedSnapshotId) {
      const next = new URLSearchParams(searchParams);
      next.set("snapshotId", selectedSnapshotId);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, selectedProjectId, selectedSnapshotId, setSearchParams, snapshots, snapshotsLoading, snapshotsProjectId]);


  const activeProject = projects.find((project) => project.id === selectedProjectId);
  useEffect(() => {
    if (searchParams.get("mode") !== "import" || !activeProject) return;
    setImportOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { replace: true });
  }, [activeProject, searchParams, setSearchParams]);
  const readiness = selectedReadiness ?? importReadiness;
  const locale = i18n.resolvedLanguage ?? "vi";
  const openEditorUrl = selectedProjectId && selectedSnapshotId
    ? "/drafting?projectId=" + encodeURIComponent(selectedProjectId) + "&snapshotId=" + encodeURIComponent(selectedSnapshotId)
    : "/drafting";
  const canOpenEditor = snapshotDetail?.status === "READY";
  const primaryMetrics = snapshotDetail
    ? [
        { label: t("snapshots.counts.studies"), value: snapshotDetail._count.studies },
        { label: t("snapshots.counts.evidence"), value: snapshotDetail._count.evidence },
      ]
    : [];
  const secondaryMetrics = snapshotDetail
    ? [
        { label: t("snapshots.counts.researchQuestions"), value: snapshotDetail._count.researchQuestions },
        { label: t("snapshots.counts.documents"), value: snapshotDetail._count.documents },
        { label: t("snapshots.counts.findings"), value: snapshotDetail._count.findings },
        { label: t("snapshots.counts.claims"), value: snapshotDetail._count.claims },
      ]
    : [];

  function handleSnapshotSelect(snapshotId: string) {
    setSelectedSnapshotId(snapshotId);
    setDetailError(null);
    setSelectedReadiness(null);
    resetImport();
    const next = new URLSearchParams(searchParams);
    if (snapshotId) next.set("snapshotId", snapshotId);
    else next.delete("snapshotId");
    setSearchParams(next, { replace: true });
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
      setImportOpen(false);
    }
  }

  function handleImportDialogChange(open: boolean) {
    setImportOpen(open);
    if (!open && !isImporting) {
      setRunId("");
      resetImport();
    }
  }

  return (
    <div className="space-y-7">
      <MotionReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("snapshots.step")}</p>
            <h1 className="slrw-page-title mt-1">{t("snapshots.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("snapshots.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenEditor ? (
              <Button asChild variant="outline">
                <Link to={openEditorUrl}>
                  <PencilSquareIcon aria-hidden="true" />
                  {t("snapshots.openEditor")}
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                <PencilSquareIcon aria-hidden="true" />
                {t("snapshots.openEditor")}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={!activeProject || projectsLoading}
            >
              <PlusIcon aria-hidden="true" />
              {t("snapshots.importCta")}
            </Button>
          </div>
        </div>
      </MotionReveal>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.92fr)]">
        <MotionReveal effect="fade">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border">
              <div>
                <CardTitle>{t("snapshots.historyTitle")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("snapshots.historyDescription")}
                </CardDescription>
              </div>
              {snapshotsProjectId === selectedProjectId && (
                <Badge variant="outline">{t("snapshots.historyCount", { count: snapshots.length })}</Badge>
              )}
            </CardHeader>
            <CardContent className="p-3">
              {projectsLoading ? (
                <p role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">{t("snapshots.loadingProjects")}</p>
              ) : projectsError ? (
                <div className="space-y-3 px-3 py-8 text-center">
                  <p role="alert" className="text-sm text-destructive">{projectsError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadProjects()}>
                    {t("common.retry")}
                  </Button>
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <CircleStackIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{t("snapshots.noProjects")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("snapshots.noProjectsBody")}</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/projects">{t("snapshots.openProjects")}<ArrowRightIcon aria-hidden="true" /></Link>
                  </Button>
                </div>
              ) : !activeProject ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <CircleStackIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{t("snapshots.chooseProjectTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("snapshots.chooseProjectBody")}</p>
                </div>
              ) : snapshotsLoading || snapshotsProjectId !== selectedProjectId ? (
                <p role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">{t("snapshots.loadingSnapshots")}</p>
              ) : snapshotsError ? (
                <div className="space-y-3 px-3 py-8 text-center">
                  <p role="alert" className="text-sm text-destructive">{snapshotsError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSnapshotRefreshKey((value) => value + 1)}>
                    {t("common.retry")}
                  </Button>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <DocumentArrowUpIcon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{t("snapshots.emptyHistory")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("snapshots.emptyHistoryBody")}</p>
                  <Button type="button" variant="outline" className="mt-4" onClick={() => setImportOpen(true)}>
                    <PlusIcon aria-hidden="true" />{t("snapshots.importCta")}
                  </Button>
                </div>
              ) : (
                <ul className="max-h-[42rem] space-y-1 overflow-y-auto" aria-label={t("snapshots.historyTitle")}>
                  {snapshots.map((snapshot, index) => (
                    <MotionListItem key={snapshot.id} delay={index * 0.025}>
                      <SnapshotHistoryRow
                        snapshot={snapshot}
                        selected={snapshot.id === selectedSnapshotId}
                        latest={index === 0}
                        locale={locale}
                        onSelect={() => handleSnapshotSelect(snapshot.id)}
                      />
                    </MotionListItem>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </MotionReveal>

        <MotionReveal delay={0.06} effect="fade" className="space-y-5">
          {detailLoading ? (
            <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">{t("snapshots.loadingDetail")}</CardContent></Card>
          ) : detailError ? (
            <Card><CardContent className="py-7"><p role="alert" className="text-sm text-destructive">{detailError}</p></CardContent></Card>
          ) : snapshotDetail ? (
            <Card className="overflow-hidden">
              <CardHeader className="space-y-4 border-b border-border pb-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <CircleStackIcon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge variant={statusVariant(snapshotDetail.status)}>{t("snapshots.status." + snapshotDetail.status)}</Badge>
                </div>
                <div>
                  <CardTitle className="break-all text-xl">{snapshotDetail.sourceRunId}</CardTitle>
                  <CardDescription className="mt-1.5">
                    {t("snapshots.importedOn", { date: formatDate(snapshotDetail.importedAt, locale) })}

                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-2 gap-3">
                  {primaryMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl bg-secondary/55 p-4">
                      <p className="text-2xl font-bold tabular-nums text-foreground">{metric.value.toLocaleString(locale)}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                  {secondaryMetrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between gap-2 border-b border-border/70 pb-2">
                      <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{metric.value.toLocaleString(locale)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="rounded-lg border border-border px-3.5 py-3">
                  <p className="text-xs font-semibold text-foreground">{t("snapshots.sourceRun")}</p>
                  <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">{snapshotDetail.sourceSystem} · {snapshotDetail.corpusVersion}</p>
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                    {t("snapshots.integrityHash", { hash: snapshotDetail.integrityHash })}
                  </p>
                </div>
                {canOpenEditor ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={openEditorUrl}>
                      <CheckCircleIcon aria-hidden="true" />{t("snapshots.openEditor")}
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" disabled>
                    <ExclamationTriangleIcon aria-hidden="true" />{t("snapshots.editorLocked")}
                  </Button>
                )}
                <p className="text-xs leading-5 text-muted-foreground">{t("snapshots.immutableNote")}</p>
              </CardContent>
            </Card>
          ) : readiness ? (
            <ReadinessSummary report={readiness} />
          ) : (
            <Card className="flex min-h-[30rem] items-center justify-center">
              <CardContent className="max-w-sm px-6 py-10 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  {projects.length === 0
                    ? <CircleStackIcon className="size-6" aria-hidden="true" />
                    : <ClockIcon className="size-6" aria-hidden="true" />}
                </span>
                <p className="mt-4 text-base font-semibold text-foreground">
                  {projects.length === 0 ? t("snapshots.noProjectDetailTitle") : t("snapshots.noSelectionTitle")}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {projects.length === 0 ? t("snapshots.noProjectDetailBody") : t("snapshots.readinessPrompt")}
                </p>
              </CardContent>
            </Card>
          )}

          {snapshotDetail && readiness && (
            <ReadinessSummary report={readiness} />
          )}
        </MotionReveal>
      </div>

      <Dialog open={importOpen} onOpenChange={handleImportDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>{t("snapshots.importDialogTitle")}</DialogTitle>
            <DialogDescription>{t("snapshots.importDialogDescription", { project: activeProject?.name ?? "" })}</DialogDescription>
          </DialogHeader>
          {activeProject ? (
            <form className="space-y-4" onSubmit={handleImport}>
              <SlrRunPicker
                key={selectedProjectId}
                projectId={selectedProjectId}
                selectedRunId={runId}
                onSelect={setRunId}
                refreshKey={snapshotRefreshKey}
              />
              <div className="space-y-2 border-t border-border pt-4">
                <label htmlFor="snapshot-run-id" className="text-sm font-medium text-foreground">
                  {t("snapshots.runIdLabelManual")}
                </label>
                <Input
                  id="snapshot-run-id"
                  autoComplete="off"
                  maxLength={128}
                  required
                  value={runId}
                  onChange={(event) => setRunId(event.target.value)}
                  className="w-full"
                  placeholder={t("snapshots.runIdPlaceholder")}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("snapshots.runIdHelp", { project: activeProject.name })}
                </p>
              </div>
              {importError && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{importError}</p>}
              {importReadiness && <ReadinessSummary report={importReadiness} />}
              <div className="flex justify-end">
                <Button type="submit" disabled={isImporting || !runId.trim()}>
                  <DocumentArrowUpIcon aria-hidden="true" />
                  {t(isImporting ? "snapshots.importing" : "snapshots.importAction")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">{t("snapshots.chooseProjectBody")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
