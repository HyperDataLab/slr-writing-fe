import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import {
  ArrowRightIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useActiveWorkspaceSelection } from "@/features/projects/hooks/use-active-workspace-selection";
import { getSnapshot } from "@/features/snapshots/api/snapshots.api";
import type { SnapshotDetail } from "@/features/snapshots/model/snapshot.types";
import { getBlueprint } from "@/features/outline/api/outline.api";
import type { BlueprintView } from "@/features/outline/model/outline.types";
import { getParagraphPlans } from "@/features/paragraph-plans/api/paragraph-plans.api";
import type { ParagraphPlanView } from "@/features/paragraph-plans/model/paragraph-plan.types";
import { getSectionDraft } from "@/features/drafting/api/drafting.api";
import { getLatestVerification } from "@/features/verification/api/verification.api";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type WorkflowStage = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  state: "complete" | "current" | "upcoming" | "attention";
  key: string;
};

function workspacePath(path: string, projectId: string, snapshotId: string) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (snapshotId) params.set("snapshotId", snapshotId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function OverviewPage() {
  const metricsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t, i18n } = useTranslation();
  const {
    selectedProjectId,
    selectedSnapshotId,
    projects,
    projectsLoading,
    projectsError,
    snapshotsLoading,
    activeSnapshot,
  } = useActiveWorkspaceSelection();
  const [snapshotDetail, setSnapshotDetail] = useState<SnapshotDetail | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintView | null>(null);
  const [paragraphPlan, setParagraphPlan] = useState<ParagraphPlanView | null>(null);
  const [sectionProgress, setSectionProgress] = useState<{ started: number; total: number } | null>(null);
  const [citationCoverage, setCitationCoverage] = useState<number | null>(null);
  const [snapshotDetailLoading, setSnapshotDetailLoading] = useState(false);
  const [snapshotDetailError, setSnapshotDetailError] = useState<string | null>(null);

  const activeProject = projects.find((project) => project.id === selectedProjectId);

  useEffect(() => {
    const root = metricsRef.current;
    if (!root || prefersReducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-overview-metric]",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, stagger: 0.07, ease: "power2.out" },
      );
    }, root);

    return () => context.revert();
  }, [prefersReducedMotion]);

  useEffect(() => {
    let cancelled = false;
    setSnapshotDetail(null);
    setBlueprint(null);
    setParagraphPlan(null);
    setSectionProgress(null);
    setCitationCoverage(null);
    setSnapshotDetailError(null);

    if (!selectedProjectId || !selectedSnapshotId || !activeSnapshot) {
      setSnapshotDetailLoading(false);
      return () => { cancelled = true; };
    }

    setSnapshotDetailLoading(true);
    void (async () => {
      try {
        const detail = await getSnapshot(selectedProjectId, selectedSnapshotId);
        if (cancelled) return;
        setSnapshotDetail(detail);

        // These are read-only APIs. Missing H1 or paragraph-plan records are normal
        // early workflow states, so keep the overview useful without surfacing 404s.
        if (detail.status === "READY") {
          try {
            const currentBlueprint = await getBlueprint(selectedProjectId, selectedSnapshotId);
            if (cancelled) return;
            setBlueprint(currentBlueprint);

            if (currentBlueprint.approval.status === "APPROVED") {
              const sectionKeys = currentBlueprint.revision.content.sections
                .filter((section) => section.include)
                .map((section) => section.key);
              const [currentPlan, verification, sectionDrafts] = await Promise.all([
                getParagraphPlans(selectedProjectId, selectedSnapshotId).catch(() => null),
                getLatestVerification(selectedProjectId, selectedSnapshotId).catch(() => null),
                Promise.all(sectionKeys.map(async (sectionKey) => {
                  try {
                    const draft = await getSectionDraft(selectedProjectId, selectedSnapshotId, sectionKey);
                    return draft.revision.markdown.trim().length > 0;
                  } catch (error) {
                    return error instanceof ApiError && error.status === 404 ? false : null;
                  }
                })),
              ]);
              if (cancelled) return;
              setParagraphPlan(currentPlan);
              setSectionProgress(
                sectionKeys.length > 0 && sectionDrafts.every((started) => started !== null)
                ? { started: sectionDrafts.filter((started) => started === true).length, total: sectionKeys.length }
                  : null,
              );
              setCitationCoverage(
                verification?.isCurrent && verification.manifest.totalCitations > 0
                  ? Math.round((verification.manifest.resolvedCitations / verification.manifest.totalCitations) * 100)
                  : null,
              );
            }
          } catch {
            if (!cancelled) setBlueprint(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshotDetailError(error instanceof Error ? error.message : t("overview.snapshotLoadError"));
        }
      } finally {
        if (!cancelled) setSnapshotDetailLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeSnapshot, selectedProjectId, selectedSnapshotId, t]);

  const isSnapshotReady = activeSnapshot?.status === "READY";
  const hasApprovedBlueprint = blueprint?.approval.status === "APPROVED";
  const isParagraphPlanReady = Boolean(paragraphPlan?.readyToDraft);
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage ?? "vi");
  const metrics = [
    { key: "studies", label: t("overview.metrics.studies"), icon: BookOpenIcon, tone: "mint", value: snapshotDetail?._count.studies == null ? null : numberFormat.format(snapshotDetail._count.studies) },
    { key: "evidence", label: t("overview.metrics.evidence"), icon: CircleStackIcon, tone: "lavender", value: snapshotDetail?._count.evidence == null ? null : numberFormat.format(snapshotDetail._count.evidence) },
    { key: "sections", label: t("overview.metrics.sections"), icon: DocumentTextIcon, tone: "amber", value: sectionProgress ? `${sectionProgress.started}/${sectionProgress.total}` : null },
    { key: "citationCoverage", label: t("overview.metrics.citationCoverage"), icon: ShieldCheckIcon, tone: "blue", value: citationCoverage == null ? null : `${numberFormat.format(citationCoverage)}%` },
  ];

  const workflowStages: WorkflowStage[] = [
    {
      key: "import",
      icon: ArrowUpTrayIcon,
      state: activeSnapshot ? "complete" : "current",
    },
    {
      key: "outline",
      icon: ListBulletIcon,
      state: !isSnapshotReady ? (activeSnapshot ? "attention" : "upcoming") : hasApprovedBlueprint ? "complete" : "current",
    },
    {
      key: "plan",
      icon: DocumentTextIcon,
      state: !hasApprovedBlueprint ? "upcoming" : isParagraphPlanReady ? "complete" : "current",
    },
    {
      key: "draft",
      icon: PencilSquareIcon,
      state: isParagraphPlanReady ? "current" : "upcoming",
    },
    {
      key: "review",
      icon: CheckCircleIcon,
      state: "upcoming",
    },
  ];

  const resumeStep = !activeProject
    ? "noProject"
    : snapshotsLoading
      ? "loading"
    : !activeSnapshot
      ? "noSnapshot"
      : !isSnapshotReady
        ? "readiness"
        : !hasApprovedBlueprint
          ? "outline"
          : !isParagraphPlanReady
            ? "plan"
            : "draft";
  const resumePaths: Record<string, string> = {
    noProject: "/import",
    loading: "/snapshots",
    noSnapshot: "/snapshots",
    readiness: "/snapshots",
    outline: "/outline",
    plan: "/paragraph-plans",
    draft: "/drafting",
  };
  const resumePath = workspacePath(resumePaths[resumeStep], selectedProjectId, selectedSnapshotId);

  return (
    <div className="overview-dashboard">
      <motion.section
        className="overview-heading"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: "easeOut" }}
      >
        <div>
          <p className="overview-eyebrow">{t("overview.pageEyebrow")}</p>
          <h1 className="slrw-page-title">{t("overview.pageTitle")}</h1>
          <p className="overview-page-description">{t("overview.pageDescription")}</p>
        </div>
        <div className="overview-heading-actions">
          <Button asChild variant="outline">
            <Link to={workspacePath("/snapshots", selectedProjectId, selectedSnapshotId)}>
              <ArrowUpTrayIcon aria-hidden="true" />
              {t("overview.importSource")}
            </Link>
          </Button>
          <Button asChild>
            <Link to={workspacePath("/drafting", selectedProjectId, selectedSnapshotId)}>
              {t("overview.openStudio")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.section>

      <motion.section
        className="overview-project-hero"
        aria-labelledby="overview-project-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.34, delay: prefersReducedMotion ? 0 : 0.04, ease: "easeOut" }}
      >
        <div className="overview-hero-decoration overview-hero-decoration-one" aria-hidden="true" />
        <div className="overview-hero-decoration overview-hero-decoration-two" aria-hidden="true" />
        <div className="overview-hero-copy">
          <p className="overview-hero-kicker">{t("overview.activeProject")}<span>/</span>{t("overview.projectType")}</p>
          <h2 id="overview-project-title">
            {activeProject?.name ?? (projectsLoading ? t("overview.loadingProject") : t("overview.noActiveProject"))}
          </h2>
          <p>
            {activeProject
              ? t("overview.projectDescription", { slrProjectId: activeProject.slrProjectId })
              : t("overview.noActiveProjectDescription")}
          </p>
          <Button asChild variant="secondary" className="overview-hero-button">
            <Link to={activeProject
              ? workspacePath("/drafting", selectedProjectId, selectedSnapshotId)
              : "/import"}>
              {t(activeProject ? "overview.continueWriting" : "overview.viewProjects")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className={`overview-snapshot-ring is-${activeSnapshot?.status?.toLowerCase() ?? "empty"}`} aria-label={activeSnapshot ? t(`snapshots.status.${activeSnapshot.status}`) : t("overview.noSnapshotShort")}>
          <div className="overview-snapshot-ring-inner">
            {activeSnapshot ? (
              <>
                <strong>{t(`snapshots.status.${activeSnapshot.status}`)}</strong>
                <span>{t("overview.snapshotStatusLabel")}</span>
              </>
            ) : (
              <>
                <CircleStackIcon aria-hidden="true" />
                <span>{t("overview.noSnapshotShort")}</span>
              </>
            )}
          </div>
        </div>
      </motion.section>

      {projectsError && <p className="overview-inline-error" role="alert">{projectsError}</p>}
      {snapshotDetailError && <p className="overview-inline-error" role="alert">{snapshotDetailError}</p>}

      <section ref={metricsRef} className="overview-metrics" aria-label={t("overview.metrics.title")}>
        {metrics.map(({ key, label, icon: Icon, tone, value }) => {
          const supportingText = !activeSnapshot
            ? t("overview.metrics.awaitingSnapshot")
            : snapshotDetailLoading
              ? t("overview.metrics.loading")
              : value == null
                ? t(key === "sections" ? "overview.metrics.sectionsPending" : "overview.metrics.coveragePending")
                : null;
          return (
            <Card className="overview-metric" data-overview-metric key={key}>
              <CardContent className="overview-metric-content">
                <span className={`overview-metric-icon is-${tone}`}><Icon aria-hidden="true" /></span>
                <strong>{snapshotDetailLoading || !activeSnapshot ? "—" : value ?? "—"}</strong>
                <span>{label}</span>
                {supportingText && <small>{supportingText}</small>}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="overview-lower-grid">
        <Card className="overview-workflow-card">
          <CardContent className="overview-workflow-content">
            <div className="overview-section-heading">
              <div>
                <p className="overview-eyebrow">{t("overview.workflowLabel")}</p>
                <h2>{t("overview.workflowTitle")}</h2>
                <p>{t("overview.workflowDescription")}</p>
              </div>
              <span className="overview-next-badge">
                {t(`overview.workflowState.${workflowStages.find((stage) => stage.state === "current" || stage.state === "attention")?.key ?? "import"}`)}
              </span>
            </div>
            <ol className="overview-workflow-list">
              {workflowStages.map(({ key, icon: Icon, state }, index) => (
                <li className={`overview-workflow-step is-${state}`} key={key}>
                  <span className="overview-step-icon" aria-hidden="true">
                    {state === "complete" ? <CheckCircleIcon /> : state === "attention" ? <ExclamationTriangleIcon /> : <Icon />}
                  </span>
                  <span className="overview-step-copy">
                    <strong>{t(`overview.stages.${key}.title`)}</strong>
                    <span>{t(`overview.workflowState.${state}`)}</span>
                  </span>
                  <span className="overview-step-number">0{index + 1}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="overview-resume-card">
          <CardContent className="overview-resume-content">
            <div className="overview-resume-topline">
              <ClockIcon aria-hidden="true" />
              <span>{t("overview.resumeEyebrow")}</span>
            </div>
            <h2>{t("overview.resumeTitle")}</h2>
            <p>{t(`overview.resume.${resumeStep}`, {
              project: activeProject?.name ?? "",
              snapshot: activeSnapshot?.sourceRunId ?? "",
            })}</p>
            {activeSnapshot && (
              <div className="overview-resume-meta">
                <span>{activeSnapshot.sourceRunId}</span>
                <span>{t(`snapshots.status.${activeSnapshot.status}`)}</span>
              </div>
            )}
            <div className="overview-resume-footer">
              <span>{activeSnapshot ? `${t("overview.importedAt")} · ${new Date(activeSnapshot.importedAt).toLocaleDateString(i18n.resolvedLanguage ?? "vi")}` : t("overview.noRecentActivity")}</span>
              <Button asChild>
                <Link to={resumePath}>
                  {t(`overview.resumeActions.${resumeStep}`)}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
