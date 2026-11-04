import { z } from "zod";

type Translate = (key: string) => string;

export function createImportSnapshotSchema(t: Translate) {
  return z.object({
    runId: z
      .string()
      .trim()
      .min(1, t("snapshots.runIdRequired"))
      .max(128, t("snapshots.runIdMax"))
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/, t("snapshots.invalidRunId")),
  });
}

