import { useEffect, useState } from "react";
import { ArrowRightIcon, DocumentTextIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { listJournalProfiles } from "@/features/journal-profiles/api/journal-profiles.api";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";
import { OutlineWorkspace } from "@/features/outline/components/OutlineWorkspace";
import { useProjects } from "@/features/projects/hooks/use-projects";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { listSnapshots } from "@/features/snapshots/api/snapshots.api";
import { Button } from "@/shared/ui/button";

function workspacePath(path: string, projectId: string, snapshotId = "") {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (snapshotId) params.set("snapshotId", snapshotId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function OutlineStateLayout({
  title,
  description,
  healthTitle,
  healthDescription,
  error,
  actionHref,
  actionLabel,
  onRetry,
  retryLabel,
  loading = false,
}: {
  title: string;
  description: string;
  healthTitle: string;
  healthDescription: string;
  error?: string | null;
  actionHref?: string;
  actionLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="outline-builder-layout" aria-busy={loading}>
      <section className="outline-builder-state-panel">
        <div className="outline-builder-state-heading">
          <span className="outline-builder-state-icon" aria-hidden="true">
            {error ? <ExclamationTriangleIcon /> : <DocumentTextIcon />}
          </span>
          <div>
            <p className="outline-builder-state-kicker">{t("outline.studioEyebrow")}</p>
            <h2>{title}</h2>
          </div>
        </div>
        <p className="outline-builder-state-description">{description}</p>
        {loading && <p className="outline-builder-loading" role="status">{t("outline.loadingSelection")}</p>}
        {error && <p className="outline-builder-error" role="alert">{error}</p>}
        {(actionHref || onRetry) && (
          <div className="outline-builder-state-actions">
            {actionHref && actionLabel && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to={actionHref}>{actionLabel}<ArrowRightIcon aria-hidden="true" /></Link>
              </Button>
            )}
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {retryLabel ?? t("common.retry")}
              </Button>
            )}
          </div>
        )}
      </section>

      <aside className="outline-structure-health">
        <p className="outline-structure-eyebrow">{t("outline.structureHealthTitle")}</p>
        <h2>{healthTitle}</h2>
        <p className="outline-structure-description">{healthDescription}</p>
        {error && (
          <div className="outline-health-notice is-error" role="status">
            <ExclamationTriangleIcon aria-hidden="true" />
            <p>{t("outline.healthUnavailable")}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

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
      const stored = localStorage.getItem("slrw_selected_project_id");
      const matched = projects.find((project) => project.id === stored) ?? projects[0];
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("projectId", matched.id);
        const storedSnapshotId = localStorage.getItem("slrw_selected_snapshot_id");
        if (storedSnapshotId && !next.get("snapshotId")) next.set("snapshotId", storedSnapshotId);
        return next;
      }, { replace: true });
    }
  }, [projects, selectedProjectId, setSearchParams]);

  useEffect(() => {
    if (selectedProjectId) localStorage.setItem("slrw_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSnapshotId) localStorage.setItem("slrw_selected_snapshot_id", selectedSnapshotId);
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

  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const activeSnapshot = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);
  const writingHref = workspacePath("/drafting", selectedProjectId, selectedSnapshotId);
  const snapshotHref = selectedProjectId
    ? `/snapshots?projectId=${encodeURIComponent(selectedProjectId)}${selectedSnapshotId ? `&snapshotId=${encodeURIComponent(selectedSnapshotId)}` : "&mode=import"}`
    : "/snapshots?mode=import";

  const header = (
    <header className="outline-page-header">
      <div className="outline-page-heading">
        <h1 className="slrw-page-title">{t("outline.studioTitle")}</h1>
      </div>
      <div className="outline-page-actions">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to={writingHref}>{t("outline.openWritingStudio")}<ArrowRightIcon aria-hidden="true" /></Link>
        </Button>
      </div>
    </header>
  );

  let workspaceContent;
  if (projectsLoading) {
    workspaceContent = (
      <OutlineStateLayout
        loading
        title={t("outline.loadingTitle")}
        description={t("outline.loadingSelection")}
        healthTitle={t("outline.loadingTitle")}
        healthDescription={t("outline.structureHealthDescription")}
      />
    );
  } else if (projectsError) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.unavailableTitle")}
        description={t("outline.projectLoadDescription")}
        healthTitle={t("outline.healthUnavailableTitle")}
        healthDescription={t("outline.structureHealthDescription")}
        error={projectsError}
        onRetry={() => void loadProjects()}
      />
    );
  } else if (projects.length === 0) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.noProjects")}
        description={t("outline.noProjectsDescription")}
        healthTitle={t("outline.healthWaitingTitle")}
        healthDescription={t("outline.healthNoProject")}
        actionHref="/projects"
        actionLabel={t("outline.openProjects")}
      />
    );
  } else if (!selectedProjectId || !activeProject) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.selectProjectTitle")}
        description={t("outline.selectPrompt")}
        healthTitle={t("outline.healthWaitingTitle")}
        healthDescription={t("outline.healthNoProject")}
        actionHref="/projects"
        actionLabel={t("outline.openProjects")}
      />
    );
  } else if (snapshotsLoading) {
    workspaceContent = (
      <OutlineStateLayout
        loading
        title={t("outline.loadingTitle")}
        description={t("outline.loadingSelection")}
        healthTitle={t("outline.loadingTitle")}
        healthDescription={t("outline.structureHealthDescription")}
      />
    );
  } else if (snapshotsError) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.unavailableTitle")}
        description={t("outline.snapshotLoadDescription")}
        healthTitle={t("outline.healthUnavailableTitle")}
        healthDescription={t("outline.structureHealthDescription")}
        error={snapshotsError}
        onRetry={() => setSnapshotReloadKey((current) => current + 1)}
      />
    );
  } else if (snapshots.length === 0) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.noSnapshots")}
        description={t("outline.noSnapshotDescription")}
        healthTitle={t("outline.healthWaitingTitle")}
        healthDescription={t("outline.healthNoSnapshot")}
        actionHref={snapshotHref}
        actionLabel={t("outline.importSnapshot")}
      />
    );
  } else if (!activeSnapshot) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.snapshotUnavailable")}
        description={t("outline.snapshotUnavailableDescription")}
        healthTitle={t("outline.healthUnavailableTitle")}
        healthDescription={t("outline.healthNoSnapshot")}
        actionHref={snapshotHref}
        actionLabel={t("outline.openCurrentSnapshot")}
      />
    );
  } else if (profilesError) {
    workspaceContent = (
      <OutlineStateLayout
        title={t("outline.unavailableTitle")}
        description={t("outline.profileUnavailableDescription")}
        healthTitle={t("outline.healthUnavailableTitle")}
        healthDescription={t("outline.structureHealthDescription")}
        error={profilesError}
        actionHref="/journal-profiles"
        actionLabel={t("outline.openProfiles")}
        onRetry={() => setProfileReloadKey((current) => current + 1)}
      />
    );
  } else if (profilesLoading) {
    workspaceContent = (
      <OutlineStateLayout
        loading
        title={t("outline.loadingTitle")}
        description={t("outline.loadingSelection")}
        healthTitle={t("outline.loadingTitle")}
        healthDescription={t("outline.structureHealthDescription")}
      />
    );
  } else {
    workspaceContent = (
      <OutlineWorkspace
        key={`${activeProject.id}:${activeSnapshot.id}`}
        projectId={activeProject.id}
        projectName={activeProject.name}
        snapshot={activeSnapshot}
        profiles={profiles}
        profilesLoading={profilesLoading}
        requestedProfileId={requestedProfileId}
      />
    );
  }

  return (
    <div className="outline-page">
      {header}
      {workspaceContent}
    </div>
  );
}
