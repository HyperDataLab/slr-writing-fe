export interface BlueprintSubsection {
  id: string;
  title: string;
  purpose: string | null;
  claimIds: string[];
  rqIds: string[];
}

export interface BlueprintSection {
  key: string;
  include: boolean;
  wordBudget: { min: number; max: number };
  subsections: BlueprintSubsection[];
}

export interface BlueprintCoverage {
  rqId: string;
  subsectionIds: string[];
  notApplicableReason: string | null;
}

export interface BlueprintContent {
  profile: { id: string; version: number };
  sections: BlueprintSection[];
  coverage: BlueprintCoverage[];
}

export interface BlueprintRevision {
  id: string;
  manuscriptId: string;
  version: number;
  profileId: string;
  profileVersion: number;
  content: BlueprintContent;
  contentHash: string;
  origin: "generated" | "edited";
  createdBy: string;
  createdAt: string;
}

export interface BlueprintIssue {
  code: string;
  severity: "blocking" | "warning";
  message: string;
  ref?: string;
}

export interface BlueprintApproval {
  id: string;
  seq: number;
  stage: "H1" | "H2" | "H3";
  targetKind: string;
  targetId: string;
  targetHash: string;
  decision: "APPROVED" | "REJECTED";
  note: string | null;
  decidedBy: string;
  slrRole: string;
  decidedAt: string;
}

export interface BlueprintVersionSummary {
  id: string;
  version: number;
  origin: "generated" | "edited";
  contentHash: string;
  createdBy: string;
  createdAt: string;
}

export interface BlueprintView {
  revision: BlueprintRevision;
  issues: BlueprintIssue[];
  approvable: boolean;
  approval: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    decision: BlueprintApproval | null;
  };
  versions: BlueprintVersionSummary[];
}

export interface BlueprintMutationResponse {
  revision: BlueprintRevision;
  created: boolean;
}

export interface BlueprintDecisionResponse {
  approval: BlueprintApproval;
  created: boolean;
}
