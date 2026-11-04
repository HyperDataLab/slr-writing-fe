import { useEffect, useState } from "react";
import { ArrowRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { listJournalProfiles } from "@/features/journal-profiles/api/journal-profiles.api";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";
import { OutlineWorkspace } from "@/features/outline/components/OutlineWorkspace";
import { useProjects } from "@/features/projects/hooks/use-projects";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionReveal } from "@/shared/ui/motion";

export function OutlinePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId") ?? "";
  const selectedSnapshotId = searchParams.get("snapshotId") ?? "";
  const requestedProfileId = searchParams.get("profileId") ?? "";
  const { projects, isLoading: projectsLoading, error: projectsError, load: loadProjects } = useProjects();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [snapshotReloadKey, setSnapshotReloadKey] = useState(0);
  const [profiles, setProfiles] = useState<JournalProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profileReloadKey, setProfileReloadKey] = useState(0);

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
    setProfilesLoading(true);
    setProfilesError(null);
    void listJournalProfiles()
      .then((items) => { if (!cancelled) setProfiles(items); })
      .catch((error: unknown) => {
        if (!cancelled) setProfilesError(error instanceof Error ? error.message : t("outline.profileLoadError"));
      })
      .finally(() => { if (!cancelled) setProfilesLoading(false); });
    return () => { cancelled = true; };
  }, [profileReloadKey, t]);

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
        setSnapshotsError(error instanceof Error ? error.message : t("outline.snapshotsLoadError"));
        setSnapshots([]);
      })
      .finally(() => { if (!cancelled) setSnapshotsLoading(false); });

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
    <div className="space-y-7">
      <MotionReveal>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("outline.step")}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("outline.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("outline.description")}</p>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <Card>
          <CardHeader>
            <CardTitle>{t("outline.selectTitle")}</CardTitle>
            <CardDescription>{t("outline.selectDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="outline-project" className="text-sm font-medium text-foreground">{t("outline.projectLabel")}</label>
              <select
                id="outline-project"
                value={selectedProjectId}
                onChange={(event) => updateSelection(event.target.value)}
                disabled={projectsLoading}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground/40 disabled:opacity-60"
              >
                <option value="">{t("outline.chooseProject")}</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="outline-snapshot" className="text-sm font-medium text-foreground">{t("outline.snapshotLabel")}</label>
              <select
                id="outline-snapshot"
                value={selectedSnapshotId}
                onChange={(event) => updateSelection(selectedProjectId, event.target.value)}
                disabled={!selectedProjectId || snapshotsLoading || snapshots.length === 0}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground/40 disabled:opacity-60"
              >
                <option value="">{t("outline.chooseSnapshot")}</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.sourceRunId} · {t(`snapshots.status.${snapshot.status}`)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </MotionReveal>

      {projectsLoading || snapshotsLoading || profilesLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("outline.loadingSelection")}</CardContent></Card>
      ) : projectsError ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">{projectsError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadProjects()}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      ) : profilesError ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive">{profilesError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setProfileReloadKey((current) => current + 1)}>{t("common.retry")}</Button>
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
            <p className="text-sm text-muted-foreground">{t("outline.noProjects")}</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/projects">{t("outline.openProjects")}<ArrowRightIcon aria-hidden="true" /></Link></Button>
          </CardContent>
        </Card>
      ) : !selectedProjectId ? (
        <Card className="flex min-h-56 items-center justify-center">
          <CardContent className="max-w-md px-6 py-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary"><DocumentTextIcon className="size-6" aria-hidden="true" /></span>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("outline.selectPrompt")}</p>
          </CardContent>
        </Card>
      ) : !activeProject ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("outline.projectUnavailable")}</CardContent></Card>
      ) : snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("outline.noSnapshots")}</p>
            <Button asChild variant="outline" className="mt-4"><Link to={`/snapshots?projectId=${encodeURIComponent(activeProject.id)}`}>{t("outline.openSnapshots")}<ArrowRightIcon aria-hidden="true" /></Link></Button>
          </CardContent>
        </Card>
      ) : !activeSnapshot ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("outline.snapshotUnavailable")}</CardContent></Card>
      ) : (
        <OutlineWorkspace
          key={`${activeProject.id}:${activeSnapshot.id}`}
          projectId={activeProject.id}
          snapshot={activeSnapshot}
          profiles={profiles}
          profilesLoading={profilesLoading}
          requestedProfileId={requestedProfileId}
        />
      )}
    </div>
  );
}
