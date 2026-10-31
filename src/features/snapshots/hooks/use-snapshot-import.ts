import { useCallback, useState } from "react";
import { ApiError } from "@/shared/lib/api-client";
import { importSnapshotFromSlr } from "@/features/snapshots/api/snapshots.api";
import { importSnapshotSchema } from "@/features/snapshots/model/snapshot.schema";

export interface SnapshotImportState {
  isImporting: boolean;
  result: unknown | null;
  error: string | null;
}

export function useSnapshotImport() {
  const [state, setState] = useState<SnapshotImportState>({
    isImporting: false,
    result: null,
    error: null,
  });

  const importRun = useCallback(async (projectId: string, runId: string) => {
    const parsedInput = importSnapshotSchema.safeParse({ runId });
    if (!parsedInput.success) {
      setState({ isImporting: false, result: null, error: parsedInput.error.issues[0]?.message ?? "Mã run không hợp lệ." });
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
          : "Không thể nhập snapshot. Vui lòng thử lại.";
      setState({ isImporting: false, result: null, error: message });
    }
  }, []);

  return { ...state, importRun };
}

