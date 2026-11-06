import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { ApiError } from "@/shared/lib/api-client";
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
  const { t } = useTranslation();
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
        getH3Status(projectId, snapshot.id),
        getLatestExportPackage(projectId, snapshot.id).catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }),
      ]);
      setH3Status(h3);
      setExportPackage(pkg);
    } catch (err: unknown) {
      setH3Status(null);
      setExportPackage(null);
      setError(err instanceof Error ? err.message : t("exportPkg.loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id, t]);

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
      setError(err instanceof Error ? err.message : t("exportPkg.createError"));
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
      setError(err instanceof Error ? err.message : t("exportPkg.downloadError"));
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
              <CardTitle className="text-xl">{t("exportPkg.title")}</CardTitle>
              {exportPackage && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{exportPackage.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {t("exportPkg.description")}
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
              {t("workflow.refresh")}
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
            {t("exportPkg.tabExport")}
          </button>
          <button
            onClick={() => setActiveTab("lineage")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "lineage"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("exportPkg.tabLineage")}
          </button>
        </div>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>{t("workflow.dismiss")}</Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          {t("exportPkg.loading")}
        </div>
      ) : activeTab === "lineage" ? (
        <LineageExplorer projectId={projectId} snapshotId={snapshot.id} />
      ) : (
        <div className="space-y-6">
          {/* Pre-submission Fail-closed Checklist */}
          <Card className="border border-border/80">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("exportPkg.checklist")}
              </span>
              <Badge
                variant={isH3Approved ? "success" : canApprove ? "default" : "destructive"}
                className="gap-1 text-xs"
              >
                {isH3Approved ? (
                  <>
                    <CheckBadgeIcon className="size-3.5" /> {t("exportPkg.badgeApproved")}
                  </>
                ) : canApprove ? (
                  <>
                    <CheckCircleIcon className="size-3.5" /> {t("exportPkg.badgeReady")}
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="size-3.5" /> {t("exportPkg.badgeBlocked")}
                  </>
                )}
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Blocking Reasons Alert */}
              {h3Status?.blockingReasons && h3Status.blockingReasons.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ExclamationCircleIcon className="size-4" /> {t("exportPkg.prerequisites")} ({h3Status.blockingReasons.length}):
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
                  {t("exportPkg.omitted", { sections: h3Status.omittedSections.map((key) => t(`plans.sectionName.${key}`, { defaultValue: key })).join(", ") })}
                </div>
              )}

              {/* Status Points */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">{t("exportPkg.humanOversight")}</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {isH3Approved ? (
                      <span className="text-emerald-600 dark:text-emerald-400">{t("exportPkg.approvedByOwner")}</span>
                    ) : (
                      <span className="text-amber-500">{t("exportPkg.pendingDecision")}</span>
                    )}
                  </div>
                  {h3Status?.latestApproval && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {t("draft.by")} {h3Status.latestApproval.decidedBy} (seq: {h3Status.latestApproval.seq})
                    </p>
                  )}
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">{t("exportPkg.qualityGates")}</span>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {h3Status?.verificationSummary?.status === "PASSED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400">{t("exportPkg.gatesPassedAll")}</span>
                    ) : (
                      <span className="text-destructive">
                        {h3Status?.verificationSummary?.status
                          ? t(`verify.overall.${h3Status.verificationSummary.status}`, { defaultValue: h3Status.verificationSummary.status })
                          : t("verify.gateStatus.NOT_RUN")}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("exportPkg.passedCount", { passed: h3Status?.verificationSummary?.passed ?? 0 })} • {t("exportPkg.blockingCount", { count: h3Status?.verificationSummary?.blockingIssuesCount ?? 0 })}
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                  <span className="text-muted-foreground block text-[11px] mb-1">{t("exportPkg.compositeHash")}</span>
                  <div className="font-mono text-muted-foreground truncate text-[11px] mt-1" title={h3Status?.compositeTargetHash}>
                    {h3Status?.compositeTargetHash ? `${h3Status.compositeTargetHash.slice(0, 18)}...` : "N/A"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("exportPkg.fingerprint")}</p>
                </div>
              </div>

              {/* H3 Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  {isH3Approved
                    ? t("exportPkg.hintApproved")
                    : canApprove
                    ? t("exportPkg.hintReady")
                    : t("exportPkg.hintBlocked")}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 dark:text-rose-400"
                    disabled={isH3Approved}
                    onClick={() => setModalAction("reject")}
                  >
                    {t("exportPkg.rejectH3")}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!canApprove || isH3Approved}
                    onClick={() => setModalAction("approve")}
                  >
                    <ShieldCheckIcon className="size-4 mr-1.5" />
                    {t("exportPkg.authorizeH3")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Package Export & PKZIP Panel */}
          <Card className="border border-border/80">
            <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("exportPkg.packageTitle")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("exportPkg.packageDescription")}
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
                  {exporting ? t("exportPkg.compiling") : exportPackage ? t("exportPkg.recompile") : t("exportPkg.create")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={!exportPackage || downloading}
                  className="gap-1.5 text-xs"
                >
                  <ArrowDownTrayIcon className="size-4" />
                  {downloading ? t("exportPkg.downloading") : t("exportPkg.download")}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {!exportPackage ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>{t("exportPkg.noPackage")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Package Metadata */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-muted-foreground">{t("exportPkg.packageRevision")}:</span>{" "}
                      <strong className="font-mono text-foreground">v{exportPackage.version}</strong> •{" "}
                      <span className="text-muted-foreground">{t("exportPkg.exportedBy")}:</span>{" "}
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
                          <th className="py-2 px-3">{t("exportPkg.file")}</th>
                          <th className="py-2 px-3">{t("exportPkg.fileDescription")}</th>
                          <th className="py-2 px-3">{t("exportPkg.size")}</th>
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
