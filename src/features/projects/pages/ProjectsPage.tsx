import { FolderIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { ProjectEmptyState } from "@/features/projects/components/ProjectEmptyState";
import { Card } from "@/shared/ui/card";

export function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Workspace</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Writing workspaces linked to your SLR projects are collected here.
          </p>
        </div>
        <Link
          to="/snapshots"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Snapshot workflow
          <FolderIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <Card>
        <ProjectEmptyState />
      </Card>
    </div>
  );
}

