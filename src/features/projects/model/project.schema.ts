import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên project.").max(120, "Tên project tối đa 120 ký tự."),
  slrProjectId: z
    .string()
    .trim()
    .min(1, "Nhập ID project từ SLR.")
    .max(128, "ID project tối đa 128 ký tự."),
});

