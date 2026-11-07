import { ArchiveBoxIcon, ArrowDownTrayIcon, ArrowRightIcon, CircleStackIcon, DocumentTextIcon, FolderOpenIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { DraftingWorkspace } from "@/features/drafting/components/DraftingWorkspace";
import { useActiveWorkspaceSelection } from "@/features/projects/hooks/use-active-workspace-selection";
import { Button } from "@/shared/ui/button";

function workspacePath(path: string, projectId: string, snapshotId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (snapshotId) params.set("snapshotId", snapshotId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function DraftingEmptyWorkspace({
  loading,
  projectSelected,
  projectName,
  importPath,
}: {
  loading: boolean;
  projectSelected: boolean;
  projectName?: string;
  importPath: string;
}) {
  const { t } = useTranslation();
  const actionPath = projectSelected ? importPath : "/projects";

  return (
    <div className="draft-studio-grid is-empty">
      <aside className="draft-section-rail" aria-label={t("draft.manuscriptOutline")}>
        <div className="draft-rail-heading">{t("draft.manuscriptOutline")}</div>
        <div className="draft-empty-outline">
          <DocumentTextIcon aria-hidden="true" />
          <p>{t("draft.outlineAppearsAfterImport")}</p>
        </div>
      </aside>

      <section className="draft-paper-column" aria-label={t("draft.studioTitle")}>
        <div className="draft-center-toolbar">
          <div className="draft-toolbar-context">
            <span className="draft-toolbar-label">{t("draft.prose")}</span>
            {projectName && <span className="draft-toolbar-project">{projectName}</span>}
          </div>
        </div>
        <div className="draft-paper-content">
          <div className="draft-paper-heading">
            <div>
              <p className="draft-paper-kicker">{t("draft.pageTitle")}</p>
              <h2>{projectSelected ? t("draft.noSnapshotTitle") : t("draft.noProjectTitle")}</h2>
              <p>{projectSelected ? t("draft.noSnapshotDescription") : t("draft.noProjectDescription")}</p>
            </div>
          </div>
          <div className="draft-empty-document" role={loading ? "status" : undefined}>
            {loading ? (
              <>
                <DocumentTextIcon aria-hidden="true" />
                <h3>{t("draft.loadingWorkspace")}</h3>
              </>
            ) : (
              <>
                {projectSelected ? <DocumentTextIcon aria-hidden="true" /> : <FolderOpenIcon aria-hidden="true" />}
                <h3>{projectSelected ? t("draft.noSnapshotTitle") : t("draft.noProjectTitle")}</h3>
                <p>{projectSelected ? t("draft.noSnapshotDescription") : t("draft.noProjectDescription")}</p>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to={actionPath}>
                    {projectSelected ? t("draft.importSlrRun") : t("draft.openProjects")}
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <aside className="draft-inspector-pane" aria-label={t("draft.inspector")}>
        <div className="draft-inspector-tabs" role="tablist" aria-label={t("draft.inspector")}>
          <button type="button" role="tab" aria-selected="true" disabled className="draft-inspector-tab is-active">
            <CircleStackIcon aria-hidden="true" />
            {t("draft.inspectorEvidenceTab")}
          </button>
          <button type="button" role="tab" aria-selected="false" disabled className="draft-inspector-tab">
            <SparklesIcon aria-hidden="true" />
            {t("draft.inspectorChecksTab")}
          </button>
        </div>
        <div className="draft-inspector-content">
          <p className="draft-inspector-hint">{t("draft.inspectorEmpty")}</p>
        </div>
      </aside>
    </div>
  );
}

export function DraftingPage() {
  const { t } = useTranslation();
  const {
    selectedProjectId,
    selectedSnapshotId,
    projects,
    projectsLoading,
    projectsError,
    snapshotsLoading,
    snapshotsError,
    activeSnapshot,
  } = useActiveWorkspaceSelection();

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const hasWorkspace = Boolean(selectedProject && activeSnapshot);
  const importPath = selectedProjectId
    ? `/snapshots?mode=import&projectId=${encodeURIComponent(selectedProjectId)}`
    : "/snapshots?mode=import";
  const snapshotPath = selectedProjectId
    ? workspacePath("/snapshots", selectedProjectId, selectedSnapshotId)
    : "/projects";
  const exportPath = workspacePath("/export", selectedProjectId, selectedSnapshotId);

  return (
    <div className="draft-writing-page">
      <header className="drafting-page-header">
        <div className="drafting-page-heading">
          <p className="draft-page-eyebrow">{t("draft.studioEyebrow")}</p>
          <h1 className="slrw-page-title">{t("draft.studioTitle")}</h1>
          <div className="draft-studio-meta">
            <span className={hasWorkspace ? "draft-studio-pill is-ready" : "draft-studio-pill"}>
              {hasWorkspace ? t("draft.snapshotLinked") : selectedProject ? t("draft.snapshotRequired") : t("draft.projectRequired")}
            </span>
            {selectedProject && <span>{selectedProject.name}</span>}
            {activeSnapshot && <span>{t("workflow.run")}: {activeSnapshot.sourceRunId}</span>}
          </div>
        </div>
        <div className="draft-studio-actions">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to={activeSnapshot ? snapshotPath : selectedProject ? importPath : "/projects"}>
              <ArchiveBoxIcon aria-hidden="true" />
              {activeSnapshot ? t("draft.openSnapshot") : selectedProject ? t("draft.importSlrRun") : t("draft.openProjects")}
            </Link>
          </Button>
          {selectedProject && activeSnapshot ? (
            <Button asChild size="sm" className="gap-2">
              <Link to={exportPath}>
                <ArrowDownTrayIcon aria-hidden="true" />
                {t("navigation.exportDraft")}
              </Link>
            </Button>
          ) : (
            <Button type="button" size="sm" className="gap-2" disabled>
              <ArrowDownTrayIcon aria-hidden="true" />
              {t("navigation.exportDraft")}
            </Button>
          )}
        </div>
      </header>

      {projectsError && <p className="draft-workspace-error" role="alert">{projectsError}</p>}
      {snapshotsError && <p className="draft-workspace-error" role="alert">{snapshotsError}</p>}

      {selectedProject && activeSnapshot ? (
        <DraftingWorkspace projectId={selectedProject.id} snapshot={activeSnapshot} />
      ) : (
        <DraftingEmptyWorkspace
          loading={projectsLoading || snapshotsLoading}
          projectSelected={Boolean(selectedProject)}
          projectName={selectedProject?.name}
          importPath={importPath}
        />
      )}
    </div>
  );
}
