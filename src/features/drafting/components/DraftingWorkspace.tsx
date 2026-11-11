import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { Link } from "react-router";
import {
  ArrowRightIcon,
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
import { queryLineage } from "@/features/export/api/export.api";
import type { LineageEvidenceAnchor } from "@/features/export/model/export.types";
import { ApiError } from "@/shared/lib/api-client";
import { DraftEditor } from "@/features/drafting/components/DraftEditor";
import { ParagraphPlansWorkspace } from "@/features/paragraph-plans/components/ParagraphPlansWorkspace";
import { getLatestVerification } from "@/features/verification/api/verification.api";
import { H2DecisionDialog } from "@/features/drafting/components/H2DecisionDialog";
import type { ApprovalStatus, SectionDraftView } from "@/features/drafting/model/drafting.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { GsapStagger } from "@/shared/ui/gsap-motion";

/** Written last, from the sections a person has approved (H2), not from paragraph plans. */
const SYNTHESIS_SECTIONS = ["abstract", "conclusion"];

type CitationLookupStatus = "idle" | "loading" | "verified" | "not-recorded" | "source-missing" | "error";

const DEFAULT_SECTIONS = [
  { key: "abstract", label: "draft.tab.abstract" },
  { key: "introduction", label: "draft.tab.introduction" },
  { key: "methods", label: "draft.tab.methods" },
  { key: "results", label: "draft.tab.results" },
  { key: "discussion", label: "draft.tab.discussion" },
  { key: "conclusion", label: "draft.tab.conclusion" },
];

type SectionH2Status = ApprovalStatus | "NOT_STARTED";

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
  const [studioTab, setStudioTab] = useState<"plan" | "draft">("plan");
  const [draftView, setDraftView] = useState<SectionDraftView | null>(null);
  const [sectionH2Statuses, setSectionH2Statuses] = useState<Record<string, SectionH2Status>>({});
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprintApprovalRequired, setBlueprintApprovalRequired] = useState(false);
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
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [citationLookup, setCitationLookup] = useState<{ status: CitationLookupStatus; evidence: LineageEvidenceAnchor[] }>({ status: "idle", evidence: [] });
  const [inspectorTab, setInspectorTab] = useState<"evidence" | "checks">("evidence");
  const [planReadiness, setPlanReadiness] = useState<{ sectionKey: string; readyCount: number } | null>(null);
  const planTabRef = useRef<HTMLButtonElement>(null);
  const draftTabRef = useRef<HTMLButtonElement>(null);
  const reportPlanReadiness = useCallback((sectionKey: string, readyCount: number) => {
    setPlanReadiness({ sectionKey, readyCount });
  }, []);

  // Only the latest request may update the view; an older, slower response must not show another section's draft.
  const loadSeq = useRef(0);
  const sectionStatusesSeq = useRef(0);
  const citationLookupSeq = useRef(0);

  const loadSectionH2Statuses = useCallback(async () => {
    const seq = ++sectionStatusesSeq.current;
    const results = await Promise.allSettled(
      DEFAULT_SECTIONS.map(async ({ key }) => ({ key, draft: await getSectionDraft(projectId, snapshot.id, key) })),
    );
    if (seq !== sectionStatusesSeq.current) return;

    const nextStatuses: Record<string, SectionH2Status> = {};
    results.forEach((result, index) => {
      const sectionKey = DEFAULT_SECTIONS[index].key;
      if (result.status === "fulfilled") {
        nextStatuses[sectionKey] = result.value.draft.approval.status;
      } else if (result.reason instanceof ApiError && result.reason.status === 404) {
        nextStatuses[sectionKey] = "NOT_STARTED";
      }
    });
    setSectionH2Statuses((current) => ({ ...nextStatuses, ...current }));
  }, [projectId, snapshot.id]);

  const loadDraft = useCallback(async (secKey: string) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    setBlueprintApprovalRequired(false);
    setSelectedCitation(null);
    setCitationDialogOpen(false);
    citationLookupSeq.current += 1;
    setCitationLookup({ status: "idle", evidence: [] });
    setDraftView(null);
    setEditing(false);
    setVerifiedCurrent(false);
    setVerifiedStatus(null);
    try {
      const data = await getSectionDraft(projectId, snapshot.id, secKey);
      if (seq === loadSeq.current) {
        setDraftView(data);
        setSectionH2Statuses((current) => ({ ...current, [secKey]: data.approval.status }));
      }
      const report = await getLatestVerification(projectId, snapshot.id).catch(() => null);
      if (seq === loadSeq.current) {
        setVerifiedCurrent(report?.isCurrent === true);
        setVerifiedStatus(report?.status ?? null);
      }
    } catch (err: unknown) {
      if (seq !== loadSeq.current) return;
      setDraftView(null);
      if (err instanceof ApiError && err.code === "BLUEPRINT_NOT_APPROVED") {
        setBlueprintApprovalRequired(true);
      } else if (err instanceof ApiError && err.status === 404) {
        setSectionH2Statuses((current) => ({ ...current, [secKey]: "NOT_STARTED" }));
      } else {
        setError(err instanceof Error ? err.message : stableT("draft.loadError"));
      }
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [projectId, snapshot.id, stableT]);

  useEffect(() => {
    setNotice(null);
    setStudioTab(SYNTHESIS_SECTIONS.includes(activeSection) ? "draft" : "plan");
    void loadDraft(activeSection);
  }, [activeSection, loadDraft]);

  useEffect(() => {
    setSectionH2Statuses({});
    void loadSectionH2Statuses();
    return () => {
      sectionStatusesSeq.current += 1;
    };
  }, [loadSectionH2Statuses]);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (targetId !== "paragraph-plans" && targetId !== "draft-content") return;
    setStudioTab(targetId === "draft-content" ? "draft" : "plan");
    const frame = window.requestAnimationFrame(() => scrollToWritingTarget(targetId));
    return () => window.cancelAnimationFrame(frame);
  }, [projectId, snapshot.id]);

  const activateStudioTab = (tab: "plan" | "draft") => {
    setStudioTab(tab);
    window.requestAnimationFrame(() => {
      (tab === "plan" ? planTabRef.current : draftTabRef.current)?.focus();
    });
  };

  const handleStudioTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (SYNTHESIS_SECTIONS.includes(activeSection)) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextTab = event.key === "Home" || event.key === "ArrowLeft" ? "plan" : "draft";
      activateStudioTab(nextTab);
    }
  };

  const handleGenerate = async (): Promise<boolean> => {
    setDrafting(true);
    setError(null);
    try {
      await generateSectionDraft(projectId, snapshot.id, activeSection);
      await loadDraft(activeSection);
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "SOURCE_SECTIONS_NOT_APPROVED") {
        const list = (err.details as { sections?: Array<{ sectionKey: string }> } | undefined)?.sections ?? [];
        setError(t("draft.sourcesNotApproved", { sections: list.map((s) => t(`plans.sectionName.${s.sectionKey}`, { defaultValue: s.sectionKey })).join(", ") }));
      } else {
        setError(err instanceof Error ? err.message : t("draft.draftError"));
      }
      return false;
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
  const approvedSectionCount = Object.values(sectionH2Statuses).filter((sectionStatus) => sectionStatus === "APPROVED").length;
  const allSectionStatusesLoaded = DEFAULT_SECTIONS.every((section) => section.key in sectionH2Statuses);
  const hasReadyPlan = planReadiness?.sectionKey === activeSection && planReadiness.readyCount > 0;
  const approval = draftView?.approval.decision;
  const status = draftView?.approval.status ?? "PENDING";
  const paragraphFacts = latest && !Array.isArray(latest.facts) ? (latest.facts.paragraphs ?? []) : [];
  const citingParagraphs = selectedCitation
    ? paragraphFacts.filter((p) => p.usedEvidenceIds?.includes(selectedCitation))
    : [];
  const openCitationEvidence = async (marker: string) => {
    const seq = ++citationLookupSeq.current;
    setSelectedCitation(marker);
    setInspectorTab("evidence");
    setCitationDialogOpen(true);
    setCitationLookup({ status: "loading", evidence: [] });

    try {
      const response = await queryLineage(projectId, snapshot.id, { sectionKey: activeSection, evidenceId: marker });
      if (seq !== citationLookupSeq.current) return;
      const evidence = [...new Map(
        response.lineage.flatMap((item) => item.evidence)
          .filter((item) => item.externalId === marker || item.id === marker)
          .map((item) => [item.id, item]),
      ).values()];
      const usedInDraft = paragraphFacts.some((fact) => fact.usedEvidenceIds?.includes(marker));
      setCitationLookup({
        status: usedInDraft ? (evidence.length > 0 ? "verified" : "source-missing") : "not-recorded",
        evidence,
      });
    } catch {
      if (seq === citationLookupSeq.current) setCitationLookup({ status: "error", evidence: [] });
    }
  };
  const handleCitationDialogOpenChange = (open: boolean) => {
    setCitationDialogOpen(open);
    if (!open) citationLookupSeq.current += 1;
  };
  // Methods comes from the fixed template (Methods page), never from the LLM drafter.
  const canDraft = activeSection !== "methods";
  const isSynthesis = SYNTHESIS_SECTIONS.includes(activeSection);
  const sectionLabel = t(`plans.sectionName.${draftView?.sectionKey ?? activeSection}`, { defaultValue: activeSection });
  // A hand edit keeps the old evidence facts, so the new version must be re-verified before H2 can approve it.
  const verificationFailed = verifiedStatus === "FAILED";
  const verificationStale = Boolean(verifiedStatus && !verifiedCurrent);
  // The BE decides what is current (it compares section content, not clocks) and also enforces this lock on approve.
  const reportCoversVersion = verifiedCurrent;
  const needsReverify = !!latest && latest.generator === "manual-edit" && !(reportCoversVersion && !verificationFailed);
  const verificationLink = `/verification?projectId=${encodeURIComponent(projectId)}&snapshotId=${encodeURIComponent(snapshot.id)}`;
  const outlineHref = `/outline?${new URLSearchParams({ projectId, snapshotId: snapshot.id }).toString()}`;

  const handleStartDraftFromPlan = async () => {
    if (!latest && !(await handleGenerate())) return;
    setStudioTab("draft");
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
      <GsapStagger className="draft-studio-grid">
        <aside className="draft-section-rail" aria-label={t("draft.manuscriptOutline")}>
          <div className="flex items-center justify-between gap-2">
            <div className="draft-rail-heading">{t("draft.manuscriptOutline")}</div>
            {allSectionStatusesLoaded && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {t("draft.h2Progress", { approved: approvedSectionCount, total: DEFAULT_SECTIONS.length })}
              </Badge>
            )}
          </div>
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
                <span className="min-w-0 flex-1 truncate">{t(section.label)}</span>
                {section.key in sectionH2Statuses && (
                  <Badge
                    variant={
                      sectionH2Statuses[section.key] === "APPROVED"
                        ? "success"
                        : sectionH2Statuses[section.key] === "REJECTED"
                        ? "destructive"
                        : sectionH2Statuses[section.key] === "PENDING"
                        ? "warning"
                        : "secondary"
                    }
                    className="shrink-0 px-1.5 py-0 text-[9px] leading-4"
                  >
                    {t(`draft.sectionH2Status.${sectionH2Statuses[section.key]}`)}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <div className="draft-rail-snapshot">
            <span>{t("workflow.snapshot")}</span>
            <strong title={snapshot.id}>{snapshot.id.slice(0, 10)}</strong>
          </div>
        </aside>

        <section className="draft-paper-column" aria-label={sectionLabel}>
          {!isSynthesis && (
            <>
              <div className="draft-studio-tabs" role="tablist" aria-label={t("draft.studioTitle")}>
                <button
                  ref={planTabRef}
                  id="paragraph-plan-tab"
                  type="button"
                  role="tab"
                  aria-controls="paragraph-plan-panel"
                  aria-selected={studioTab === "plan"}
                  tabIndex={studioTab === "plan" ? 0 : -1}
                  className={studioTab === "plan" ? "draft-studio-tab is-active" : "draft-studio-tab"}
                  onClick={() => setStudioTab("plan")}
                  onKeyDown={handleStudioTabKeyDown}
                >
                  {t("plans.sectionHeading")}
                </button>
                <button
                  ref={draftTabRef}
                  id="draft-content-tab"
                  type="button"
                  role="tab"
                  aria-controls="draft-content"
                  aria-selected={studioTab === "draft"}
                  tabIndex={studioTab === "draft" ? 0 : -1}
                  className={studioTab === "draft" ? "draft-studio-tab is-active" : "draft-studio-tab"}
                  onClick={() => setStudioTab("draft")}
                  onKeyDown={handleStudioTabKeyDown}
                >
                  {t("draft.prose")}
                  {latest && <Badge variant="secondary">v{latest.version}</Badge>}
                </button>
              </div>
              <div
                id="paragraph-plan-panel"
                role="tabpanel"
                aria-labelledby="paragraph-plan-tab"
                tabIndex={0}
                hidden={studioTab !== "plan"}
                className="draft-studio-tabpanel"
              >
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
              </div>
            </>
          )}

          <div
            id="draft-content"
            role={isSynthesis ? "region" : "tabpanel"}
            aria-labelledby={isSynthesis ? "draft-section-heading" : "draft-content-tab"}
            tabIndex={0}
            hidden={!isSynthesis && studioTab !== "draft"}
            className="draft-studio-tabpanel draft-content-anchor"
          >
          <div className="draft-center-toolbar">
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
                  disabled={drafting || editing || loading || (!isSynthesis && !hasReadyPlan)}
                  title={isSynthesis || hasReadyPlan ? undefined : t("plans.noReadyPlans")}
                  className="gap-1.5"
                >
                  <SparklesIcon className="size-4" aria-hidden="true" />
                  {drafting
                    ? t("draft.drafting")
                    : isSynthesis
                    ? t("draft.synthesisRegenerate")
                    : t("draft.redraft")}
                </Button>
              )}
            </div>
          </div>

          <div className="draft-paper-heading">
            <div>
              <p className="draft-paper-kicker">{t("draft.pageTitle")}</p>
              <h2 id="draft-section-heading">{sectionLabel}</h2>
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
          ) : blueprintApprovalRequired ? (
            <Card className="draft-empty-card" role="status">
              <CardContent className="space-y-4">
                <div className="size-12 rounded-xl bg-warning-soft text-warning mx-auto flex items-center justify-center">
                  <ExclamationTriangleIcon className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t("draft.h1RequiredTitle")}</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("draft.h1RequiredDescription")}</p>
                </div>
                <Button asChild size="sm" className="gap-1.5">
                  <Link to={outlineHref}>{t("draft.openOutlineForH1")}<ArrowRightIcon aria-hidden="true" /></Link>
                </Button>
              </CardContent>
            </Card>
          ) : !latest ? (
            <Card className="draft-empty-card">
              <CardContent className="space-y-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <SparklesIcon className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t("draft.noDraftTitle", { section: sectionLabel })}</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{isSynthesis ? t("draft.synthesisHint") : t("draft.noDraftDescription")}</p>
                  {isSynthesis && (
                    <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                      {t("draft.synthesisGuardrail")}
                    </p>
                  )}
                </div>
                {isSynthesis ? (
                  <Button type="button" onClick={handleGenerate} disabled={drafting} className="gap-1.5">
                    <SparklesIcon className="size-4" aria-hidden="true" />
                    {drafting
                      ? t("draft.drafting")
                      : t("draft.synthesisGenerate")}
                  </Button>
                ) : (
                  <p className="mx-auto max-w-md text-xs leading-5 text-muted-foreground">{t("draft.preparePlanFirst")}</p>
                )}
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
                              onClick={() => void openCitationEvidence(marker)}
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
          </div>
        </section>

        <aside className={latest ? "draft-inspector-pane" : "draft-inspector-pane is-empty"} aria-label={t("draft.inspector")}>
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
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={verificationFailed ? "destructive" : verifiedCurrent ? "success" : "secondary"}>
                          {verificationFailed ? t("draft.verificationFailed") : verifiedCurrent ? t("draft.verified") : t("draft.needsVerification")}
                        </Badge>
                        {verificationStale && <Badge variant="warning">{t("verify.stale")}</Badge>}
                      </div>
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
      </GsapStagger>
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
      <Dialog open={citationDialogOpen} onOpenChange={handleCitationDialogOpenChange}>
        <DialogContent className="max-h-[min(82vh,760px)] max-w-2xl overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle>{t("draft.citationDialogTitle", { marker: selectedCitation ?? "" })}</DialogTitle>
            <DialogDescription>{t("draft.citationDialogDescription")}</DialogDescription>
          </DialogHeader>

          {citationLookup.status === "loading" ? (
            <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
              {t("draft.citationLookupLoading")}
            </p>
          ) : citationLookup.status === "error" ? (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {t("draft.citationLookupError")}
            </p>
          ) : (
            <div className="grid gap-3">
              {citationLookup.status === "verified" ? (
                <p className="rounded-lg bg-success/10 p-3 text-sm text-foreground" role="status">
                  <Badge variant="success" className="mr-2">{t("draft.citationRegistryMatch")}</Badge>
                  {t("draft.citationVerified")}
                </p>
              ) : citationLookup.status === "not-recorded" ? (
                <p className="rounded-lg bg-warning-soft p-3 text-sm text-foreground" role="status">
                  {t("draft.citationNotRecorded")}
                </p>
              ) : citationLookup.status === "source-missing" ? (
                <p className="rounded-lg bg-warning-soft p-3 text-sm text-foreground" role="status">
                  {t("draft.citationSourceMissing")}
                </p>
              ) : null}

              {citationLookup.evidence.map((evidence) => {
                const location = [
                  evidence.page ? t("draft.citationPage", { page: evidence.page }) : null,
                  evidence.section ? t("draft.citationSection", { section: evidence.section }) : null,
                  evidence.paragraph ? t("draft.citationParagraph", { paragraph: evidence.paragraph }) : null,
                ].filter(Boolean).join(" · ");
                const studyAuthors = evidence.studyAuthors.join(", ");

                return (
                  <article key={evidence.id} className="grid gap-2 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{evidence.studyTitle}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[studyAuthors, evidence.studyYear].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Badge variant={evidence.quoteHashVerified ? "success" : "warning"}>
                        {evidence.quoteHashVerified ? t("draft.citationQuoteHashVerified") : t("draft.citationQuoteHashUnverified")}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">{t("draft.citationQuote")}</h4>
                      <blockquote className="mt-1 border-l-2 border-primary/40 pl-3 text-sm leading-6 text-foreground">
                        “{evidence.quote}”
                      </blockquote>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("draft.citationLocation")}: </span>
                      {location || t("draft.citationLocationMissing")}
                      <p className="mt-1">{t("draft.citationLineUnavailable")}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
