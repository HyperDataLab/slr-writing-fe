import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { listSnapshots } from "@/features/snapshots/api/snapshots.api";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";

export function useActiveWorkspaceSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId") ?? "";
  const selectedSnapshotId = searchParams.get("snapshotId") ?? "";

  const { projects, isLoading: projectsLoading, error: projectsError, load: loadProjects } = useProjects();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // 1. Auto-select project if none in URL
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const stored = localStorage.getItem("slrw_selected_project_id");
      const matched = projects.find((p) => p.id === stored) ?? projects[0];
      const next = new URLSearchParams(searchParams);
      next.set("projectId", matched.id);
      setSearchParams(next, { replace: true });
    }
  }, [projects, selectedProjectId, searchParams, setSearchParams]);

  // 2. Fetch snapshots for selected project and auto-select snapshot
  useEffect(() => {
    let cancelled = false;
    if (!selectedProjectId) {
      setSnapshots([]);
      setSnapshotsLoading(false);
      return () => { cancelled = true; };
    }

    setSnapshotsLoading(true);
    setSnapshotsError(null);
    void listSnapshots(selectedProjectId)
      .then((items) => {
        if (cancelled) return;
        setSnapshots(items);
        if (items.length > 0) {
          const storedSnapshot = localStorage.getItem("slrw_selected_snapshot_id");
          const hasStored = items.some((s) => s.id === storedSnapshot);
          const hasCurrent = items.some((s) => s.id === selectedSnapshotId);
          if (!selectedSnapshotId || !hasCurrent) {
            const targetId = hasStored ? storedSnapshot! : items[0].id;
            const next = new URLSearchParams(searchParams);
            next.set("snapshotId", targetId);
            setSearchParams(next, { replace: true });
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setSnapshotsError(err instanceof Error ? err.message : "Failed to load snapshots");
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedProjectId, searchParams, setSearchParams, selectedSnapshotId]);

  // 3. Persist selections
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("slrw_selected_project_id", selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSnapshotId) {
      localStorage.setItem("slrw_selected_snapshot_id", selectedSnapshotId);
    }
  }, [selectedSnapshotId]);

  const selectProject = (projectId: string) => {
    const next = new URLSearchParams();
    if (projectId) next.set("projectId", projectId);
    setSearchParams(next);
  };

  const selectSnapshot = (snapshotId: string) => {
    const next = new URLSearchParams(searchParams);
    if (snapshotId) next.set("snapshotId", snapshotId);
    else next.delete("snapshotId");
    setSearchParams(next);
  };

  const activeSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  return {
    selectedProjectId,
    selectedSnapshotId,
    projects,
    projectsLoading,
    projectsError,
    snapshots,
    snapshotsLoading,
    snapshotsError,
    activeSnapshot,
    selectProject,
    selectSnapshot,
  };
}

