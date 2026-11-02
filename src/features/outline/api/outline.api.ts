import { apiRequest } from "@/shared/lib/api-client";
import type {
  BlueprintContent,
  BlueprintDecisionResponse,
  BlueprintMutationResponse,
  BlueprintView,
} from "@/features/outline/model/outline.types";

function blueprintPath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/blueprint`;
}

export function getBlueprint(projectId: string, snapshotId: string): Promise<BlueprintView> {
  return apiRequest<BlueprintView>(blueprintPath(projectId, snapshotId));
}

export function createBlueprint(projectId: string, snapshotId: string, profileId: string): Promise<BlueprintMutationResponse> {
  return apiRequest<BlueprintMutationResponse>(blueprintPath(projectId, snapshotId), {
    method: "POST",
    body: JSON.stringify({ profileId }),
  });
}

export function saveBlueprint(
  projectId: string,
  snapshotId: string,
  baseVersion: number,
  content: BlueprintContent,
): Promise<BlueprintMutationResponse> {
  return apiRequest<BlueprintMutationResponse>(blueprintPath(projectId, snapshotId), {
    method: "PUT",
    body: JSON.stringify({ baseVersion, content }),
  });
}

export function getBlueprintRevision(projectId: string, snapshotId: string, version: number): Promise<BlueprintView> {
  return apiRequest<BlueprintView>(`${blueprintPath(projectId, snapshotId)}/revisions/${version}`);
}

export function approveBlueprint(
  projectId: string,
  snapshotId: string,
  version: number,
  note?: string,
): Promise<BlueprintDecisionResponse> {
  return apiRequest<BlueprintDecisionResponse>(`${blueprintPath(projectId, snapshotId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ version, ...(note ? { note } : {}) }),
  });
}

export function rejectBlueprint(
  projectId: string,
  snapshotId: string,
  version: number,
  note: string,
): Promise<BlueprintDecisionResponse> {
  return apiRequest<BlueprintDecisionResponse>(`${blueprintPath(projectId, snapshotId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ version, note }),
  });
}
