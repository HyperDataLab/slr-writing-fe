export type GateStatus = "PASS" | "WARNING" | "FAIL" | "NEEDS_REVIEW" | "NOT_APPLICABLE" | "NOT_RUN";
export type GateSeverity = "BLOCKING" | "WARNING";
export type GateId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
export type VerificationOverallStatus = "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED";

export interface ReviewIssue {
  id: string;
  gateId: GateId;
  severity: GateSeverity;
  sectionKey: string;
  target: string;
  message: string;
  evidenceExcerpt?: string;
  suggestedRemedy?: string;
}

export interface QualityGateResult {
  gateId: GateId;
  name: string;
  status: GateStatus;
  severity: GateSeverity;
  message: string;
  issuesCount: number;
  details: Record<string, unknown>;
  evaluatedAt: string;
}

export interface CitationItem {
  citationId: string;
  sectionKey: string;
  paragraphId: string;
  evidenceId?: string;
  findingId?: string;
  studyId: string;
  studyTitle: string;
  studyYear: number | null;
  quote?: string;
  quoteHashVerified: boolean;
  isResolved: boolean;
}

export interface UnresolvedCitation {
  marker: string;
  location: string;
  reason: string;
}

export interface CitationManifestView {
  manuscriptId: string;
  snapshotId: string;
  items: CitationItem[];
  unresolvedCitations: UnresolvedCitation[];
  totalCitations: number;
  resolvedCitations: number;
}

export interface VerificationSummaryView {
  totalGates: number;
  passed: number;
  warnings: number;
  failed: number;
  needsReview: number;
  notApplicable: number;
  notRun: number;
  blockingIssues: number;
  warningIssues: number;
}

export interface VerificationVersionRow {
  version: number;
  status: VerificationOverallStatus;
  runAt: string;
  runBy: string;
}

export interface VerificationReportView {
  id: string;
  manuscriptId: string;
  version: number;
  status: VerificationOverallStatus;
  summary: VerificationSummaryView;
  manifest: CitationManifestView;
  gates: Partial<Record<GateId, QualityGateResult>>;
  issues: ReviewIssue[];
  runBy: string;
  runAt: string;
  versions: VerificationVersionRow[];
}
