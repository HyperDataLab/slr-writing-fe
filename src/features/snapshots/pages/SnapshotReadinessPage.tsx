import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ReadinessSummary } from "@/features/snapshots/components/ReadinessSummary";
import { getSnapshot, listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { GsapListItem, GsapReveal } from "@/shared/ui/gsap-motion";
import { cn } from "@/shared/utils/cn";
import type {
  ReadinessReport,
  SnapshotDetail,
  SnapshotStatus,
  SnapshotSummary,
} from "@/features/snapshots/model/snapshot.types";

const CORE_ARTIFACTS = ["A1", "A2", "A7", "A10"] as const;
type ArtifactReviewState = "approved" | "unreviewed" | "needs_human_review" | "rejected" | "missing";
type ArtifactValidationState = "valid" | "invalid" | "not_applicable";

function artifactReviewState(value: string | undefined): ArtifactReviewState {
  return value === "approved" || value === "unreviewed" || value === "needs_human_review" || value === "rejected"
    ? value
    : "missing";
}

function artifactStatusVariant(status: ArtifactReviewState): "success" | "warning" | "destructive" | "outline" {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  if (status === "missing") return "outline";
  return "warning";
}

function artifactValidationState(value: string | undefined): ArtifactValidationState | undefined {
  return value === "valid" || value === "invalid" || value === "not_applicable" ? value : undefined;
}

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
  locale,
  onSelect,
}: {
  snapshot: SnapshotSummary;
  selected: boolean;
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
          "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          selected ? "border-primary/20 bg-secondary/55" : "border-transparent hover:bg-muted/50",
        )}
      >
        <span className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          <CircleStackIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block max-w-full truncate text-sm font-semibold text-foreground">{snapshot.sourceRunId}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatDate(snapshot.importedAt, locale)} <span aria-hidden="true">·</span> {snapshot.sourceSystem === "manual" ? t("snapshots.jsonBundle") : snapshot.sourceSystem}
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
  const readiness = selectedReadiness;
  const locale = i18n.resolvedLanguage ?? "vi";
  const openOutlineUrl = selectedProjectId && selectedSnapshotId
    ? "/outline?projectId=" + encodeURIComponent(selectedProjectId) + "&snapshotId=" + encodeURIComponent(selectedSnapshotId)
    : "/outline";
  const canOpenOutline = snapshotDetail?.status === "READY";
  const primaryMetrics = snapshotDetail
    ? [
        { label: t("snapshots.counts.studies"), value: snapshotDetail._count.studies },
        { label: t("snapshots.counts.evidence"), value: snapshotDetail._count.evidence },
        { label: t("snapshots.counts.claims"), value: snapshotDetail._count.claims },
      ]
    : [];
  function handleSnapshotSelect(snapshotId: string) {
    setSelectedSnapshotId(snapshotId);
    setDetailError(null);
    setSelectedReadiness(null);
    const next = new URLSearchParams(searchParams);
    if (snapshotId) next.set("snapshotId", snapshotId);
    else next.delete("snapshotId");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="space-y-7">
      <GsapReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("snapshots.step")}</p>
            <h1 className="slrw-page-title mt-1">{t("snapshots.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("snapshots.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/import">
                <DocumentArrowUpIcon aria-hidden="true" />
                {t("snapshots.importCta")}
              </Link>
            </Button>
          </div>
        </div>
      </GsapReveal>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.35fr)]">
        <GsapReveal effect="fade">
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
                    <Link to="/import">{t("snapshots.importCta")}<ArrowRightIcon aria-hidden="true" /></Link>
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
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/import"><DocumentArrowUpIcon aria-hidden="true" />{t("snapshots.importCta")}</Link>
                  </Button>
                </div>
              ) : (
                <ul className="max-h-[42rem] space-y-1 overflow-y-auto" aria-label={t("snapshots.historyTitle")}>
                  {snapshots.map((snapshot, index) => (
                    <GsapListItem key={snapshot.id} delay={index * 0.025}>
                      <SnapshotHistoryRow
                        snapshot={snapshot}
                        selected={snapshot.id === selectedSnapshotId}
                        locale={locale}
                        onSelect={() => handleSnapshotSelect(snapshot.id)}
                      />
                    </GsapListItem>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </GsapReveal>

        <GsapReveal delay={0.06} effect="fade" className="space-y-5">
          {detailLoading ? (
            <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">{t("snapshots.loadingDetail")}</CardContent></Card>
          ) : detailError ? (
            <Card><CardContent className="py-7"><p role="alert" className="text-sm text-destructive">{detailError}</p></CardContent></Card>
          ) : snapshotDetail ? (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/70 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("snapshots.detailTitle")}</p>
                    <CardTitle className="break-all text-lg leading-6">{snapshotDetail.sourceRunId}</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-5">
                      {t("snapshots.importedOn", { date: formatDate(snapshotDetail.importedAt, locale) })}
                      <span aria-hidden="true"> · </span>{snapshotDetail.sourceSystem === "manual" ? t("snapshots.jsonBundle") : snapshotDetail.sourceSystem}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariant(snapshotDetail.status)}>{t("snapshots.status." + snapshotDetail.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pt-4">
                <section aria-label={t("snapshots.artifactsTitle")}>
                  <ul className="flex flex-wrap gap-2">
                    {CORE_ARTIFACTS.map((type) => {
                      const artifact = snapshotDetail.artifacts.find((item) => item.artifactType === type);
                      const state = artifactReviewState(artifact?.reviewStatus);
                      const validation = artifactValidationState(artifact?.validationStatus);
                      const label = artifact
                        ? `${type}: ${t(`snapshots.artifactState.${state}`)}${validation ? `, ${t(`snapshots.artifactValidation.${validation}`)}` : ""}`
                        : `${type}: ${t("snapshots.artifactState.missing")}`;
                      return (
                        <li key={type}>
                          <Badge
                            variant={validation === "invalid" ? "destructive" : artifactStatusVariant(state)}
                            aria-label={label}
                            title={label}
                          >
                            <span className="font-mono">{type}</span>
                            <span aria-hidden="true">·</span>
                            {t(`snapshots.artifactState.${state}`)}{validation === "invalid" && ` · ${t("snapshots.artifactValidation.invalid")}`}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {primaryMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl bg-secondary/55 p-4">
                      <p className="text-2xl font-bold tabular-nums text-foreground">{metric.value.toLocaleString(locale)}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.label}</p>
                    </div>
                  ))}
                </div>
                {readiness ? (
                  <ReadinessSummary report={readiness} variant="inline" />
                ) : (
                  <p role="status" className="border-t border-border pt-4 text-sm text-muted-foreground">
                    {t("snapshots.readinessUnavailable")}
                  </p>
                )}
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-secondary/55 px-3.5 py-2.5">
                  <p className="shrink-0 text-xs text-muted-foreground">{t("snapshots.integrityHashLabel")}</p>
                  <p
                    className="min-w-0 truncate font-mono text-[11px] text-foreground"
                    title={snapshotDetail.integrityHash}
                    aria-label={t("snapshots.integrityHash", { hash: snapshotDetail.integrityHash })}
                  >
                    {snapshotDetail.integrityHash}
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">{t("snapshots.immutableNote")}</p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canOpenOutline && (
                      <Button asChild>
                        <Link to={openOutlineUrl}>
                          <CheckCircleIcon aria-hidden="true" />{t("snapshots.openOutline")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
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

        </GsapReveal>
      </div>

    </div>
  );
}
