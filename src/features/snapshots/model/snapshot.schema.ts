import { z } from "zod";

export const importSnapshotSchema = z.object({
  runId: z.string().trim().min(1, "Nhập mã run từ SLR.").max(256, "Mã run quá dài."),
});

