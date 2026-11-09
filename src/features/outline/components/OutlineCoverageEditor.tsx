import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";
import type { BlueprintContent } from "@/features/outline/model/outline.types";
import { ANSWERING_SECTION_KEYS } from "@/features/outline/utils/outline.helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapListItem } from "@/shared/ui/gsap-motion";

export function OutlineCoverageEditor({
  content,
  questionIds,
  profile,
  disabled,
  onChange,
}: {
  content: BlueprintContent;
  questionIds: string[];
  profile?: JournalProfile;
  disabled: boolean;
  onChange: (next: BlueprintContent) => void;
}) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const answerable = content.sections.flatMap((section) => {
    if (!section.include || !ANSWERING_SECTION_KEYS.has(section.key)) return [];
    const profileSection = profile?.sections.find((item) => item.key === section.key);
    const sectionTitle = t(`journalProfiles.sectionTitles.${section.key}`, {
      defaultValue: profileSection?.title ?? section.key,
    });
    return section.subsections.map((subsection) => ({
      ...subsection,
      sectionKey: section.key,
      sectionTitle,
    }));
  });

  function toggleCoverage(rqId: string, subsectionId: string, checked: boolean) {
    const current = content.coverage.find((entry) => entry.rqId === rqId) ?? {
      rqId,
      subsectionIds: [],
      notApplicableReason: null,
    };
    const subsectionIds = checked
      ? [...new Set([...current.subsectionIds, subsectionId])]
      : current.subsectionIds.filter((id) => id !== subsectionId);
    const coverage = content.coverage.some((entry) => entry.rqId === rqId)
      ? content.coverage.map((entry) => entry.rqId === rqId
        ? { ...entry, subsectionIds, notApplicableReason: checked ? null : entry.notApplicableReason }
        : entry)
      : [...content.coverage, { ...current, subsectionIds, notApplicableReason: checked ? null : current.notApplicableReason }];
    const sections = content.sections.map((section) => ({
      ...section,
      subsections: section.subsections.map((subsection) => {
        if (subsection.id !== subsectionId) return subsection;
        const rqIds = checked
          ? [...new Set([...subsection.rqIds, rqId])]
          : subsection.rqIds.filter((id) => id !== rqId);
        return { ...subsection, rqIds };
      }),
    }));
    onChange({ ...content, coverage, sections });
  }

  function updateReason(rqId: string, value: string) {
    const reason = value.trim() ? value : null;
    const exists = content.coverage.some((entry) => entry.rqId === rqId);
    const coverage = exists
      ? content.coverage.map((entry) => entry.rqId === rqId ? { ...entry, notApplicableReason: reason } : entry)
      : [...content.coverage, { rqId, subsectionIds: [], notApplicableReason: reason }];
    onChange({ ...content, coverage });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("outline.coverageTitle")}</CardTitle>
        <CardDescription>{t("outline.coverageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {questionIds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("outline.noQuestions")}
          </p>
        ) : (
          <ol className="space-y-4">
            {questionIds.map((rqId, questionIndex) => {
              const entry = content.coverage.find((item) => item.rqId === rqId) ?? {
                rqId,
                subsectionIds: [],
                notApplicableReason: null,
              };
              return (
                <GsapListItem key={rqId} delay={questionIndex * 0.035}>
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h4 className="break-all text-sm font-semibold text-foreground">
                      {t("outline.questionId", { id: rqId })}
                    </h4>
                    {answerable.length === 0 ? (
                      <p className="text-xs leading-5 text-muted-foreground">{t("outline.noCoverageOptions")}</p>
                    ) : (
                      <fieldset disabled={disabled} className="space-y-2">
                        <legend className="mb-2 text-xs font-medium text-muted-foreground">
                          {t("outline.coverageSubsections")}
                        </legend>
                        {answerable.map((subsection, optionIndex) => {
                          const inputId = `${idPrefix}-${questionIndex}-${optionIndex}`;
                          return (
                            <label key={subsection.id} htmlFor={inputId} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/70">
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={entry.subsectionIds.includes(subsection.id)}
                                onChange={(event) => toggleCoverage(rqId, subsection.id, event.target.checked)}
                                className="mt-0.5 size-4 shrink-0 accent-primary"
                              />
                              <span className="min-w-0">
                                <span className="block break-words text-foreground">{subsection.title}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">{subsection.sectionTitle}</span>
                              </span>
                            </label>
                          );
                        })}
                      </fieldset>
                    )}
                    {entry.subsectionIds.length === 0 && (
                      <div className="space-y-1.5">
                        <label htmlFor={`${idPrefix}-reason-${questionIndex}`} className="text-xs font-medium text-muted-foreground">
                          {t("outline.notApplicableReason")}
                        </label>
                        <textarea
                          id={`${idPrefix}-reason-${questionIndex}`}
                          rows={2}
                          maxLength={1000}
                          disabled={disabled}
                          value={entry.notApplicableReason ?? ""}
                          onChange={(event) => updateReason(rqId, event.target.value)}
                          placeholder={t("outline.notApplicableReasonPlaceholder")}
                          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
                        />
                      </div>
                    )}
                  </div>
                </GsapListItem>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
