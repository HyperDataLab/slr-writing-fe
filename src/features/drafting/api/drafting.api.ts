import { apiRequest } from "@/shared/lib/api-client";
import type {
  DecideRevisionResponse,
  GenerateDraftResponse,
  SectionDraftView,
} from "@/features/drafting/model/drafting.types";

function sectionPath(projectId: string, snapshotId: string, sectionKey: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/sections/${encodeURIComponent(sectionKey)}`;
}

export function getSectionDraft(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
): Promise<SectionDraftView> {
  return apiRequest<SectionDraftView>(sectionPath(projectId, snapshotId, sectionKey));
}

export function generateSectionDraft(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
): Promise<GenerateDraftResponse> {
  return apiRequest<GenerateDraftResponse>(`${sectionPath(projectId, snapshotId, sectionKey)}/draft`, {
    method: "POST",
  });
}

export function saveSectionDraft(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
  input: { baseVersion: number; markdown: string },
): Promise<GenerateDraftResponse> {
  return apiRequest<GenerateDraftResponse>(sectionPath(projectId, snapshotId, sectionKey), {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getSectionRevision(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
  version: number,
): Promise<SectionDraftView> {
  return apiRequest<SectionDraftView>(`${sectionPath(projectId, snapshotId, sectionKey)}/revisions/${version}`);
}

export function approveSectionRevision(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
  version: number,
  note?: string,
): Promise<DecideRevisionResponse> {
  return apiRequest<DecideRevisionResponse>(`${sectionPath(projectId, snapshotId, sectionKey)}/approve`, {
    method: "POST",
    body: JSON.stringify({ version, ...(note ? { note } : {}) }),
  });
}

export function rejectSectionRevision(
  projectId: string,
  snapshotId: string,
  sectionKey: string,
  version: number,
  note: string,
): Promise<DecideRevisionResponse> {
  return apiRequest<DecideRevisionResponse>(`${sectionPath(projectId, snapshotId, sectionKey)}/reject`, {
    method: "POST",
    body: JSON.stringify({ version, note }),
  });
}

