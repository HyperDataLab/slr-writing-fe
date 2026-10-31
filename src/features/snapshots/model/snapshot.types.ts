export interface ImportSnapshotInput {
  runId: string;
}

export type SnapshotStatus = "IMPORTED" | "READY" | "BLOCKED" | "STALE";
export type ReadinessSeverity = "blocking" | "warning";

export interface ReadinessIssue {
  code: string;
  severity: ReadinessSeverity;
  message?: string;
}

export interface ReadinessReport {
  status: "READY" | "BLOCKED";
  issues: ReadinessIssue[];
}

