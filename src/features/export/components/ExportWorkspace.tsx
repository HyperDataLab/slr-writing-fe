import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  approveH3,
  createExportPackage,
  downloadExportPdfFile,
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
import { GsapStagger } from "@/shared/ui/gsap-motion";

type ReadinessTone = "success" | "warning" | "destructive" | "secondary";

function ReadinessItem({ label, status, tone }: { label: string; status: string; tone: ReadinessTone }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/30 px-2.5 py-2 text-xs">
      {tone === "success" ? (
        <CheckCircleIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <ExclamationCircleIcon
          className={`size-4 shrink-0 ${tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-muted-foreground"}`}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 flex-1 truncate" title={label}>{label}</span>
      <Badge variant={tone} className="shrink-0 px-1.5 py-0 text-[10px]">{status}</Badge>
    </div>
  );
}

export function ExportWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const { t } = useTranslation();
  const stableT = useStableT();
  const [h3Status, setH3Status] = useState<H3StatusView | null>(null);
  const [exportPackage, setExportPackage] = useState<ExportPackageView | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(false);
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
        // No manuscript row yet (nothing generated for this snapshot) is a normal, blocked state, not an error.
        getH3Status(projectId, snapshot.id).catch((err: unknown) => {
          if (err instanceof ApiError && err.status === 404 && err.code === "MANUSCRIPT_NOT_FOUND") return null;
          throw err;
        }),
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
      setError(err instanceof Error ? err.message : stableT("exportPkg.loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id, stableT]);

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

  const handleDownloadPdf = async (format: "ieee" | "imrad" = "ieee") => {
    setDownloadingPdf(true);
    try {
      const { blob, filename } = await downloadExportPdfFile(projectId, snapshot.id, { format });
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
      setDownloadingPdf(false);
    }
  };

  const handleViewPdf = async (format: "ieee" | "imrad" = "ieee") => {
    setViewingPdf(true);
    try {
      const { blob } = await downloadExportPdfFile(projectId, snapshot.id, { format, inline: true });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("exportPkg.downloadError"));
    } finally {
      setViewingPdf(false);
    }
  };

  const isH3Approved = h3Status?.h3Status === "APPROVED";
  const canApprove = h3Status?.canApprove;
  const blockedReasons = h3Status?.blockingReasons ?? (error
    ? [t("exportPkg.statusUnavailable")]
    : [t("exportPkg.noManuscriptSections"), t("exportPkg.noCurrentVerification")]);
  const showBlockedAlert = !loading && !isH3Approved && !canApprove;
  const readinessItems = [
    { key: "h1", passed: h3Status?.readiness.h1Approved ?? false },
    { key: "requiredSections", passed: h3Status?.readiness.requiredSectionsDrafted ?? false },
    { key: "h2", passed: h3Status?.readiness.allH2Approved ?? false },
    { key: "verification", passed: h3Status?.readiness.verificationCurrent ?? false },
  ];
  const readinessStatusText = (passed: boolean) => !h3Status
    ? t("exportPkg.checkStatus.notChecked")
    : t(passed ? "exportPkg.checkStatus.passed" : "exportPkg.checkStatus.blocked");

  return (
    <GsapStagger className="space-y-6">
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
        <div className="px-6 pb-3 pt-0 border-b border-border/60 flex items-center gap-2" role="group" aria-label={t("exportPkg.tabsLabel")}>
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            aria-pressed={activeTab === "export"}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "export"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("exportPkg.tabExport")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lineage")}
            aria-pressed={activeTab === "lineage"}
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

      {activeTab === "export" && showBlockedAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-warning-border bg-warning-soft p-4 text-warning"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ExclamationCircleIcon aria-hidden="true" className="size-5 shrink-0" />
            {t("exportPkg.notReadyToPublish")}
          </div>
          <ul className="list-disc space-y-1 pl-7 text-sm">
            {blockedReasons.length > 0 ? blockedReasons.map((reason, idx) => (
              <li key={`${idx}-${reason}`}>{reason}</li>
            )) : <li>{t("exportPkg.statusUnavailable")}</li>}
          </ul>
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
              {h3Status && h3Status.omittedSections.length > 0 && (
                <div className="p-3 rounded-lg bg-warning-soft border border-warning-border text-warning text-xs">
                  {t("exportPkg.omitted", { sections: h3Status.omittedSections.map((key) => t(`plans.sectionName.${key}`, { defaultValue: key })).join(", ") })}
                </div>
              )}

              {/* Readiness checklist */}
              <section aria-labelledby="export-readiness-heading" className="space-y-2">
                <h3 id="export-readiness-heading" className="text-xs font-semibold text-foreground">
                  {t("exportPkg.readiness.title")}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {readinessItems.map(({ key, passed }) => (
                    <ReadinessItem
                      key={key}
                      label={t(`exportPkg.readiness.${key}`)}
                      status={readinessStatusText(passed)}
                      tone={!h3Status ? "secondary" : passed ? "success" : "destructive"}
                    />
                  ))}
                  {(h3Status?.readiness.qualityGates ?? []).map((gate) => {
                    const tone: ReadinessTone = gate.status === "PASS"
                      ? "success"
                      : gate.status === "WARNING" || gate.status === "NEEDS_REVIEW"
                      ? "warning"
                      : gate.status === "NOT_APPLICABLE" || gate.status === "NOT_RUN"
                      ? "secondary"
                      : "destructive";
                    return (
                      <ReadinessItem
                        key={gate.gateId}
                        label={`${gate.gateId}: ${t(`verify.gate.${gate.gateId}.title`)}`}
                        status={t(`verify.gateStatus.${gate.status}`, { defaultValue: gate.status })}
                        tone={tone}
                      />
                    );
                  })}
                  {!h3Status && ["G1", "G2", "G3", "G4", "G5", "G6", "G7"].map((gateId) => (
                    <ReadinessItem
                      key={gateId}
                      label={`${gateId}: ${t(`verify.gate.${gateId}.title`)}`}
                      status={t("verify.gateStatus.NOT_RUN")}
                      tone="secondary"
                    />
                  ))}
                </div>
                {h3Status?.latestApproval && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("exportPkg.latestH3Decision", {
                      decision: h3Status.latestApproval.decision,
                      actor: h3Status.latestApproval.decidedBy,
                      seq: h3Status.latestApproval.seq,
                    })}
                  </p>
                )}
              </section>
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
                    className="text-destructive"
                    disabled={!h3Status || isH3Approved}
                    onClick={() => setModalAction("reject")}
                  >
                    {t("exportPkg.rejectH3")}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary-hover text-white"
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
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{t("exportPkg.packageTitle")}</CardTitle>
                  {exportPackage && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {t("exportPkg.fileCount", { count: exportPackage.manifest.length })}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("exportPkg.packageDescription")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf("ieee")}
                  disabled={!exportPackage || downloadingPdf}
                  className="gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 border-primary/40 shadow-xs"
                  title={t("exportPkg.downloadPdfTooltip")}
                >
                  <ArrowDownTrayIcon className="size-4" />
                  {downloadingPdf ? t("exportPkg.downloadingPdf") : t("exportPkg.downloadPdfIeee")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewPdf("ieee")}
                  disabled={!exportPackage || viewingPdf}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title={t("exportPkg.viewPdf")}
                >
                  <EyeIcon className="size-4" />
                  {viewingPdf ? t("exportPkg.viewingPdf") : t("exportPkg.viewPdf")}
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
                              <div className="flex items-center gap-2">
                                <span>{file.filename}</span>
                                {file.filename === "manuscript.md" && (
                                  <span className="inline-flex items-center gap-1.5 ml-1 font-sans font-normal">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadPdf("ieee")}
                                      disabled={downloadingPdf}
                                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 cursor-pointer bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 hover:bg-primary/20 transition-colors"
                                      title={t("exportPkg.downloadPdfIeee")}
                                    >
                                      <ArrowDownTrayIcon className="size-3" />
                                      PDF (IEEE)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleViewPdf("ieee")}
                                      disabled={viewingPdf}
                                      className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer bg-muted/60 hover:bg-muted px-1.5 py-0.5 rounded border border-border transition-colors"
                                      title={t("exportPkg.viewPdf")}
                                    >
                                      <EyeIcon className="size-3" />
                                      {t("exportPkg.viewPdf")}
                                    </button>
                                  </span>
                                )}
                              </div>
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
    </GsapStagger>
  );
}
