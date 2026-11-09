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

export type MvpArtifactState = "approved" | "unreviewed" | "needs_human_review" | "rejected" | "missing";

/** One run of the linked SLR project, from `GET /projects/:projectId/slr-runs`. */
export interface SlrRunSummary {
  runId: string;
  generatedAt: string;
  generatedBy: string | null;
  corpusHash: string;
  /** Review state of the artifacts the writing MVP reads. */
  mvpArtifacts: Record<string, MvpArtifactState>;
  /** A1 and A10, which the import needs, are approved on slr-be. Informational; readiness at import stays authoritative. */
  importable: boolean;
  /** All four MVP artifacts are approved. */
  complete: boolean;
  /** Snapshots of this project already imported from the run. */
  snapshots: Array<{ id: string; status: string }>;
}

export interface SnapshotImportResponse {
  snapshot: SnapshotSummary;
  created: boolean;
  warnings: ReadinessIssue[];
}

export interface SlrHealthStatus {
  reachable: boolean;
  baseUrl: string;
  latencyMs?: number;
  error?: string;
}

