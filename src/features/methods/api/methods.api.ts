import { apiRequest } from "@/shared/lib/api-client";
import type {
  GenerateMethodsResponse,
  LatestMethodsResponse,
  MethodsRevision,
} from "@/features/methods/model/methods.types";

function methodsPath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/methods`;
}

export function generateMethods(projectId: string, snapshotId: string): Promise<GenerateMethodsResponse> {
  return apiRequest<GenerateMethodsResponse>(methodsPath(projectId, snapshotId), { method: "POST" });
}

export function getLatestMethods(projectId: string, snapshotId: string): Promise<LatestMethodsResponse> {
  return apiRequest<LatestMethodsResponse>(methodsPath(projectId, snapshotId));
}

export function getMethodsRevision(projectId: string, snapshotId: string, version: number): Promise<MethodsRevision> {
  return apiRequest<MethodsRevision>(`${methodsPath(projectId, snapshotId)}/revisions/${version}`);
}
