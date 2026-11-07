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
import { getLatestVerification, runVerification } from "@/features/verification/api/verification.api";
import { CitationManifestTable } from "@/features/verification/components/CitationManifestTable";
import { GateAuditCard } from "@/features/verification/components/GateAuditCard";
import type { GateId, QualityGateResult, VerificationReportView } from "@/features/verification/model/verification.types";
import { ApiError } from "@/shared/lib/api-client";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionReveal } from "@/shared/ui/motion";

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
    setError(null);
    try {
      const { report: newReport } = await runVerification(projectId, snapshot.id);
      setReport(newReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("verify.runError"));
    } finally {
      setAuditing(false);
    }
  };

  const summary = report?.summary;
  const manifest = report?.manifest ?? null;
  const statusVariant =
    report?.status === "PASSED" ? "success" : report?.status === "PASSED_WITH_WARNINGS" ? "warning" : "destructive";
  const gateEntries = (Object.entries(report?.gates ?? {}) as Array<[GateId, QualityGateResult]>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
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
              <ShieldCheckIcon className="size-4" />
              {auditing ? t("verify.auditing") : report ? t("verify.rerun") : t("verify.run")}
            </Button>
          </div>
        </CardHeader>

        {/* Overall Status Banner */}
        {report && (
          <CardContent className="pt-0 border-t border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 text-center">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">{t("verify.overallStatus")}</span>
                <div className="mt-1 flex items-center justify-center">
                  <Badge variant={statusVariant} className="gap-1 text-xs">
                    {report.status === "FAILED" ? <ExclamationCircleIcon className="size-3.5" /> : <CheckCircleIcon className="size-3.5" />}
                    {t(`verify.overall.${report.status}`)}
                  </Badge>
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
              <ShieldCheckIcon className="size-4" />
              {auditing ? t("verify.auditingShort") : t("verify.runFull")}
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === "gates" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gateEntries.map(([gateId, gate]) => (
            <MotionReveal key={gateId}>
              <GateAuditCard gate={gate} issues={report.issues.filter((i) => i.gateId === gateId)} />
            </MotionReveal>
          ))}
        </div>
      ) : (
        manifest && <CitationManifestTable manifest={manifest} />
      )}
    </div>
  );
}
