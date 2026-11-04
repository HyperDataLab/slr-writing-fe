import { downloadFile, requestJson, type ApiSession } from "@/shared/api/client";

export type JsonRecord = Record<string, unknown>;

export interface WritingProject {
  id: string;
  name: string;
  ownerId: string;
  slrProjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlrProject {
  id: string;
  name: string;
  title?: string;
  code?: string | null;
  domain?: string | null;
  status?: string | number | null;
  statusText?: string | null;
  updatedAt?: string | null;
  roleText?: string;
}

export interface SlrRun {
  runId: string;
  projectId: string;
  generatedAt: string;
  corpusHash: string;
  corpusVersion: string;
  generatorVersion: string;
  artifacts: Array<{
    artifactType: string;
    reviewStatus: "unreviewed" | "needs_human_review" | "approved" | "rejected";
    validationStatus: "valid" | "invalid" | "not_applicable";
  }>;
}

export interface SnapshotSummary {
  id: string;
  projectId: string;
  sourceSystem: string;
  sourceRunId: string;
  corpusHash: string;
  corpusVersion: string;
  generatorVersion: string;
  schemaVersion: string;
  status: string;
  importedBy: string;
  importedAt: string;
}

export interface ReadinessIssue {
  code: string;
  severity: "blocking" | "warning";
  message: string;
  ref?: string;
}

export interface SnapshotDetails extends SnapshotSummary {
  issues: ReadinessIssue[];
  integrityHash: string;
  artifacts: Array<JsonRecord & { artifactType: string; reviewStatus: string; validationStatus: string }>;
  supplements: Array<JsonRecord & { kind: string }>;
  _count: {
    researchQuestions: number;
    studies: number;
    documents: number;
    findings: number;
    evidence: number;
    claims: number;
  };
}

export interface JournalProfile {
  id: string;
  version: number;
  name: string;
  articleType: string;
  language: string;
  journal: { name: string | null; url: string | null };
  verification: { status: string; verifiedAt: string | null; verifiedBy: string | null; policySourceUrls: string[] };
  wordBudgetSource: string;
  citationStyle: string | null;
  notice: string | null;
  sections: Array<{
    key: string;
    title: string;
    order: number;
    required: boolean;
    wordBudget: { min: number; max: number };
    sources: string[];
    generator: string | null;
    purpose: string;
  }>;
}

export interface VersionedRevision extends JsonRecord {
  id: string;
  version: number;
  markdown?: string;
  content?: unknown;
  warnings?: Array<JsonRecord & { message: string }>;
  facts?: unknown;
}

export interface BlueprintView {
  revision: VersionedRevision;
  issues: ReadinessIssue[];
  approvable: boolean;
  approval: { status: string; decision: JsonRecord | null };
  versions: Array<JsonRecord & { id: string; version: number }>;
}

export interface ParagraphPlansView {
  revision: VersionedRevision;
  issues: ReadinessIssue[];
  readyToDraft: boolean;
  stats: { totalParagraphs: number; readyParagraphs: number };
  versions: Array<JsonRecord & { id: string; version: number }>;
}

export interface DraftView {
  sectionKey: string;
  revision: VersionedRevision;
  approval: { status: string; decision: JsonRecord | null };
  versions: Array<JsonRecord & { id: string; version: number }>;
}

const api = <T>(path: string, session: ApiSession, init?: RequestInit) => requestJson<T>(`/api${path}`, session, init);
const json = (value: unknown) => JSON.stringify(value);

export const workspaceApi = {
  listProjects: (session: ApiSession) => api<WritingProject[]>("/projects", session),
  createProject: (session: ApiSession, input: { name: string; slrProjectId: string }) => api<WritingProject>("/projects", session, { method: "POST", body: json(input) }),
  listSlrProjects: async (session: ApiSession, search = "") => {
    const params = new URLSearchParams({ pageNumber: "1", pageSize: "100" });
    if (search.trim()) params.set("search", search.trim());
    return api<{ items: SlrProject[]; totalCount: number }>(`/slr/projects?${params}`, session);
  },
  listRuns: (session: ApiSession, slrProjectId: string) => api<SlrRun[]>(`/slr/projects/${encodeURIComponent(slrProjectId)}/runs`, session),
  listSnapshots: (session: ApiSession, projectId: string) => api<SnapshotSummary[]>(`/projects/${encodeURIComponent(projectId)}/snapshots`, session),
  getSnapshot: (session: ApiSession, projectId: string, snapshotId: string) => api<SnapshotDetails>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}`, session),
  importRun: (session: ApiSession, projectId: string, runId: string) => api<{ snapshot: SnapshotSummary; created: boolean; warnings: ReadinessIssue[] }>(`/projects/${encodeURIComponent(projectId)}/snapshots/from-slr`, session, { method: "POST", body: json({ runId }) }),
  listProfiles: (session: ApiSession) => api<JournalProfile[]>("/journal-profiles", session),
  getProfile: (session: ApiSession, profileId: string) => api<JournalProfile>(`/journal-profiles/${encodeURIComponent(profileId)}`, session),
  getMethods: (session: ApiSession, projectId: string, snapshotId: string) => api<{ revision: VersionedRevision; versions: JsonRecord[] }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/methods`, session),
  generateMethods: (session: ApiSession, projectId: string, snapshotId: string) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/methods`, session, { method: "POST", body: "{}" }),
  getBlueprint: (session: ApiSession, projectId: string, snapshotId: string) => api<BlueprintView>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/blueprint`, session),
  createBlueprint: (session: ApiSession, projectId: string, snapshotId: string, profileId?: string) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/blueprint`, session, { method: "POST", body: json(profileId ? { profileId } : {}) }),
  saveBlueprint: (session: ApiSession, projectId: string, snapshotId: string, baseVersion: number, content: unknown) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/blueprint`, session, { method: "PUT", body: json({ baseVersion, content }) }),
  decideBlueprint: (session: ApiSession, projectId: string, snapshotId: string, decision: "approve" | "reject", version: number, note?: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/blueprint/${decision}`, session, { method: "POST", body: json({ version, ...(note ? { note } : {}) }) }),
  getPlans: (session: ApiSession, projectId: string, snapshotId: string) => api<ParagraphPlansView>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/paragraph-plans`, session),
  createPlans: (session: ApiSession, projectId: string, snapshotId: string) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/paragraph-plans`, session, { method: "POST", body: "{}" }),
  getDraft: (session: ApiSession, projectId: string, snapshotId: string, sectionKey: string) => api<DraftView>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/sections/${encodeURIComponent(sectionKey)}`, session),
  generateDraft: (session: ApiSession, projectId: string, snapshotId: string, sectionKey: string) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/sections/${encodeURIComponent(sectionKey)}/draft`, session, { method: "POST", body: "{}" }),
  saveDraft: (session: ApiSession, projectId: string, snapshotId: string, sectionKey: string, baseVersion: number, markdown: string) => api<{ revision: VersionedRevision; created: boolean }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/sections/${encodeURIComponent(sectionKey)}`, session, { method: "PUT", body: json({ baseVersion, markdown }) }),
  decideDraft: (session: ApiSession, projectId: string, snapshotId: string, sectionKey: string, decision: "approve" | "reject", version: number, note?: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/sections/${encodeURIComponent(sectionKey)}/${decision}`, session, { method: "POST", body: json({ version, ...(note ? { note } : {}) }) }),
  getVerification: (session: ApiSession, projectId: string, snapshotId: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/verification`, session),
  runVerification: (session: ApiSession, projectId: string, snapshotId: string) => api<{ created: boolean; report: JsonRecord }>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/verification/run`, session, { method: "POST", body: "{}" }),
  getFinalStatus: (session: ApiSession, projectId: string, snapshotId: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/final/status`, session),
  decideFinal: (session: ApiSession, projectId: string, snapshotId: string, decision: "approve" | "reject", note?: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/final/${decision}`, session, { method: "POST", body: json(note ? { note } : {}) }),
  createExport: (session: ApiSession, projectId: string, snapshotId: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/export`, session, { method: "POST", body: "{}" }),
  getExport: (session: ApiSession, projectId: string, snapshotId: string) => api<JsonRecord>(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/export`, session),
  downloadExport: (session: ApiSession, projectId: string, snapshotId: string) => downloadFile(`/api/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(snapshotId)}/manuscript/export/download`, session),
};
