export interface H3StatusView {
  h3Status: 'PENDING' | 'APPROVED' | 'REJECTED';
  canApprove: boolean;
  blockingReasons: string[];
  requiredSections: string[];
  omittedSections: string[];
  compositeTargetHash: string;
  latestApproval: {
    id: string;
    seq: number;
    stage: string;
    decision: 'APPROVED' | 'REJECTED';
    note?: string;
    decidedBy: string;
    slrRole?: string;
    decidedAt: string;
    targetHash: string;
  } | null;
  verificationSummary: {
    version: number;
    status: string;
    passed: number;
    warnings: number;
    failed: number;
    needsReview: number;
    blockingIssuesCount: number;
  } | null;
}

export interface ExportManifestFile {
  filename: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
  description: string;
}

export interface ExportPackageView {
  id: string;
  version: number;
  packageHash: string;
  exportedBy: string;
  exportedAt: string;
  manifest: ExportManifestFile[];
}

export interface LineageEvidenceAnchor {
  id: string;
  externalId: string;
  studyId: string;
  quote: string;
  quoteHashVerified: boolean;
  page?: number;
  section?: string;
  paragraph?: number;
  studyTitle: string;
  studyAuthors: string[];
  studyYear: number;
  studyDoi?: string;
  sourceRevision?: string;
}

export interface LineageFindingAnchor {
  id: string;
  externalId: string;
  fieldName: string;
  sectionName: string;
  valueText: string;
  consensusMatch?: string;
}

export interface LineageItem {
  sectionKey: string;
  paragraphIndex: number;
  paragraphKey?: string;
  text: string;
  rhetoricalMove?: string;
  claimSlot?: string;
  claimStrength?: string;
  usedFindingIds: string[];
  usedEvidenceIds: string[];
  evidence: LineageEvidenceAnchor[];
  findings: LineageFindingAnchor[];
}

export interface LineageQueryResponse {
  count: number;
  lineage: LineageItem[];
}

