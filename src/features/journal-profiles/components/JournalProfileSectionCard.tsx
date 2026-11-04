import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function JournalProfileSectionCard({ section }: { section: JournalProfileSection }) {
  const { t, i18n } = useTranslation();
  const sectionTitle = t(`journalProfiles.sectionTitles.${section.key}`, { defaultValue: section.title });
  const purpose = t(`journalProfiles.purposes.${section.key}`, { defaultValue: section.purpose });
  const locale = i18n.resolvedLanguage ?? "en";
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-primary">
            {section.order.toString().padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-1.5">
            <CardTitle>{sectionTitle}</CardTitle>
            <CardDescription>{purpose}</CardDescription>
          </div>
        </div>
        <Badge variant={section.required ? "default" : "outline"}>
          {t(section.required ? "journalProfiles.required" : "journalProfiles.optional")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t("journalProfiles.suggestedWordBudget")}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {t("journalProfiles.wordRange", {
              min: formatNumber(section.wordBudget.min),
              max: formatNumber(section.wordBudget.max),
            })}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("journalProfiles.sourcesTitle")}</p>
          <ul className="flex flex-wrap gap-2">
            {section.sources.map((source) => (
              <li key={source}>
                <Badge variant="secondary">{t(`journalProfiles.sourceLabels.${source}`)}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{t("journalProfiles.generator")}</p>
            <code className="mt-1 block break-all text-xs text-foreground">
              {section.generator ?? t("journalProfiles.generatorUnavailable")}
            </code>
          </div>
          {section.key === "methods" && (
            <Button asChild size="sm" variant="outline">
              <Link to="/methods">{t("journalProfiles.openMethods")}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
