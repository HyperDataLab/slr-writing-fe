import { apiRequest } from "@/shared/lib/api-client";
import type { ImportSnapshotInput } from "@/features/snapshots/model/snapshot.types";

export function importSnapshotFromSlr(projectId: string, input: ImportSnapshotInput): Promise<unknown> {
  return apiRequest<unknown>(
    "/projects/" + encodeURIComponent(projectId) + "/snapshots/from-slr",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

