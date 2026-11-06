export type GateStatus = 'PASS' | 'WARN' | 'FAIL' | 'NEEDS_REVIEW';
export type VerificationOverallStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';

export interface GateIssue {
  code: string;
  message: string;
  severity: 'BLOCKING' | 'WARNING' | 'INFO';
  location?: string;
  details?: unknown;
}

export interface GateResultView {
  gateId: string;
  status: GateStatus;
  message: string;
  blocking: boolean;
  metrics: Record<string, unknown>;
  issues: GateIssue[];
}

export interface VerificationSummaryView {
  passed: number;
  warnings: number;
  failed: number;
  needsReview: number;
  blockingIssues: number;
  totalGates: number;
}

export interface VerificationReportView {
  id: string;
  manuscriptId: string;
  version: number;
  status: VerificationOverallStatus;
  gates: Record<'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | string, GateResultView>;
  summary: VerificationSummaryView;
  compositeTargetHash: string;
  createdAt: string;
}

export interface CitationManifestEntry {
  marker: string;
  kind: 'study' | 'evidence' | 'finding';
  externalId: string;
  title?: string;
  authors?: string[];
  year?: number;
  quote?: string;
}

export interface CitationManifestView {
  version: number;
  entries: CitationManifestEntry[];
}

