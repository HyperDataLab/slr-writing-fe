import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  approveH3,
  createExportPackage,
  downloadExportZipFile,
  getH3Status,
  getLatestExportPackage,
  rejectH3,
} from "@/features/export/api/export.api";
import { H3DecisionModal } from "@/features/export/components/H3DecisionModal";
import { LineageExplorer } from "@/features/export/components/LineageExplorer";
import type { ExportPackageView, H3StatusView } from "@/features/export/model/export.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ExportWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const [h3Status, setH3Status] = useState<H3StatusView | null>(null);
  const [exportPackage, setExportPackage] = useState<ExportPackageView | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [activeTab, setActiveTab] = useState<"export" | "lineage">("export");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h3, pkg] = await Promise.all([
        getH3Status(projectId, snapshot.id).catch(() => null),
        getLatestExportPackage(projectId, snapshot.id).catch(() => null),
      ]);
      setH3Status(h3);
      setExportPackage(pkg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load submission data");
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDecision = async (note?: string) => {
    if (!modalAction) return;
    setSubmittingDecision(true);
    try {
      if (modalAction === "approve") {
        await approveH3(projectId, snapshot.id, note);
      } else {
        await rejectH3(projectId, snapshot.id, note || "");
      }
      await loadData();
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleCreatePackage = async () => {
    setExporting(true);
    setError(null);
    try {
      const pkg = await createExportPackage(projectId, snapshot.id);
      setExportPackage(pkg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create export package");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadExportZipFile(projectId, snapshot.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download ZIP file");
    } finally {
      setDownloading(false);
    }
  };

  const isH3Approved = h3Status?.h3Status === "APPROVED";
  const canApprove = h3Status?.canApprove;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Submission Export & H3 Human Approval Center</CardTitle>
              {exportPackage && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{exportPackage.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Stage M9: Final human oversight (H3), PKZIP 2.0 bundle compilation (7 academic files), and reverse lineage queries.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5"
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Tab Switcher */}
        <div className="px-6 pb-3 pt-0 border-b border-border/60 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("export")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "export"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Submission Checklist & Export
          </button>
          <button
            onClick={() => setActiveTab("lineage")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "lineage"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Reverse Lineage Explorer
          </button>
        </div>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          Loading submission package status...
        </div>
      ) : activeTab === "lineage" ? (
        <LineageExplorer projectId={projectId} snapshotId={snapshot.id} />
      ) : (
        <div className="space-y-6">
          {/* Pre-submission Fail-closed Checklist */}
          <Card className="border border-border/80">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pre-submission Integrity Checklist
              </span>
              <Badge
                variant={isH3Approved ? "success" : canApprove ? "default" : "destructive"}
                className="gap-1 text-xs"
              >
                {isH3Approved ? (
                  <>
                    <CheckBadgeIcon className="size-3.5" /> H3 APPROVED
                  </>
                ) : canApprove ? (
                  <>
                    <CheckCircleIcon className="size-3.5" /> READY FOR H3
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="size-3.5" /> BLOCKED
                  </>
                )}
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Blocking Reasons Alert */}
              {h3Status?.blockingReasons && h3Status.blockingReasons.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ExclamationCircleIcon className="size-4" /> Export Prerequisites Incomplete ({h3Status.blockingReasons.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-2">
                    {h3Status.blockingReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {h3Status && h3Status.omittedSections.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                  Not part of this export (the engine cannot draft them yet): {h3Status.omittedSections.join(", ")}.
                </div>
              )}

              {/* Status Points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">Human Oversight H3</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {isH3Approved ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Approved by Owner</span>
                    ) : (
                      <span className="text-amber-500">Pending Decision</span>
                    )}
                  </div>
                  {h3Status?.latestApproval && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      by {h3Status.latestApproval.decidedBy} (seq: {h3Status.latestApproval.seq})
                    </p>
                  )}
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">Quality Gates (G1–G7)</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {h3Status?.verificationSummary?.status === "PASSED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400">PASSED (All Gates)</span>
                    ) : (
                      <span className="text-destructive">{h3Status?.verificationSummary?.status || "NOT RUN"}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Passed: {h3Status?.verificationSummary?.passed ?? 0}/7 • Blocking: {h3Status?.verificationSummary?.blockingIssuesCount ?? 0}
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">Composite Target Hash</span>
                  <div className="font-mono text-muted-foreground truncate text-[11px] mt-1" title={h3Status?.compositeTargetHash}>
                    {h3Status?.compositeTargetHash ? `${h3Status.compositeTargetHash.slice(0, 18)}...` : "N/A"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Immutable manuscript fingerprint</p>
                </div>
              </div>

              {/* H3 Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  {isH3Approved
                    ? "Manuscript has received final human approval. You may generate or download the submission package."
                    : canApprove
                    ? "All prerequisites are satisfied. As the SLR Owner, you can authorize final submission approval."
                    : "Address blocking reasons above before approving H3."}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 dark:text-rose-400"
                    disabled={isH3Approved}
                    onClick={() => setModalAction("reject")}
                  >
                    Reject H3
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!canApprove || isH3Approved}
                    onClick={() => setModalAction("approve")}
                  >
                    <ShieldCheckIcon className="size-4 mr-1.5" />
                    Authorize H3 Approval
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Package Export & PKZIP Panel */}
          <Card className="border border-border/80">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Submission Package & PKZIP Bundle</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compilation of 7 academic submission files into a standalone PKZIP archive.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreatePackage}
                  disabled={!isH3Approved || exporting}
                  className="gap-1.5 text-xs"
                >
                  <DocumentArrowDownIcon className="size-4" />
                  {exporting ? "Compiling..." : exportPackage ? "Re-compile Package" : "Create Package v1"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={!exportPackage || downloading}
                  className="gap-1.5 text-xs"
                >
                  <ArrowDownTrayIcon className="size-4" />
                  {downloading ? "Downloading..." : "Download Submission (.zip)"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {!exportPackage ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>No export package compiled yet. Ensure H3 is approved, then click &ldquo;Create Package v1&rdquo;.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Package Metadata */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-muted-foreground">Package Revision:</span>{" "}
                      <strong className="font-mono text-foreground">v{exportPackage.version}</strong> •{" "}
                      <span className="text-muted-foreground">Exported by:</span>{" "}
                      <strong className="text-foreground">{exportPackage.exportedBy}</strong> (
                      {new Date(exportPackage.exportedAt).toLocaleString()})
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground truncate max-w-sm" title={exportPackage.packageHash}>
                      SHA-256: {exportPackage.packageHash}
                    </div>
                  </div>

                  {/* 7 Manifest Files Table */}
                  <div className="overflow-x-auto border border-border/60 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-medium uppercase tracking-wider text-[11px] border-b border-border/60">
                        <tr>
                          <th className="py-2 px-3">File</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Size</th>
                          <th className="py-2 px-3">SHA-256</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                        {exportPackage.manifest.map((file, idx) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-3 font-semibold text-primary font-mono whitespace-nowrap">
                              {file.filename}
                            </td>
                            <td className="py-2 px-3 font-sans text-xs text-foreground">
                              {file.description}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                              {(file.sizeBytes / 1024).toFixed(1)} KB
                            </td>
                            <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]" title={file.sha256}>
                              {file.sha256.slice(0, 16)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decision Modal */}
      {modalAction && (
        <H3DecisionModal
          isOpen={true}
          onClose={() => setModalAction(null)}
          action={modalAction}
          compositeHash={h3Status?.compositeTargetHash || ""}
          onConfirm={handleDecision}
          submitting={submittingDecision}
        />
      )}
    </div>
  );
}
