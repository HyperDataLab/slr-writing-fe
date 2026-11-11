export interface MethodsFactItem {
  id?: string;
  text: string;
  count?: number;
}

export type MethodsFactValue = number | string | MethodsFactItem[];

export interface MethodsFact {
  key: string;
  label: string;
  status: "explicit" | "missing";
  value: MethodsFactValue | null;
  source: string;
  derivation?: string;
}

export interface MethodsWarning {
  code: string;
  severity: "warning";
  message: string;
  ref?: string;
}

export interface MethodsFactPassage {
  id: string;
  startLine: number;
  endLine: number;
  factKeys: string[];
}

export interface MethodsRevision {
  id: string;
  sectionId: string;
  version: number;
  markdown: string;
  facts: MethodsFact[];
  factPassages?: MethodsFactPassage[];
  warnings: MethodsWarning[];
  generator: string;
  contentHash: string;
  createdBy: string;
  createdAt: string;
}

export interface MethodsRevisionSummary {
  id: string;
  version: number;
  generator: string;
  contentHash: string;
  createdBy: string;
  createdAt: string;
}

export interface LatestMethodsResponse {
  revision: MethodsRevision;
  versions: MethodsRevisionSummary[];
}

export interface GenerateMethodsResponse {
  revision: MethodsRevision;
  created: boolean;
}
