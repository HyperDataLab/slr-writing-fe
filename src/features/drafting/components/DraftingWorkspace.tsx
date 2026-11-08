import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { Link } from "react-router";
import {
  ArrowPathIcon,
  CircleStackIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  DocumentTextIcon,
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
import { ParagraphPlansWorkspace } from "@/features/paragraph-plans/components/ParagraphPlansWorkspace";
import { getLatestVerification } from "@/features/verification/api/verification.api";
import { H2DecisionDialog } from "@/features/drafting/components/H2DecisionDialog";
import type { SectionDraftView } from "@/features/drafting/model/drafting.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

const DEFAULT_SECTIONS = [
  { key: "abstract", label: "draft.tab.abstract" },
  { key: "introduction", label: "draft.tab.introduction" },
  { key: "methods", label: "draft.tab.methods" },
  { key: "results", label: "draft.tab.results" },
  { key: "discussion", label: "draft.tab.discussion" },
  { key: "conclusion", label: "draft.tab.conclusion" },
];

function scrollToWritingTarget(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  target.scrollIntoView({ behavior, block: "start" });
}

export function DraftingWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const [activeSection, setActiveSection] = useState<string>("introduction");
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
  const [inspectorTab, setInspectorTab] = useState<"evidence" | "checks">("evidence");
  const [planReadiness, setPlanReadiness] = useState<{ sectionKey: string; readyCount: number } | null>(null);
  const reportPlanReadiness = useCallback((sectionKey: string, readyCount: number) => {
    setPlanReadiness({ sectionKey, readyCount });
  }, []);

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

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (targetId !== "paragraph-plans" && targetId !== "draft-content") return;
    const frame = window.requestAnimationFrame(() => scrollToWritingTarget(targetId));
    return () => window.cancelAnimationFrame(frame);
  }, [projectId, snapshot.id]);

  const handleGenerate = async () => {
    setDrafting(true);
    setError(null);
    try {
      await generateSectionDraft(projectId, snapshot.id, activeSection);
      await loadDraft(activeSection);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("draft.draftError"));
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
  const hasReadyPlan = planReadiness?.sectionKey === activeSection && planReadiness.readyCount > 0;
  const approval = draftView?.approval.decision;
  const status = draftView?.approval.status ?? "PENDING";
  const paragraphFacts = latest && !Array.isArray(latest.facts) ? (latest.facts.paragraphs ?? []) : [];
  const citingParagraphs = selectedCitation
    ? paragraphFacts.filter((p) => p.usedEvidenceIds?.includes(selectedCitation))
    : [];
  // Methods comes from the fixed template (Methods page), never from the LLM drafter.
  const canDraft = activeSection !== "methods";
  const sectionLabel = t(`plans.sectionName.${draftView?.sectionKey ?? activeSection}`, { defaultValue: activeSection });
  // A hand edit keeps the old evidence facts, so the new version must be re-verified before H2 can approve it.
  const verificationFailed = verifiedStatus === "FAILED";
  // The BE decides what is current (it compares section content, not clocks) and also enforces this lock on approve.
  const reportCoversVersion = verifiedCurrent;
  const needsReverify = !!latest && latest.generator === "manual-edit" && !(reportCoversVersion && !verificationFailed);
  const verificationLink = `/verification?projectId=${encodeURIComponent(projectId)}&snapshotId=${encodeURIComponent(snapshot.id)}`;

  const handleStartDraftFromPlan = async () => {
    if (!latest) await handleGenerate();
    window.requestAnimationFrame(() => scrollToWritingTarget("draft-content"));
  };

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
    <div className="draft-workspace-shell">
      {latest && (
        <div className="draft-review-toolbar" aria-label={t("draft.h2Decision")}>
          <div className="draft-review-state">
            <span className="draft-review-label">{t("draft.h2Decision")}</span>
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
            {approval && (
              <span className="draft-review-byline">
                {t("draft.by")} <strong>{approval.decidedBy}</strong>
                {approval.slrRole && ` (${approval.slrRole})`} · seq {approval.seq}
              </span>
            )}
            {approval?.note && <span className="draft-review-note" title={approval.note}>“{approval.note}”</span>}
          </div>
          <div className="draft-review-actions">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-destructive hover:bg-destructive/5 border-destructive/25"
              onClick={() => setModalAction("reject")}
              disabled={drafting || loading || editing || status === "REJECTED"}
            >
              {t("draft.rejectH2")}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs h-8 bg-primary hover:bg-primary-hover text-white"
              onClick={() => setModalAction("approve")}
              disabled={drafting || loading || editing || needsReverify || status === "APPROVED"}
            >
              <CheckBadgeIcon className="size-4 mr-1" />
              {t("draft.approveH2")}
            </Button>
          </div>
        </div>
      )}

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
        <div role="status" className="bg-warning-soft border border-warning-border text-warning text-sm p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

      {/* Three-pane manuscript workspace */}
      <div className="draft-studio-grid">
        <aside className="draft-section-rail" aria-label={t("draft.manuscriptOutline")}>
          <div className="draft-rail-heading">{t("draft.manuscriptOutline")}</div>
          <div className="draft-section-list">
            {DEFAULT_SECTIONS.map((section, index) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                disabled={editing}
                aria-pressed={activeSection === section.key}
                className={activeSection === section.key ? "draft-section-link is-active" : "draft-section-link"}
              >
                <span className="draft-section-index">{String(index + 1).padStart(2, "0")}</span>
                <span>{t(section.label)}</span>
              </button>
            ))}
          </div>
          <div className="draft-rail-snapshot">
            <span>{t("workflow.snapshot")}</span>
            <strong title={snapshot.id}>{snapshot.id.slice(0, 10)}</strong>
          </div>
        </aside>

        <section className="draft-paper-column" aria-label={sectionLabel}>
          <div id="paragraph-plans" className="draft-plan-panel-wrap">
            <ParagraphPlansWorkspace
              projectId={projectId}
              snapshot={snapshot}
              sectionKey={activeSection}
              canDraft={canDraft}
              hasDraft={Boolean(latest)}
              draftLoading={loading}
              drafting={drafting}
              onReadinessChange={reportPlanReadiness}
              onStartDraft={handleStartDraftFromPlan}
            />
          </div>

          <div id="draft-content" className="draft-center-toolbar draft-content-anchor">
            <div className="draft-center-actions">
              <div className="draft-toolbar-context">
                <span className="draft-toolbar-label">{t("draft.prose")}</span>
                {latest && <span className="draft-toolbar-project">{latest.generator}</span>}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadDraft(activeSection)}
                disabled={loading || drafting || editing}
                className="gap-1.5"
              >
                <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                {t("workflow.refresh")}
              </Button>
              {latest && canDraft && !editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled={drafting || loading}
                  className="gap-1.5"
                >
                  <PencilSquareIcon aria-hidden="true" />
                  {t("draftEdit.edit")}
                </Button>
              )}
              {latest && canDraft && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={drafting || editing || loading || !hasReadyPlan}
                  title={hasReadyPlan ? undefined : t("plans.noReadyPlans")}
                  className="gap-1.5"
                >
                  <SparklesIcon className="size-4" aria-hidden="true" />
                  {drafting ? t("draft.drafting") : t("draft.redraft")}
                </Button>
              )}
            </div>
          </div>

          <div className="draft-paper-heading">
            <div>
              <p className="draft-paper-kicker">{t("draft.pageTitle")}</p>
              <h2>{sectionLabel}</h2>
              <p>{t("draft.description")}</p>
            </div>
            {latest && (
              <div className="draft-paper-version">
                <Badge variant="outline">v{latest.version}</Badge>
                <span>{t("draft.chars", { count: latest.markdown.length })}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="draft-paper-state" role="status">{t("draft.loading")}</div>
          ) : !latest ? (
            <Card className="draft-empty-card">
              <CardContent className="space-y-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <SparklesIcon className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t("draft.noDraftTitle", { section: sectionLabel })}</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("draft.noDraftDescription")}</p>
                </div>
                <p className="mx-auto max-w-md text-xs leading-5 text-muted-foreground">{t("draft.preparePlanFirst")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {editing && (
                <DraftEditor
                  initialMarkdown={latest.markdown}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditing(false)}
                />
              )}
              <Card className={editing ? "draft-manuscript-card hidden" : "draft-manuscript-card"}>
                <CardContent className="draft-manuscript">
                  {latest.markdown.split(/\n\n+/).map((para, idx) => {
                    const isHeading = para.startsWith("#");
                    if (isHeading) {
                      const level = para.match(/^#+/)?.[0].length || 1;
                      const text = para.replace(/^#+\s*/, "");
                      if (level === 1) return <h2 key={idx}>{text}</h2>;
                      if (level === 2) return <h3 key={idx}>{text}</h3>;
                      return <h4 key={idx}>{text}</h4>;
                    }
                    const parts = para.split(/(\[[a-zA-Z0-9_\-:]+\])/g);
                    return (
                      <p key={idx}>
                        {parts.map((part, pIdx) => {
                          const isCitation = part.startsWith("[") && part.endsWith("]");
                          if (!isCitation) return <span key={pIdx}>{part}</span>;
                          const marker = part.slice(1, -1);
                          const isSelected = selectedCitation === marker;
                          return (
                            <button
                              key={pIdx}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => { setSelectedCitation(marker); setInspectorTab("evidence"); }}
                              className={isSelected ? "draft-citation is-selected" : "draft-citation"}
                              title={t("draft.inspectAnchor", { marker })}
                            >
                              {part}
                            </button>
                          );
                        })}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </section>

        <aside className="draft-inspector-pane" aria-label={t("draft.inspector")}>
          {latest ? (
            <Card className="draft-inspector-card">
              <div className="draft-inspector-tabs" role="tablist" aria-label={t("draft.inspector")}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "evidence"}
                  className={inspectorTab === "evidence" ? "draft-inspector-tab is-active" : "draft-inspector-tab"}
                  onClick={() => setInspectorTab("evidence")}
                >
                  <CircleStackIcon aria-hidden="true" />
                  {t("draft.inspectorEvidenceTab")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "checks"}
                  className={inspectorTab === "checks" ? "draft-inspector-tab is-active" : "draft-inspector-tab"}
                  onClick={() => setInspectorTab("checks")}
                >
                  <SparklesIcon aria-hidden="true" />
                  {t("draft.inspectorChecksTab")}
                </button>
              </div>
              <CardContent className="draft-inspector-content">
                {inspectorTab === "evidence" ? (
                  <>
                    {selectedCitation ? (
                      <div className="draft-citation-detail">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary">[{selectedCitation}]</span>
                          <Badge variant="outline" className="text-[10px]">{t("draft.anchor")}</Badge>
                        </div>
                        <p>{t("draft.anchorExplain")}</p>
                        <div className="draft-citation-usage">
                          <span>{t("draft.evidencePack")}</span>
                          {citingParagraphs.length > 0 ? (
                            <strong>{t("draft.citedIn", { count: citingParagraphs.length })}</strong>
                          ) : (
                            <strong className="text-destructive">{t("draft.notInEvidence")}</strong>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="draft-inspector-hint">{t("draft.clickMarkerHint")}</p>
                    )}

                    {paragraphFacts.length > 0 ? (
                      <div className="draft-facts">
                        <h3>{t("draft.paragraphFacts")} <span>({paragraphFacts.length})</span></h3>
                        <div>
                          {paragraphFacts.map((fact, index) => (
                            <div className="draft-fact-row" key={fact.paragraphId || index}>
                              <strong>{fact.paragraphId || t("draft.paragraphN", { n: index + 1 })}</strong>
                              <span>{t("draft.evShort")}: {fact.usedEvidenceIds?.length || 0}</span>
                              <span>{t("draft.findingsShort")}: {fact.usedFindingIds?.length || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="draft-inspector-hint">{t("draft.noParagraphEvidence")}</p>
                    )}
                  </>
                ) : (
                  <div className="draft-writing-checks">
                    <div className="draft-check-row">
                      <div>
                        <strong>{t("draft.verificationStatus")}</strong>
                        <p>{t("draft.verificationDescription")}</p>
                      </div>
                      <Badge variant={verificationFailed ? "destructive" : verifiedCurrent ? "success" : "secondary"}>
                        {verificationFailed ? t("draft.verificationFailed") : verifiedCurrent ? t("draft.verified") : t("draft.needsVerification")}
                      </Badge>
                    </div>
                    <div className="draft-check-row">
                      <div>
                        <strong>{t("draft.h2Decision")}</strong>
                        <p>{approval ? t("draft.approvedBy", { name: approval.decidedBy }) : t("draft.awaitingH2")}</p>
                      </div>
                      <Badge variant={status === "APPROVED" ? "success" : status === "REJECTED" ? "destructive" : "secondary"}>
                        {t(`draft.approval.${status}`)}
                      </Badge>
                    </div>
                    {needsReverify && (
                      <div className="draft-check-action">
                        <p>{reportCoversVersion && verificationFailed ? t("draftEdit.reverifyFailedBody") : t("draftEdit.reverifyBody")}</p>
                        <Button asChild variant="outline" size="sm">
                          <Link to={verificationLink}>{t("draftEdit.reverifyAction")}</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="draft-inspector-placeholder">
              <DocumentTextIcon className="size-6" aria-hidden="true" />
              <p>{t("draft.inspector")}</p>
            </div>
          )}
        </aside>
      </div>
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
