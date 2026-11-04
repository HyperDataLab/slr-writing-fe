import type { BlueprintContent, BlueprintIssue } from "@/features/outline/model/outline.types";

export const ANSWERING_SECTION_KEYS = new Set(["results", "discussion", "conclusion"]);

export interface ClaimOption {
  id: string;
  label: string;
}

export function collectQuestionIds(content: BlueprintContent, issues: BlueprintIssue[] = []): string[] {
  return [...new Set([
    ...content.coverage.map((entry) => entry.rqId),
    ...content.sections.flatMap((section) => section.subsections.flatMap((subsection) => subsection.rqIds)),
    ...issues.filter((issue) => issue.code === "COVERAGE_MISSING" || issue.code === "UNKNOWN_RESEARCH_QUESTION")
      .map((issue) => issue.ref)
      .filter((id): id is string => Boolean(id)),
  ])];
}

export function collectClaimOptions(content: BlueprintContent, issues: BlueprintIssue[] = []): ClaimOption[] {
  const options = new Map<string, string>();
  for (const section of content.sections) {
    for (const subsection of section.subsections) {
      for (const id of subsection.claimIds) {
        if (!options.has(id)) options.set(id, `${subsection.title} · ${id}`);
      }
    }
  }
  for (const issue of issues) {
    if (issue.code === "THEME_NOT_PLACED" && issue.ref && !options.has(issue.ref)) {
      options.set(issue.ref, issue.message);
    }
  }
  return [...options].map(([id, label]) => ({ id, label }));
}

export function ensureCoverageEntries(content: BlueprintContent, questionIds: string[]): BlueprintContent {
  const known = new Set(content.coverage.map((entry) => entry.rqId));
  const missing = questionIds.filter((id) => !known.has(id));
  if (missing.length === 0) return content;
  return {
    ...content,
    coverage: [
      ...content.coverage,
      ...missing.map((rqId) => ({ rqId, subsectionIds: [], notApplicableReason: null })),
    ],
  };
}

export function createSubsectionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `user:${crypto.randomUUID()}`;
  return `user:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
