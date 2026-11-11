import { useEffect, useState } from "react";
import { ArrowRightIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { MethodsWorkspace } from "@/features/methods/components/MethodsWorkspace";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { GsapReveal } from "@/shared/ui/gsap-motion";

export function MethodsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId") ?? "";
  const selectedSnapshotId = searchParams.get("snapshotId") ?? "";
  const { projects, isLoading: projectsLoading, error: projectsError, load: loadProjects } = useProjects();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [snapshotReloadKey, setSnapshotReloadKey] = useState(0);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const stored = localStorage.getItem('slrw_selected_project_id');
      const matched = projects.find((p) => p.id === stored) ?? projects[0];
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('projectId', matched.id);
        const storedSnap = localStorage.getItem('slrw_selected_snapshot_id');
        if (storedSnap && !next.get('snapshotId')) {
          next.set('snapshotId', storedSnap);
        }
        return next;
      }, { replace: true });
    }
  }, [projects, selectedProjectId, setSearchParams]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('slrw_selected_project_id', selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSnapshotId) {
      localStorage.setItem('slrw_selected_snapshot_id', selectedSnapshotId);
    }
  }, [selectedSnapshotId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedProjectId) {
      setSnapshots([]);
      setSnapshotsError(null);
      setSnapshotsLoading(false);
      return () => { cancelled = true; };
    }

    setSnapshotsLoading(true);
    setSnapshotsError(null);
    const requestedSnapshotId = searchParams.get("snapshotId") ?? "";
    void listSnapshots(selectedProjectId)
      .then((items) => {
        if (cancelled) return;
        setSnapshots(items);
        const nextSnapshotId = items.some((snapshot) => snapshot.id === requestedSnapshotId)
          ? requestedSnapshotId
          : (items[0]?.id ?? "");
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          if (nextSnapshotId) next.set("snapshotId", nextSnapshotId);
          else next.delete("snapshotId");
          return next;
        }, { replace: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSnapshotsError(error instanceof Error ? error.message : t("methods.snapshotsLoadError"));
        setSnapshots([]);
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedProjectId, setSearchParams, snapshotReloadKey, t]);

  function updateSelection(projectId: string, snapshotId = "") {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (projectId) next.set("projectId", projectId);
      else next.delete("projectId");
      if (snapshotId) next.set("snapshotId", snapshotId);
      else next.delete("snapshotId");
      return next;
    }, { replace: true });
  }

  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const activeSnapshot = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);

  return (
    <div className="space-y-5">
      <GsapReveal>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("methods.step")}</p>
          <h2 className="slrw-page-title mt-1">{t("methods.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t("methods.description")}</p>
        </div>
      </GsapReveal>

      <GsapReveal>
      <Card aria-label={t("methods.selectTitle")}>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="methods-project" className="w-fit cursor-pointer text-sm font-medium text-foreground">
              {t("methods.projectLabel")}
            </label>
            <select
              id="methods-project"
              value={selectedProjectId}
              onChange={(event) => updateSelection(event.target.value)}
              disabled={projectsLoading}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
            >
              <option value="">{t("methods.chooseProject")}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="methods-snapshot" className="w-fit cursor-pointer text-sm font-medium text-foreground">
              {t("methods.snapshotLabel")}
            </label>
            <div className="flex min-w-0 items-center gap-2">
              <select
                id="methods-snapshot"
                value={selectedSnapshotId}
                onChange={(event) => updateSelection(selectedProjectId, event.target.value)}
                disabled={!selectedProjectId || snapshotsLoading || snapshots.length === 0}
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
              >
                <option value="">{t("methods.chooseSnapshot")}</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.sourceRunId} · {t(`snapshots.status.${snapshot.status}`)}
                  </option>
                ))}
              </select>
              {activeSnapshot && (
                <Badge variant={activeSnapshot.status === "READY" ? "default" : "outline"}>
                  {t(`snapshots.status.${activeSnapshot.status}`)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </GsapReveal>

      {projectsLoading || snapshotsLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("methods.loadingSelection")}</CardContent></Card>
      ) : projectsError ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">{projectsError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadProjects()}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      ) : snapshotsError ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">{snapshotsError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setSnapshotReloadKey((current) => current + 1)}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("methods.noProjects")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/projects">{t("methods.openProjects")}<ArrowRightIcon aria-hidden="true" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : !selectedProjectId ? (
        <Card className="flex min-h-56 items-center justify-center">
          <CardContent className="max-w-md px-6 py-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <BeakerIcon className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("methods.selectPrompt")}</p>
          </CardContent>
        </Card>
      ) : !activeProject ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("methods.projectUnavailable")}</CardContent></Card>
      ) : activeProject && snapshots.length === 0 ? (
        <Card className="flex min-h-56 items-center justify-center">
          <CardContent className="max-w-md px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("methods.noSnapshots")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={`/snapshots?projectId=${encodeURIComponent(activeProject.id)}`}>
                {t("methods.openSnapshots")}<ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : activeProject && activeSnapshot ? (
        <GsapReveal key={`${selectedProjectId}:${selectedSnapshotId}`} delay={0.06} effect="fade">
          <MethodsWorkspace projectId={selectedProjectId} snapshot={activeSnapshot} />
        </GsapReveal>
      ) : null}
    </div>
  );
}
