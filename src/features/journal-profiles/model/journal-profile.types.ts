export type JournalProfileSource =
  | "A1"
  | "A2"
  | "A7"
  | "A10"
  | "prisma_writing_export"
  | "rq_findings"
  | "other_sections";

export interface JournalProfileSection {
  key: string;
  title: string;
  order: number;
  required: boolean;
  wordBudget: { min: number; max: number };
  sources: JournalProfileSource[];
  generator: string | null;
  purpose: string;
}

export interface JournalProfile {
  id: string;
  version: number;
  name: string;
  articleType: "systematic_review";
  language: "en";
  journal: { name: string | null; url: string | null };
  verification: {
    status: "unverified" | "verified";
    verifiedAt: string | null;
    verifiedBy: string | null;
    policySourceUrls: string[];
  };
  wordBudgetSource: "suggested_default" | "journal_policy";
  citationStyle: string | null;
  notice: string | null;
  sections: JournalProfileSection[];
}
