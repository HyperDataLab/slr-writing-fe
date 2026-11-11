import { apiRequest } from "@/shared/lib/api-client";
import type {
  ImportSnapshotInput,
  SnapshotDetail,
  SlrHealthStatus,
  SlrRunSummary,
  SnapshotImportResponse,
  SnapshotSummary,
} from "@/features/snapshots/model/snapshot.types";

export function importSnapshotFromSlr(projectId: string, input: ImportSnapshotInput): Promise<SnapshotImportResponse> {
  return apiRequest<SnapshotImportResponse>(
    "/projects/" + encodeURIComponent(projectId) + "/snapshots/from-slr",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function importSnapshotBundle(projectId: string, bundle: Record<string, unknown>): Promise<SnapshotImportResponse> {
  return apiRequest<SnapshotImportResponse>(
    "/projects/" + encodeURIComponent(projectId) + "/snapshots",
    {
      method: "POST",
      body: JSON.stringify(bundle),
    },
  );
}

export function listSlrRuns(projectId: string): Promise<SlrRunSummary[]> {
  return apiRequest<SlrRunSummary[]>("/projects/" + encodeURIComponent(projectId) + "/slr-runs");
}

export function listSnapshots(projectId: string): Promise<SnapshotSummary[]> {
  return apiRequest<SnapshotSummary[]>(
    "/projects/" + encodeURIComponent(projectId) + "/snapshots",
  );
}

export function getSnapshot(projectId: string, snapshotId: string): Promise<SnapshotDetail> {
  return apiRequest<SnapshotDetail>(
    "/projects/" + encodeURIComponent(projectId) + "/snapshots/" + encodeURIComponent(snapshotId),
  );
}

export function getSlrHealth(): Promise<SlrHealthStatus> {
  return apiRequest<SlrHealthStatus>("/health/slr");
}


