export interface DraftRevision {
  version: number;
  generator: string;
  markdown: string;
  contentHash: string;
  facts: {
    paragraphs?: Array<{
      paragraphId?: string;
      paragraphKey?: string;
      text?: string;
      usedEvidenceIds?: string[];
      usedFindingIds?: string[];
    }>;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface SectionApproval {
  id: string;
  seq: number;
  stage: 'H2';
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
  decidedBy: string;
  slrRole?: string;
  decidedAt: string;
  targetHash: string;
}

export interface SectionDraftView {
  sectionKey: string;
  title: string;
  latestRevision: DraftRevision | null;
  approval: SectionApproval | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  revisionsCount: number;
}

export interface GenerateDraftResponse {
  revision: DraftRevision;
  usedCitations?: string[];
}

export interface DecideRevisionResponse {
  approval: SectionApproval;
}

