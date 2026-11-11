import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  getLatestVerification,
  runVerificationWithProgress,
  type VerificationGateProgress,
} from "@/features/verification/api/verification.api";
import { CitationManifestTable } from "@/features/verification/components/CitationManifestTable";
import { GateAuditCard } from "@/features/verification/components/GateAuditCard";
import type { GateId, QualityGateResult, VerificationReportView } from "@/features/verification/model/verification.types";
import { ApiError } from "@/shared/lib/api-client";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapStagger, GsapReveal } from "@/shared/ui/gsap-motion";

const QUALITY_GATE_ORDER: GateId[] = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];

export function VerificationWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const { t } = useTranslation();
  const stableT = useStableT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<VerificationReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [gateProgress, setGateProgress] = useState<VerificationGateProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gates" | "manifest">(
    searchParams.get("tab") === "manifest" ? "manifest" : "gates",
  );

  useEffect(() => {
    setActiveTab(searchParams.get("tab") === "manifest" ? "manifest" : "gates");
  }, [searchParams]);

  const selectTab = (tab: "gates" | "manifest") => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getLatestVerification(projectId, snapshot.id));
    } catch (err: unknown) {
      setReport(null);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : stableT("verify.loadError"));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id, stableT]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRunAudit = async () => {
    setAuditing(true);
    setGateProgress([]);
    setError(null);
    try {
      const { report: newReport } = await runVerificationWithProgress(projectId, snapshot.id, (progress) => {
        setGateProgress((current) => [...current.filter((item) => item.gateId !== progress.gateId), progress]);
      });
      setReport(newReport);
      setGateProgress([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("verify.runError"));
    } finally {
      setAuditing(false);
    }
  };

  const summary = report?.summary;
  const manifest = report?.manifest ?? null;
  const statusVariant =
    report?.status === "FAILED"
      ? "destructive"
      : report?.isCurrent === false || report?.status === "PASSED_WITH_WARNINGS"
      ? "warning"
      : "success";
  const gateEntries = (Object.entries(report?.gates ?? {}) as Array<[GateId, QualityGateResult]>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const gateProgressById = new Map(gateProgress.map((item) => [item.gateId, item]));
  const activeGate = gateProgress.find((item) => item.state === "RUNNING");
  const completedGateCount = gateProgress.filter((item) => item.state === "COMPLETED").length;
  const progressPercent = Math.round((completedGateCount / QUALITY_GATE_ORDER.length) * 100);

  return (
    <GsapStagger className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{t("verify.title")}</CardTitle>
              {report && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{report.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {t("verify.description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading || auditing}
              className="gap-1.5"
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              {t("workflow.refresh")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRunAudit}
              disabled={auditing}
              className="gap-1.5"
            >
              {auditing
                ? <ArrowPathIcon className="size-4 motion-safe:animate-spin" />
                : <ShieldCheckIcon className="size-4" />}
              {auditing ? t("verify.auditing") : report ? t("verify.rerun") : t("verify.run")}
            </Button>
          </div>
        </CardHeader>

        {auditing && (
          <CardContent className="pt-0" aria-busy="true">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("verify.progress.title")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("verify.progress.detail", { completed: completedGateCount, total: QUALITY_GATE_ORDER.length })}
                  </p>
                </div>
                {activeGate?.state === "RUNNING" && (
                  <Badge variant="outline" className="gap-1.5">
                    <ArrowPathIcon className="size-3 motion-safe:animate-spin" />
                    {t("verify.progress.current", { gate: activeGate.gateId })}
                  </Badge>
                )}
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={t("verify.progress.title")}
                aria-valuemin={0}
                aria-valuemax={QUALITY_GATE_ORDER.length}
                aria-valuenow={completedGateCount}
                aria-valuetext={t("verify.progress.detail", { completed: completedGateCount, total: QUALITY_GATE_ORDER.length })}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {QUALITY_GATE_ORDER.map((gateId) => {
                  const progress = gateProgressById.get(gateId);
                  const isRunning = progress?.state === "RUNNING";
                  const isComplete = progress?.state === "COMPLETED";
                  const statusLabel = isRunning
                    ? t("verify.progress.running")
                    : progress?.state === "COMPLETED"
                    ? t(`verify.gateStatus.${progress.status}`)
                    : t("verify.progress.waiting");

                  return (
                    <li
                      key={gateId}
                      aria-current={isRunning ? "step" : undefined}
                      className={`flex min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs ${
                        isRunning
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : isComplete
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-border/60 bg-background/70 text-muted-foreground"
                      }`}
                    >
                      <span className="font-semibold">{gateId}</span>
                      <span className="truncate text-right">{statusLabel}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </CardContent>
        )}

        {/* Overall Status Banner */}
        {report && (
          <CardContent className="pt-0 border-t border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 text-center">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.overallStatus")}</span>
                <div className="mt-1 flex items-center justify-center">
                  <Badge variant={statusVariant} className="gap-1 text-xs">
                    {report.status === "FAILED" || !report.isCurrent
                      ? <ExclamationCircleIcon className="size-3.5" />
                      : <CheckCircleIcon className="size-3.5" />}
                    {t(`verify.overall.${report.status}`)}
                  </Badge>
                  {!report.isCurrent && (
                    <Badge variant="warning" className="ml-1 text-xs">{t("verify.stale")}</Badge>
                  )}
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.gatesPassed")}</span>
                <span className="text-xl font-bold text-foreground mt-0.5 block">
                  {summary?.passed ?? 0}/{summary?.totalGates ?? 7}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.warnings")}</span>
                <span className={`text-xl font-bold mt-0.5 block ${(summary?.warnings ?? 0) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {summary?.warnings ?? 0}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.blockingIssues")}</span>
                <span className={`text-xl font-bold mt-0.5 block ${(summary?.blockingIssues ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
                  {summary?.blockingIssues ?? 0}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.notRunNa")}</span>
                <span className={`text-xl font-bold mt-0.5 block ${(summary?.notRun ?? 0) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                  {summary?.notRun ?? 0} / {summary?.notApplicable ?? 0}
                </span>
              </div>
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

      {report && !report.isCurrent && (
        <div role="alert" className="rounded-lg border border-warning-border bg-warning-soft p-3 text-sm text-warning">
          {t("verify.staleReport")}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => selectTab("gates")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "gates"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("verify.tabGates")}
        </button>
        <button
          onClick={() => selectTab("manifest")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "manifest"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("verify.tabManifest")} {manifest ? `(${manifest.items.length})` : ""}
        </button>
      </div>

      {/* When no report exists yet */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          {t("verify.loading")}
        </div>
      ) : !report ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <ShieldCheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t("verify.noReportTitle")}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                {t("verify.noReportDescription")}
              </p>
            </div>
            <Button onClick={handleRunAudit} disabled={auditing} className="gap-2">
              {auditing
                ? <ArrowPathIcon className="size-4 motion-safe:animate-spin" />
                : <ShieldCheckIcon className="size-4" />}
              {auditing ? t("verify.auditingShort") : t("verify.runFull")}
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === "gates" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gateEntries.map(([gateId, gate]) => (
            <GsapReveal key={gateId}>
              <GateAuditCard gate={gate} issues={report.issues.filter((i) => i.gateId === gateId)} />
            </GsapReveal>
          ))}
        </div>
      ) : (
        manifest && <CitationManifestTable manifest={manifest} />
      )}
    </GsapStagger>
  );
}
