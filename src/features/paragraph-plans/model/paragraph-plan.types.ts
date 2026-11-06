export interface ParagraphPlanItemView {
  id: string;
  paragraphKey: string;
  rhetoricalMove: string;
  claimSlot: string;
  claimStrength: 'DEFINITIVE' | 'PROBABILISTIC' | 'HEDGED';
  sectionKey: string;
  targetFindings: string[];
  targetEvidence: string[];
  status: 'READY' | 'PLANNED' | 'NEEDS_EVIDENCE';
}

export interface ParagraphPlanRevisionView {
  version: number;
  generator: string;
  contentHash: string;
  totalParagraphs: number;
  readyParagraphs: number;
  sections: Record<string, { count: number; ready: number }>;
  paragraphs: ParagraphPlanItemView[];
  createdAt: string;
}

export interface ParagraphPlanView {
  manuscriptId: string;
  snapshotId: string;
  revision: ParagraphPlanRevisionView;
}

