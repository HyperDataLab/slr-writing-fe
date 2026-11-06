import { apiRequest } from "@/shared/lib/api-client";
import type {
  ParagraphPlanMutationResponse,
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

export function getParagraphPlanRevision(
  projectId: string,
  snapshotId: string,
  version: number,
): Promise<ParagraphPlanView> {
  return apiRequest<ParagraphPlanView>(`${paragraphPlansPath(projectId, snapshotId)}/revisions/${version}`);
}

