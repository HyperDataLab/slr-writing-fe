import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/lib/api-client";
import { importSnapshotFromSlr } from "@/features/snapshots/api/snapshots.api";
import { createImportSnapshotSchema } from "@/features/snapshots/model/snapshot.schema";

export interface SnapshotImportState {
  isImporting: boolean;
  result: unknown | null;
  error: string | null;
}

export function useSnapshotImport() {
  const { t } = useTranslation();
  const [state, setState] = useState<SnapshotImportState>({
    isImporting: false,
    result: null,
    error: null,
  });

  const importRun = useCallback(async (projectId: string, runId: string) => {
    const parsedInput = createImportSnapshotSchema(t).safeParse({ runId });
    if (!parsedInput.success) {
      setState({ isImporting: false, result: null, error: parsedInput.error.issues[0]?.message ?? t("snapshots.invalidRunId") });
      return;
    }

    setState({ isImporting: true, result: null, error: null });

    try {
      const result = await importSnapshotFromSlr(projectId, parsedInput.data);
      setState({ isImporting: false, result, error: null });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("snapshots.importError");
      setState({ isImporting: false, result: null, error: message });
    }
  }, [t]);

  return { ...state, importRun };
}

