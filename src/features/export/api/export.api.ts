import { ApiError, apiRequest, authHeaders } from "@/shared/lib/api-client";
import type {
  ExportPackageView,
  H3StatusView,
  LineageQueryResponse,
} from "@/features/export/model/export.types";

function manuscriptPath(projectId: string, snapshotId: string) {
  return `/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript`;
}

export function getH3Status(projectId: string, snapshotId: string): Promise<H3StatusView> {
  return apiRequest<H3StatusView>(`${manuscriptPath(projectId, snapshotId)}/final/status`);
}

export function approveH3(
  projectId: string,
  snapshotId: string,
  note?: string,
): Promise<{ decision: string; seq: number }> {
  return apiRequest<{ decision: string; seq: number }>(`${manuscriptPath(projectId, snapshotId)}/final/approve`, {
    method: "POST",
    body: JSON.stringify({ ...(note ? { note } : {}) }),
  });
}

export function rejectH3(
  projectId: string,
  snapshotId: string,
  note: string,
): Promise<{ decision: string; seq: number }> {
  return apiRequest<{ decision: string; seq: number }>(`${manuscriptPath(projectId, snapshotId)}/final/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function createExportPackage(projectId: string, snapshotId: string): Promise<ExportPackageView> {
  return apiRequest<ExportPackageView>(`${manuscriptPath(projectId, snapshotId)}/export`, {
    method: "POST",
  });
}

export function getLatestExportPackage(projectId: string, snapshotId: string): Promise<ExportPackageView> {
  return apiRequest<ExportPackageView>(`${manuscriptPath(projectId, snapshotId)}/export`);
}

export function getExportPackageRevision(
  projectId: string,
  snapshotId: string,
  version: number,
): Promise<ExportPackageView> {
  return apiRequest<ExportPackageView>(`${manuscriptPath(projectId, snapshotId)}/export/revisions/${version}`);
}

export async function downloadExportZipFile(projectId: string, snapshotId: string): Promise<{ blob: Blob; filename: string }> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const path = `${manuscriptPath(projectId, snapshotId)}/export/download`;
  const url = `${baseUrl}/api${path}`;

  const { headers } = await authHeaders();
  const response = await fetch(url, { headers });
  if (!response.ok) {
    // The backend answers with the usual error envelope; keep its code so callers can tell a missing H3 from a bad session.
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    throw new ApiError(
      payload?.error?.message ?? `Failed to download export package (HTTP ${response.status})`,
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
    );
  }

  const disposition = response.headers.get("Content-Disposition");
  let filename = "submission-package.zip";
  if (disposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, "");
    }
  }

  const blob = await response.blob();
  return { blob, filename };
}

export async function downloadExportPdfFile(
  projectId: string,
  snapshotId: string,
  options?: {
    format?: "ieee" | "imrad";
    version?: number;
    inline?: boolean;
  },
): Promise<{ blob: Blob; filename: string }> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const query = new URLSearchParams();
  if (options?.format) query.set("format", options.format);
  if (options?.version) query.set("version", String(options.version));
  if (options?.inline) query.set("inline", "1");

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const path = `${manuscriptPath(projectId, snapshotId)}/export/download-pdf${queryString}`;
  const url = `${baseUrl}/api${path}`;

  const { headers } = await authHeaders();
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    throw new ApiError(
      payload?.error?.message ?? `Failed to download PDF publication (HTTP ${response.status})`,
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
    );
  }

  const disposition = response.headers.get("Content-Disposition");
  let filename = `manuscript-${options?.format ?? "ieee"}.pdf`;
  if (disposition) {
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, "");
    }
  }

  const blob = await response.blob();
  return { blob, filename };
}

export function queryLineage(
  projectId: string,
  snapshotId: string,
  params?: {
    sectionKey?: string;
    evidenceId?: string;
    findingId?: string;
    sentence?: string;
  },
): Promise<LineageQueryResponse> {
  const search = new URLSearchParams();
  if (params?.sectionKey) search.set("sectionKey", params.sectionKey);
  if (params?.evidenceId) search.set("evidenceId", params.evidenceId);
  if (params?.findingId) search.set("findingId", params.findingId);
  if (params?.sentence) search.set("sentence", params.sentence);

  const queryStr = search.toString();
  const path = `${manuscriptPath(projectId, snapshotId)}/lineage${queryStr ? `?${queryStr}` : ""}`;
  return apiRequest<LineageQueryResponse>(path);
}

