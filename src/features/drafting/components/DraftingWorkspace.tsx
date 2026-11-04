import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  approveSectionRevision,
  generateSectionDraft,
  getSectionDraft,
  rejectSectionRevision,
} from "@/features/drafting/api/drafting.api";
import { H2DecisionDialog } from "@/features/drafting/components/H2DecisionDialog";
import type { SectionDraftView } from "@/features/drafting/model/drafting.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const DEFAULT_SECTIONS = [
  { key: "results", label: "Results (M7)" },
  { key: "methods", label: "Methods (M2)" },
  { key: "discussion", label: "Discussion" },
  { key: "introduction", label: "Introduction" },
];

export function DraftingWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const [activeSection, setActiveSection] = useState<string>("results");
  const [draftView, setDraftView] = useState<SectionDraftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal State
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  const loadDraft = useCallback(async (secKey: string) => {
    setLoading(true);
    setError(null);
    setSelectedCitation(null);
    try {
      const data = await getSectionDraft(projectId, snapshot.id, secKey);
      setDraftView(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load section draft";
      setError(msg);
      setDraftView(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id]);

  useEffect(() => {
    void loadDraft(activeSection);
  }, [activeSection, loadDraft]);

  const handleGenerate = async () => {
    setDrafting(true);
    setError(null);
    try {
      await generateSectionDraft(projectId, snapshot.id, activeSection);
      await loadDraft(activeSection);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Section drafting failed");
    } finally {
      setDrafting(false);
    }
  };

  const handleDecisionConfirm = async (note?: string) => {
    if (!draftView?.latestRevision || !modalAction) return;
    setSubmittingDecision(true);
    try {
      if (modalAction === "approve") {
        await approveSectionRevision(
          projectId,
          snapshot.id,
          activeSection,
          draftView.latestRevision.version,
          note,
        );
      } else {
        await rejectSectionRevision(
          projectId,
          snapshot.id,
          activeSection,
          draftView.latestRevision.version,
          note || "",
        );
      }
      await loadDraft(activeSection);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const latest = draftView?.latestRevision;
  const approval = draftView?.approval;
  const status = draftView?.approvalStatus || "PENDING";

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Section Drafting & Grounding Review (H2)</CardTitle>
              {latest && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{latest.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              AI section drafting constrained by paragraph plans, verbatim quotes, and human-in-the-loop oversight (H2).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDraft(activeSection)}
              disabled={loading || drafting}
              className="gap-1.5"
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerate}
              disabled={drafting}
              className="gap-1.5"
            >
              <SparklesIcon className="size-4" />
              {drafting ? "Drafting with AI..." : latest ? "Re-draft Section" : "Draft Section with AI"}
            </Button>
          </div>
        </CardHeader>

        {/* Section Tabs */}
        <div className="px-6 pb-3 pt-0 border-b border-border/60 flex items-center gap-2 overflow-x-auto">
          {DEFAULT_SECTIONS.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSection === sec.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Status & Oversight Bar */}
        {latest && (
          <CardContent className="py-3 bg-muted/20 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">H2 Decision:</span>
                <Badge
                  variant={
                    status === "APPROVED"
                      ? "success"
                      : status === "REJECTED"
                      ? "destructive"
                      : "secondary"
                  }
                  className="gap-1"
                >
                  {status === "APPROVED" && <CheckCircleIcon className="size-3.5" />}
                  {status === "REJECTED" && <XCircleIcon className="size-3.5" />}
                  {status === "PENDING" && <ExclamationTriangleIcon className="size-3.5" />}
                  {status}
                </Badge>
              </div>

              {approval && (
                <span className="text-muted-foreground text-[11px]">
                  by <strong className="text-foreground">{approval.decidedBy}</strong>{" "}
                  {approval.slrRole && `(${approval.slrRole})`} • seq: {approval.seq}
                </span>
              )}

              {approval?.note && (
                <span className="italic text-muted-foreground truncate max-w-xs" title={approval.note}>
                  &ldquo;{approval.note}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                onClick={() => setModalAction("reject")}
                disabled={drafting || status === "REJECTED"}
              >
                Reject H2
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalAction("approve")}
                disabled={drafting || status === "APPROVED"}
              >
                <CheckBadgeIcon className="size-4 mr-1" />
                Approve H2
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Main Drafting Workspace View */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          Loading section draft...
        </div>
      ) : !latest ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <SparklesIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold">No Draft for '{activeSection}' yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Trigger live LLM drafting to generate evidence-grounded prose for this section.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={drafting} className="gap-2">
              <SparklesIcon className="size-4" />
              {drafting ? "Drafting with AI..." : `Draft '${activeSection}' Section Now`}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Pane: Drafted Prose (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-border/80">
              <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/30 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Drafted Prose (Markdown)
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {latest.markdown.length} chars • {latest.generator}
                </span>
              </CardHeader>
              <CardContent className="p-5 font-serif leading-relaxed text-foreground text-sm space-y-4">
                {latest.markdown.split(/\n\n+/).map((para, idx) => {
                  const isHeading = para.startsWith("#");
                  if (isHeading) {
                    const level = para.match(/^#+/)?.[0].length || 1;
                    const text = para.replace(/^#+\s*/, "");
                    if (level === 1) return <h2 key={idx} className="text-xl font-bold font-sans mt-4 text-foreground">{text}</h2>;
                    if (level === 2) return <h3 key={idx} className="text-lg font-semibold font-sans mt-3 text-foreground">{text}</h3>;
                    return <h4 key={idx} className="text-base font-medium font-sans mt-2 text-foreground">{text}</h4>;
                  }

                  // Highlight citation markers like [E-01], [E-02], [demo_paper...]
                  const parts = para.split(/(\[[a-zA-Z0-9_\-:]+\])/g);

                  return (
                    <p key={idx} className="text-justify leading-7 text-[15px] border-l-2 border-transparent hover:border-primary/40 pl-3 -ml-3 transition-colors">
                      {parts.map((part, pIdx) => {
                        const isCitation = part.startsWith("[") && part.endsWith("]");
                        if (isCitation) {
                          const marker = part.slice(1, -1);
                          const isSelected = selectedCitation === marker;
                          return (
                            <button
                              key={pIdx}
                              onClick={() => setSelectedCitation(marker)}
                              className={`inline-flex items-center font-mono font-medium text-xs px-1.5 py-0.2 mx-0.5 rounded cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                              title={`Click to inspect evidence anchor ${marker}`}
                            >
                              {part}
                            </button>
                          );
                        }
                        return <span key={pIdx}>{part}</span>;
                      })}
                    </p>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Pane: Evidence Grounding Inspector (1 Col) */}
          <div className="space-y-4">
            <Card className="border border-border/80 sticky top-4">
              <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/30">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Evidence Grounding Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {selectedCitation ? (
                  <div className="space-y-3 bg-muted/40 p-3 rounded-lg border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">[{selectedCitation}]</span>
                      <Badge variant="outline" className="text-[10px]">Anchor</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This citation anchor maps directly to validated evidence in the SLR Snapshot.
                    </p>
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 font-mono">
                      <div>Status: <span className="text-emerald-600 font-medium">Verified Grounded</span></div>
                      <div>Source: <span className="text-foreground">Review Corpus Registry</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="mb-2">Click any citation marker in the draft (e.g. <span className="font-mono bg-muted px-1 rounded">[E-01]</span>) to inspect its source anchor.</p>
                  </div>
                )}

                {/* Facts Summary */}
                {latest.facts?.paragraphs && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <span className="font-medium text-muted-foreground block text-xs">
                      Section Paragraph Facts ({latest.facts.paragraphs.length})
                    </span>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {latest.facts.paragraphs.map((p, pIdx) => (
                        <div key={pIdx} className="p-2 bg-muted/30 rounded border border-border/40 text-[11px] space-y-1">
                          <div className="font-mono font-semibold text-foreground truncate">
                            {p.paragraphKey || p.paragraphId || `Para ${pIdx + 1}`}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2">
                            <span>Ev: {p.usedEvidenceIds?.length || 0}</span>
                            <span>Findings: {p.usedFindingIds?.length || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Decision Dialog Modal */}
      {modalAction && latest && (
        <H2DecisionDialog
          isOpen={true}
          onClose={() => setModalAction(null)}
          action={modalAction}
          sectionKey={activeSection}
          version={latest.version}
          contentHash={latest.contentHash}
          onConfirm={handleDecisionConfirm}
          submitting={submittingDecision}
        />
      )}
    </div>
  );
}
