export interface DraftParagraphFact {
  paragraphId: string;
  text: string;
  usedEvidenceIds: string[];
  usedFindingIds: string[];
  limitationsNoted?: string[];
}

export interface DraftRevision {
  id: string;
  sectionId: string;
  version: number;
  generator: string;
  markdown: string;
  contentHash: string;
  facts: {
    paragraphs?: DraftParagraphFact[];
    [key: string]: unknown;
  };
  warnings?: unknown[];
  createdBy: string;
  createdAt: string;
}

export interface SectionApproval {
  id: string;
  seq: number;
  stage: "H2";
  decision: "APPROVED" | "REJECTED";
  note?: string | null;
  decidedBy: string;
  slrRole?: string | null;
  decidedAt: string;
  targetHash: string;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DraftVersionSummary {
  id: string;
  version: number;
  generator: string;
  contentHash: string;
  createdBy: string;
  createdAt: string;
}

export interface SectionDraftView {
  sectionKey: string;
  revision: DraftRevision;
  approval: { status: ApprovalStatus; decision: SectionApproval | null };
  versions: DraftVersionSummary[];
}

export interface GenerateDraftResponse {
  revision: DraftRevision;
  created: boolean;
}

export interface DecideRevisionResponse {
  approval: SectionApproval;
  created: boolean;
}
