import { apiRequest } from "@/shared/lib/api-client";
import type {
  CitationManifestView,
  VerificationReportView,
} from "@/features/verification/model/verification.types";

function verificationPath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/verification`;
}

export function getLatestVerification(
  projectId: string,
  snapshotId: string,
): Promise<VerificationReportView> {
  return apiRequest<VerificationReportView>(verificationPath(projectId, snapshotId));
}

export function runVerification(
  projectId: string,
  snapshotId: string,
): Promise<{ report: VerificationReportView }> {
  return apiRequest<{ report: VerificationReportView }>(`${verificationPath(projectId, snapshotId)}/run`, {
    method: "POST",
  });
}

export function getVerificationRevision(
  projectId: string,
  snapshotId: string,
  version: number,
): Promise<VerificationReportView> {
  return apiRequest<VerificationReportView>(`${verificationPath(projectId, snapshotId)}/revisions/${version}`);
}

export function getCitationManifest(
  projectId: string,
  snapshotId: string,
): Promise<CitationManifestView> {
  const path = `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/citation-manifest`;
  return apiRequest<CitationManifestView>(path);
}

