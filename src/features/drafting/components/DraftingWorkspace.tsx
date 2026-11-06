import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { Link } from "react-router";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  approveSectionRevision,
  generateSectionDraft,
  getSectionDraft,
  rejectSectionRevision,
  saveSectionDraft,
} from "@/features/drafting/api/drafting.api";
import { ApiError } from "@/shared/lib/api-client";
import { DraftEditor } from "@/features/drafting/components/DraftEditor";
import { getLatestVerification } from "@/features/verification/api/verification.api";
import { H2DecisionDialog } from "@/features/drafting/components/H2DecisionDialog";
import type { SectionDraftView } from "@/features/drafting/model/drafting.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/** Written last, from the sections a person has approved (H2), not from paragraph plans. */
const SYNTHESIS_SECTIONS = ["abstract", "conclusion"];

const DEFAULT_SECTIONS = [
  { key: "abstract", label: "draft.tab.abstract" },
  { key: "introduction", label: "draft.tab.introduction" },
  { key: "methods", label: "draft.tab.methods" },
  { key: "results", label: "draft.tab.results" },
  { key: "discussion", label: "draft.tab.discussion" },
  { key: "conclusion", label: "draft.tab.conclusion" },
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
  const { t } = useTranslation();
  const stableT = useStableT();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Whether the latest verification report still describes the current sections; false while loading or when none exists (fail-closed).
  const [verifiedCurrent, setVerifiedCurrent] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<string | null>(null);

  // Decision Modal State
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  // Only the latest request may update the view; an older, slower response must not show another section's draft.
  const loadSeq = useRef(0);

  const loadDraft = useCallback(async (secKey: string) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    setSelectedCitation(null);
    setDraftView(null);
    setEditing(false);
    setVerifiedCurrent(false);
    setVerifiedStatus(null);
    try {
      const data = await getSectionDraft(projectId, snapshot.id, secKey);
      if (seq === loadSeq.current) setDraftView(data);
      const report = await getLatestVerification(projectId, snapshot.id).catch(() => null);
      if (seq === loadSeq.current) {
        setVerifiedCurrent(report?.isCurrent === true);
        setVerifiedStatus(report?.status ?? null);
      }
    } catch (err: unknown) {
      if (seq !== loadSeq.current) return;
      setDraftView(null);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : stableT("draft.loadError"));
      }
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [projectId, snapshot.id, stableT]);

  useEffect(() => {
    setNotice(null);
    void loadDraft(activeSection);
  }, [activeSection, loadDraft]);

  const handleGenerate = async () => {
    setDrafting(true);
    setError(null);
    try {
      await generateSectionDraft(projectId, snapshot.id, activeSection);
      await loadDraft(activeSection);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "SOURCE_SECTIONS_NOT_APPROVED") {
        const list = (err.details as { sections?: Array<{ sectionKey: string }> } | undefined)?.sections ?? [];
        setError(t("draft.sourcesNotApproved", { sections: list.map((s) => t(`plans.sectionName.${s.sectionKey}`, { defaultValue: s.sectionKey })).join(", ") }));
      } else {
        setError(err instanceof Error ? err.message : t("draft.draftError"));
      }
    } finally {
      setDrafting(false);
    }
  };

  const handleDecisionConfirm = async (note?: string) => {
    if (!draftView?.revision || !modalAction || loading) return;
    const decidedSection = draftView.sectionKey;
    setSubmittingDecision(true);
    try {
      if (modalAction === "approve") {
        await approveSectionRevision(
          projectId,
          snapshot.id,
          decidedSection,
          draftView.revision.version,
          note,
        );
      } else {
        await rejectSectionRevision(
          projectId,
          snapshot.id,
          decidedSection,
          draftView.revision.version,
          note || "",
        );
      }
      await loadDraft(decidedSection);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const latest = draftView?.revision;
  const approval = draftView?.approval.decision;
  const status = draftView?.approval.status ?? "PENDING";
  const paragraphFacts = latest && !Array.isArray(latest.facts) ? (latest.facts.paragraphs ?? []) : [];
  const citingParagraphs = selectedCitation
    ? paragraphFacts.filter((p) => p.usedEvidenceIds?.includes(selectedCitation))
    : [];
  // Methods comes from the fixed template (Methods page), never from the LLM drafter.
  const canDraft = activeSection !== "methods";
  const isSynthesis = SYNTHESIS_SECTIONS.includes(activeSection);
  const sectionLabel = t(`plans.sectionName.${draftView?.sectionKey ?? activeSection}`, { defaultValue: activeSection });
  // A hand edit keeps the old evidence facts, so the new version must be re-verified before H2 can approve it.
  const verificationFailed = verifiedStatus === "FAILED";
  // The BE decides what is current (it compares section content, not clocks) and also enforces this lock on approve.
  const reportCoversVersion = verifiedCurrent;
  const needsReverify = !!latest && latest.generator === "manual-edit" && !(reportCoversVersion && !verificationFailed);
  const verificationLink = `/verification?projectId=${encodeURIComponent(projectId)}&snapshotId=${encodeURIComponent(snapshot.id)}`;

  const handleSaveEdit = async (markdown: string) => {
    if (!draftView) return;
    const result = await saveSectionDraft(projectId, snapshot.id, draftView.sectionKey, {
      baseVersion: draftView.revision.version,
      markdown,
    });
    setNotice(
      result.created
        ? t("draftEdit.saved", { version: result.revision.version })
        : t("draftEdit.unchanged"),
    );
    await loadDraft(draftView.sectionKey);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{t("draft.title")}</CardTitle>
              {latest && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{latest.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {t("draft.description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDraft(activeSection)}
              disabled={loading || drafting || editing}
              className="gap-1.5"
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              {t("workflow.refresh")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerate}
              disabled={drafting || editing || !canDraft}
              title={canDraft ? undefined : t("draft.methodsOnOwnPage")}
              className="gap-1.5"
            >
              <SparklesIcon className="size-4" />
              {drafting ? t("draft.drafting") : latest ? t("draft.redraft") : t("draft.draftWithAi")}
            </Button>
          </div>
        </CardHeader>

        {/* Section Tabs */}
        <div className="px-6 pb-3 pt-0 border-b border-border/60 flex items-center gap-2 overflow-x-auto">
          {DEFAULT_SECTIONS.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              disabled={editing}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSection === sec.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {t(sec.label)}
            </button>
          ))}
        </div>

        {/* Status & Oversight Bar */}
        {latest && (
          <CardContent className="py-3 bg-muted/20 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">{t("draft.h2Decision")}:</span>
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
                  {t(`draft.approval.${status}`)}
                </Badge>
              </div>

              {approval && (
                <span className="text-muted-foreground text-[11px]">
                  {t("draft.by")} <strong className="text-foreground">{approval.decidedBy}</strong>{" "}
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
                disabled={drafting || loading || editing || status === "REJECTED"}
              >
                {t("draft.rejectH2")}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalAction("approve")}
                disabled={drafting || loading || editing || needsReverify || status === "APPROVED"}
              >
                <CheckBadgeIcon className="size-4 mr-1" />
                {t("draft.approveH2")}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>{t("workflow.dismiss")}</Button>
        </div>
      )}

      {notice && (
        <div role="status" className="bg-primary/10 border border-primary/20 text-sm p-3 rounded-lg flex items-center justify-between">
          <span>{notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>OK</Button>
        </div>
      )}

      {needsReverify && !loading && (
        <div role="status" className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold">{t("draftEdit.reverifyTitle")}</div>
            <div className="text-xs mt-0.5">
              {reportCoversVersion && verificationFailed ? t("draftEdit.reverifyFailedBody") : t("draftEdit.reverifyBody")}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={verificationLink}>{t("draftEdit.reverifyAction")}</Link>
          </Button>
        </div>
      )}

      {/* Main Drafting Workspace View */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          {t("draft.loading")}
        </div>
      ) : !latest ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <SparklesIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("draft.noDraftTitle", { section: sectionLabel })}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                {isSynthesis ? t("draft.synthesisHint") : t("draft.noDraftDescription")}
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={drafting || !canDraft} className="gap-2">
              <SparklesIcon className="size-4" />
              {drafting ? t("draft.drafting") : t("draft.draftNow", { section: sectionLabel })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Pane: Drafted Prose (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {editing && (
              <DraftEditor
                initialMarkdown={latest.markdown}
                onSave={handleSaveEdit}
                onCancel={() => setEditing(false)}
              />
            )}
            <Card className={`border border-border/80 ${editing ? "hidden" : ""}`}>
              <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/30 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("draft.prose")}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {t("draft.chars", { count: latest.markdown.length })} • {latest.generator}
                  </span>
                  {canDraft ? (
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)} disabled={drafting || loading}>
                      <PencilSquareIcon className="size-3.5" />
                      {t("draftEdit.edit")}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{t("draftEdit.methodsHint")}</span>
                  )}
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
                              title={t("draft.inspectAnchor", { marker })}
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
                  {t("draft.inspector")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {selectedCitation ? (
                  <div className="space-y-3 bg-muted/40 p-3 rounded-lg border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">[{selectedCitation}]</span>
                      <Badge variant="outline" className="text-[10px]">{t("draft.anchor")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("draft.anchorExplain")}
                    </p>
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1 font-mono">
                      <div>
                        {t("draft.evidencePack")}:{" "}
                        {citingParagraphs.length > 0 ? (
                          <span className="text-emerald-600 font-medium">{t("draft.citedIn", { count: citingParagraphs.length })}</span>
                        ) : (
                          <span className="text-destructive font-medium">{t("draft.notInEvidence")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="mb-2">{t("draft.clickMarkerHint")}</p>
                  </div>
                )}

                {/* Facts Summary */}
                {paragraphFacts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <span className="font-medium text-muted-foreground block text-xs">
                      {t("draft.paragraphFacts")} ({paragraphFacts.length})
                    </span>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {paragraphFacts.map((p, pIdx) => (
                        <div key={pIdx} className="p-2 bg-muted/30 rounded border border-border/40 text-[11px] space-y-1">
                          <div className="font-mono font-semibold text-foreground truncate">
                            {p.paragraphId || t("draft.paragraphN", { n: pIdx + 1 })}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2">
                            <span>{t("draft.evShort")}: {p.usedEvidenceIds?.length || 0}</span>
                            <span>{t("draft.findingsShort")}: {p.usedFindingIds?.length || 0}</span>
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
          sectionKey={draftView?.sectionKey ?? activeSection}
          version={latest.version}
          contentHash={latest.contentHash}
          onConfirm={handleDecisionConfirm}
          submitting={submittingDecision}
        />
      )}
    </div>
  );
}
