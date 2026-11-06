import { ArrowRightIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { ExportWorkspace } from "@/features/export/components/ExportWorkspace";
import { useActiveWorkspaceSelection } from "@/features/projects/hooks/use-active-workspace-selection";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export function ExportPage() {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submission Package Export (H3)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Stage M9: Final pre-submission checklist, human approval (H3), and PKZIP export bundle.
        </p>
      </div>

      {/* Selector Card */}
      <Card className="border border-border/80">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => selectProject(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slrProjectId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
              Snapshot
            </label>
            <select
              value={selectedSnapshotId}
              disabled={!selectedProjectId || snapshotsLoading}
              onChange={(e) => selectSnapshot(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">-- Select Snapshot --</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.slice(0, 8)}... (Run: {s.sourceRunId})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {!selectedProjectId ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <ArrowDownTrayIcon className="size-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold">Please select a project</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Select an active writing project to inspect checklist, lineage, and export bundle.
            </p>
          </CardContent>
        </Card>
      ) : snapshotsLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          Loading snapshots...
        </div>
      ) : snapshots.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <h3 className="text-base font-semibold">No Snapshots Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This project does not have any imported review snapshots yet.
            </p>
            <Link to="/snapshots">
              <Button size="sm" variant="outline" className="gap-1.5">
                Go to Snapshots <ArrowRightIcon className="size-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : activeSnapshot ? (
        <ExportWorkspace
          projectId={selectedProjectId}
          snapshot={activeSnapshot}
        />
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Please select a snapshot from the dropdown above.
        </div>
      )}
    </div>
  );
}
