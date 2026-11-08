import type { ComponentType, ReactNode, SVGProps } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useActiveWorkspaceSelection } from "@/features/projects/hooks/use-active-workspace-selection";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Shared frame of the workflow pages (paragraph plans, drafting, verification, export): page header, the
 * project/snapshot selector, and the empty states. The page supplies its copy and renders its workspace once a
 * project and snapshot are chosen.
 */
export function WorkflowPageShell({
  title,
  description,
  emptyIcon: EmptyIcon,
  selectProjectHint,
  children,
}: {
  title: string;
  description: string;
  emptyIcon: ComponentType<SVGProps<SVGSVGElement>>;
  selectProjectHint: string;
  children: (projectId: string, snapshot: SnapshotSummary) => ReactNode;
}) {
  const { t } = useTranslation();
  const {
    selectedProjectId,
    selectedSnapshotId,
    projects,
    snapshots,
    snapshotsLoading,
    activeSnapshot,
    selectProject,
    selectSnapshot,
  } = useActiveWorkspaceSelection();

  const selectClass =
    "w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary";
  const labelClass = "text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="slrw-page-title">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      <Card className="border border-border/80">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="workflow-project" className={labelClass}>
              {t("workflow.project")}
            </label>
            <select
              id="workflow-project"
              value={selectedProjectId}
              onChange={(e) => selectProject(e.target.value)}
              className={selectClass}
            >
              <option value="">{t("workflow.selectProjectOption")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slrProjectId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="workflow-snapshot" className={labelClass}>
              {t("workflow.snapshot")}
            </label>
            <select
              id="workflow-snapshot"
              value={selectedSnapshotId}
              disabled={!selectedProjectId || snapshotsLoading}
              onChange={(e) => selectSnapshot(e.target.value)}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="">{t("workflow.selectSnapshotOption")}</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.slice(0, 8)}... ({t("workflow.run")}: {s.sourceRunId})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <EmptyIcon className="size-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold">{t("workflow.pleaseSelectProject")}</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{selectProjectHint}</p>
          </CardContent>
        </Card>
      ) : snapshotsLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          {t("workflow.loadingSnapshots")}
        </div>
      ) : snapshots.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <h3 className="text-base font-semibold">{t("workflow.noSnapshotsTitle")}</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t("workflow.noSnapshotsDescription")}</p>
            <Link to="/snapshots">
              <Button size="sm" variant="outline" className="gap-1.5">
                {t("workflow.goToSnapshots")} <ArrowRightIcon className="size-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : activeSnapshot ? (
        children(selectedProjectId, activeSnapshot)
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">{t("workflow.pickSnapshot")}</div>
      )}
    </div>
  );
}
