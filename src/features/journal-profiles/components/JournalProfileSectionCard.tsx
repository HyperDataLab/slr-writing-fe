import { useTranslation } from "react-i18next";
import type { JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function JournalProfileSectionCard({ section, position }: { section: JournalProfileSection; position: number }) {
  const { t } = useTranslation();
  const sectionTitle = t(`journalProfiles.sectionTitles.${section.key}`, { defaultValue: section.title });
  const purpose = t(`journalProfiles.purposes.${section.key}`, { defaultValue: section.purpose });

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-primary">
            {position.toString().padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-balance">{sectionTitle}</CardTitle>
            <CardDescription className="text-pretty">{purpose}</CardDescription>
          </div>
        </div>
        <Badge variant={section.required ? "default" : "outline"}>
          {t(section.required ? "journalProfiles.required" : "journalProfiles.optional")}
        </Badge>
      </CardHeader>
    </Card>
  );
}
