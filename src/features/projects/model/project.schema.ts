import { z } from "zod";

type Translate = (key: string) => string;

export function createProjectSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(1, t("projects.validation.nameRequired")).max(200, t("projects.validation.nameMax")),
    slrProjectId: z
      .string()
      .trim()
      .min(1, t("projects.validation.slrIdRequired"))
      .max(200, t("projects.validation.slrIdMax"))
      .refine((value) => !/^\.+$/.test(value), t("projects.validation.slrIdInvalid")),
  });
}

