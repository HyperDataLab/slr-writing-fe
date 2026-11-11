import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/lib/api-client";
import { importSnapshotBundle, importSnapshotFromSlr } from "@/features/snapshots/api/snapshots.api";
import { createImportSnapshotSchema } from "@/features/snapshots/model/snapshot.schema";
import type { ReadinessIssue, ReadinessReport, SnapshotImportResponse } from "@/features/snapshots/model/snapshot.types";

export interface SnapshotImportState {
  isImporting: boolean;
  result: SnapshotImportResponse | null;
  readiness: ReadinessReport | null;
  error: string | null;
  errorCode: string | null;
}

function isReadinessReport(value: unknown): value is ReadinessReport {
  if (!value || typeof value !== "object") return false;
  const report = value as { status?: unknown; issues?: unknown };
  return (report.status === "READY" || report.status === "BLOCKED") && Array.isArray(report.issues)
    && report.issues.every((issue: ReadinessIssue) =>
      typeof issue.code === "string"
      && (issue.severity === "blocking" || issue.severity === "warning")
      && typeof issue.message === "string",
    );
}

export function useSnapshotImport() {
  const { t } = useTranslation();
  const [state, setState] = useState<SnapshotImportState>({
    isImporting: false,
    result: null,
    readiness: null,
    error: null,
    errorCode: null,
  });

  const submitImport = useCallback(async (
    request: () => Promise<SnapshotImportResponse>,
  ): Promise<SnapshotImportResponse | null> => {
    setState({ isImporting: true, result: null, readiness: null, error: null, errorCode: null });

    try {
      const result = await request();
      setState({
        isImporting: false,
        result,
        readiness: { status: "READY", issues: result.warnings },
        error: null,
        errorCode: null,
      });
      return result;
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      let message = error instanceof ApiError ? error.message : t("snapshots.importError");
      if (code === "SLR_UNREACHABLE") {
        message = t("snapshots.runs.unreachableError");
      } else if (code === "SLR_PROJECT_ACCESS_DENIED" || code === "SLR_FORBIDDEN") {
        message = t("snapshots.runs.forbiddenError");
      }
      const readiness = error instanceof ApiError && isReadinessReport(error.details) ? error.details : null;
      setState({ isImporting: false, result: null, readiness, error: message, errorCode: code });
      return null;
    }
  }, [t]);

  const importRun = useCallback(async (projectId: string, runId: string): Promise<SnapshotImportResponse | null> => {
    const parsedInput = createImportSnapshotSchema(t).safeParse({ runId });
    if (!parsedInput.success) {
      setState({
        isImporting: false,
        result: null,
        readiness: null,
        error: parsedInput.error.issues[0]?.message ?? t("snapshots.invalidRunId"),
        errorCode: "VALIDATION_ERROR",
      });
      return null;
    }

    return submitImport(() => importSnapshotFromSlr(projectId, parsedInput.data));
  }, [submitImport, t]);

  const importBundle = useCallback((projectId: string, bundle: Record<string, unknown>) =>
    submitImport(() => importSnapshotBundle(projectId, bundle)), [submitImport]);

  const reset = useCallback(() => {
    setState({ isImporting: false, result: null, readiness: null, error: null, errorCode: null });
  }, []);

  return { ...state, importRun, importBundle, reset };
}

