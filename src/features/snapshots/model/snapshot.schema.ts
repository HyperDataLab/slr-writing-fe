import { z } from "zod";

type Translate = (key: string) => string;

export function createImportSnapshotSchema(t: Translate) {
  return z.object({
    runId: z.string().trim().min(1, t("snapshots.runIdRequired")).max(256, t("snapshots.runIdMax")),
  });
}

