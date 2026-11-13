import { apiRequest } from '@/shared/lib/api-client';
import type {
  EvidenceDetail,
  EvidenceListView,
  EvidenceQueryParams,
} from '@/features/evidence/model/evidence.types';

function evidenceBasePath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/evidence`;
}

export function getSnapshotEvidence(
  projectId: string,
  snapshotId: string,
  params?: EvidenceQueryParams,
): Promise<EvidenceListView> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (typeof params?.verified === 'boolean') searchParams.set('verified', String(params.verified));
  if (params?.studyId) searchParams.set('studyId', params.studyId);
  if (params?.claimId) searchParams.set('claimId', params.claimId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = query
    ? `${evidenceBasePath(projectId, snapshotId)}?${query}`
    : evidenceBasePath(projectId, snapshotId);

  return apiRequest<EvidenceListView>(url);
}

export function getSnapshotEvidenceById(
  projectId: string,
  snapshotId: string,
  evidenceId: string,
): Promise<EvidenceDetail> {
  return apiRequest<EvidenceDetail>(
    `${evidenceBasePath(projectId, snapshotId)}/${encodeURIComponent(evidenceId)}`,
  );
}

