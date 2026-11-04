import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  getCitationManifest,
  getLatestVerification,
  runVerification,
} from "@/features/verification/api/verification.api";
import { CitationManifestTable } from "@/features/verification/components/CitationManifestTable";
import { GateAuditCard } from "@/features/verification/components/GateAuditCard";
import type {
  CitationManifestView,
  VerificationReportView,
} from "@/features/verification/model/verification.types";
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
  const [report, setReport] = useState<VerificationReportView | null>(null);
  const [manifest, setManifest] = useState<CitationManifestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gates" | "manifest">("gates");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repData, manData] = await Promise.all([
        getLatestVerification(projectId, snapshot.id).catch(() => null),
        getCitationManifest(projectId, snapshot.id).catch(() => null),
      ]);
      setReport(repData);
      setManifest(manData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load verification report");
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRunAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      const { report: newReport } = await runVerification(projectId, snapshot.id);
      setReport(newReport);
      const newManifest = await getCitationManifest(projectId, snapshot.id).catch(() => null);
      setManifest(newManifest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification audit failed");
    } finally {
      setAuditing(false);
    }
  };

  const summary = report?.summary;
  const isPassed = report?.status === "PASSED";

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Quality Gates Verification Engine (G1–G7)</CardTitle>
              {report && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{report.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Automated scientific rigor audits ensuring 100% verified citations, verbatim quotes, PRISMA flow reconciliation, and ungrounded number rejection.
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
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRunAudit}
              disabled={auditing}
              className="gap-1.5"
            >
              <ShieldCheckIcon className="size-4" />
              {auditing ? "Auditing G1–G7..." : report ? "Re-run Quality Gates" : "Run Verification Audit"}
            </Button>
          </div>
        </CardHeader>

        {/* Overall Status Banner */}
        {report && (
          <CardContent className="pt-0 border-t border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 text-center">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">Overall Status</span>
                <div className="mt-1 flex items-center justify-center">
                  <Badge variant={isPassed ? "success" : "destructive"} className="gap-1 text-xs">
                    {isPassed ? <CheckCircleIcon className="size-3.5" /> : <ExclamationCircleIcon className="size-3.5" />}
                    {report.status}
                  </Badge>
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">Gates Passed</span>
                <span className="text-xl font-bold text-foreground mt-0.5 block">
                  {summary?.passed ?? 0}/{summary?.totalGates ?? 7}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">Warnings</span>
                <span className={`text-xl font-bold mt-0.5 block ${(summary?.warnings ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {summary?.warnings ?? 0}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">Blocking Issues</span>
                <span className={`text-xl font-bold mt-0.5 block ${(summary?.blockingIssues ?? 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {summary?.blockingIssues ?? 0}
                </span>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border border-border/40 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">Composite Hash</span>
                <span className="text-xs font-mono text-muted-foreground mt-1.5 block truncate max-w-[120px] mx-auto" title={report.compositeTargetHash}>
                  {report.compositeTargetHash ? `${report.compositeTargetHash.slice(0, 14)}...` : "N/A"}
                </span>
              </div>
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

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("gates")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "gates"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Quality Gates (G1–G7)
        </button>
        <button
          onClick={() => setActiveTab("manifest")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "manifest"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Citation Manifest {manifest?.entries ? `(${manifest.entries.length})` : ""}
        </button>
      </div>

      {/* When no report exists yet */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          Loading verification reports...
        </div>
      ) : !report ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <ShieldCheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold">No Verification Report Run Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Execute the 7 automated Quality Gates audits to inspect citation integrity, quote hashes, and numerical grounding.
              </p>
            </div>
            <Button onClick={handleRunAudit} disabled={auditing} className="gap-2">
              <ShieldCheckIcon className="size-4" />
              {auditing ? "Auditing..." : "Run Quality Gates Audit (G1–G7)"}
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === "gates" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(report.gates).map((gate) => (
            <MotionReveal key={gate.gateId}>
              <GateAuditCard gate={gate} />
            </MotionReveal>
          ))}
        </div>
      ) : (
        manifest && <CitationManifestTable entries={manifest.entries} />
      )}
    </div>
  );
}
