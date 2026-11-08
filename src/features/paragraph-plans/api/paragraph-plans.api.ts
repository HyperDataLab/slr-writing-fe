import { apiRequest } from "@/shared/lib/api-client";
import type {
  ParagraphPlanMutationResponse,
  ParagraphPlanContent,
  ParagraphPlanView,
} from "@/features/paragraph-plans/model/paragraph-plan.types";

function paragraphPlansPath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/paragraph-plans`;
}

export function getParagraphPlans(projectId: string, snapshotId: string): Promise<ParagraphPlanView> {
  return apiRequest<ParagraphPlanView>(paragraphPlansPath(projectId, snapshotId));
}

export function createParagraphPlans(projectId: string, snapshotId: string): Promise<ParagraphPlanMutationResponse> {
  return apiRequest<ParagraphPlanMutationResponse>(paragraphPlansPath(projectId, snapshotId), {
    method: "POST",
  });
}

export function updateParagraphPlans(
  projectId: string,
  snapshotId: string,
  input: { baseVersion: number; content: ParagraphPlanContent },
): Promise<ParagraphPlanMutationResponse> {
  return apiRequest<ParagraphPlanMutationResponse>(paragraphPlansPath(projectId, snapshotId), {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getParagraphPlanRevision(
  projectId: string,
  snapshotId: string,
  version: number,
): Promise<ParagraphPlanView> {
  return apiRequest<ParagraphPlanView>(`${paragraphPlansPath(projectId, snapshotId)}/revisions/${version}`);
}

