export interface ImportSnapshotInput {
  runId: string;
}

export type SnapshotStatus = "IMPORTED" | "READY" | "BLOCKED" | "STALE";
export type ReadinessSeverity = "blocking" | "warning";

export interface ReadinessIssue {
  code: string;
  severity: ReadinessSeverity;
  message: string;
  ref?: string;
}

export interface ReadinessReport {
  status: "READY" | "BLOCKED";
  issues: ReadinessIssue[];
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
  status: SnapshotStatus;
  importedBy: string;
  importedAt: string;
}

export interface SnapshotDetail extends SnapshotSummary {
  issues: ReadinessIssue[] | null;
  integrityHash: string;
  artifacts: Array<{
    artifactType: string;
    artifactId: string;
    contentHash: string;
    reviewStatus: string;
    validationStatus: string;
  }>;
  supplements: Array<{ kind: string; schemaVersion: string | null; contentHash: string }>;
  _count: {
    researchQuestions: number;
    studies: number;
    documents: number;
    findings: number;
    evidence: number;
    claims: number;
  };
}

export interface SnapshotImportResponse {
  snapshot: SnapshotSummary;
  created: boolean;
  warnings: ReadinessIssue[];
}

