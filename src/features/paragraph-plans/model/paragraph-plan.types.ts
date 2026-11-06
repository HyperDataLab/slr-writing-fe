export type RhetoricalMove =
  | "theme_overview"
  | "report_evidence"
  | "compare_and_synthesize"
  | "discuss_limitation"
  | "conclude_subtopic";

export type ClaimStrength = "neutral" | "qualified" | "strong";
export type ParagraphPlanStatus = "DRAFT" | "NEEDS_EVIDENCE" | "READY_TO_DRAFT";
export type SentenceSlot = "topic" | "evidence" | "synthesis" | "qualification" | "limitation";

export interface ParagraphPlanItem {
  id: string;
  sectionKey: string;
  subsectionId: string;
  rhetoricalMove: RhetoricalMove;
  rqIds: string[];
  claimIds: string[];
  findingIds: string[];
  evidenceIds: string[];
  claimStrength: ClaimStrength;
  conditionsRequired: boolean;
  citationPolicy: "registry_only";
  sentenceSlots: SentenceSlot[];
  limitations: string[];
  status: ParagraphPlanStatus;
}

export interface ParagraphPlanRevision {
  id: string;
  manuscriptId: string;
  version: number;
  blueprintRevisionId: string;
  content: { blueprintVersion: number; plans: ParagraphPlanItem[] };
  contentHash: string;
  origin: string;
  totalParagraphs: number;
  readyParagraphs: number;
  createdBy: string;
  createdAt: string;
}

export interface ParagraphPlanIssue {
  code: string;
  severity: string;
  message: string;
  ref?: string;
}

export interface ParagraphPlanVersionSummary {
  id: string;
  version: number;
  origin: string;
  contentHash: string;
  totalParagraphs: number;
  readyParagraphs: number;
  createdBy: string;
  createdAt: string;
}

export interface ParagraphPlanView {
  revision: ParagraphPlanRevision;
  issues: ParagraphPlanIssue[];
  readyToDraft: boolean;
  stats: { totalParagraphs: number; readyParagraphs: number };
  versions: ParagraphPlanVersionSummary[];
}

export interface ParagraphPlanMutationResponse {
  revision: ParagraphPlanRevision;
  created: boolean;
}
