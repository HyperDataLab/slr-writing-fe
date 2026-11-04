import { useId, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import type { JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import type { BlueprintSection } from "@/features/outline/model/outline.types";
import type { ClaimOption } from "@/features/outline/utils/outline.helpers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionListItem } from "@/shared/ui/motion";

interface OutlineSectionEditorProps {
  section: BlueprintSection;
  profileSection?: JournalProfileSection;
  claimOptions: ClaimOption[];
  disabled: boolean;
  locale: string;
  onChange: (section: BlueprintSection) => void;
  onRemoveSubsection: (subsectionId: string) => void;
}

export function OutlineSectionEditor({
  section,
  profileSection,
  claimOptions,
  disabled,
  locale,
  onChange,
  onRemoveSubsection,
}: OutlineSectionEditorProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const [claimFilter, setClaimFilter] = useState("");
  const sectionTitle = t(`journalProfiles.sectionTitles.${section.key}`, {
    defaultValue: profileSection?.title ?? section.key,
  });
  const filteredClaims = claimOptions.filter((option) =>
    `${option.label} ${option.id}`.toLocaleLowerCase(locale).includes(claimFilter.toLocaleLowerCase(locale)),
  );
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const isRequired = profileSection?.required ?? false;

  function updateBudget(field: "min" | "max", value: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_000_000) return;
    onChange({ ...section, wordBudget: { ...section.wordBudget, [field]: parsed } });
  }

  function updateSubsection(index: number, update: (current: BlueprintSection["subsections"][number]) => BlueprintSection["subsections"][number]) {
    onChange({
      ...section,
      subsections: section.subsections.map((subsection, currentIndex) =>
        currentIndex === index ? update(subsection) : subsection,
      ),
    });
  }

  function moveSubsection(index: number, delta: -1 | 1) {
    const destination = index + delta;
    if (destination < 0 || destination >= section.subsections.length) return;
    const subsections = [...section.subsections];
    [subsections[index], subsections[destination]] = [subsections[destination], subsections[index]];
    onChange({ ...section, subsections });
  }

  function addSubsection() {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `user:${crypto.randomUUID()}`
      : `user:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
    onChange({
      ...section,
      subsections: [
        ...section.subsections,
        { id, title: t("outline.newSubsection"), purpose: null, claimIds: [], rqIds: [] },
      ],
    });
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{sectionTitle}</CardTitle>
            <Badge variant={isRequired ? "default" : "outline"}>
              {t(isRequired ? "outline.required" : "outline.optional")}
            </Badge>
          </div>
          {profileSection?.purpose && (
            <CardDescription>
              {t(`journalProfiles.purposes.${section.key}`, { defaultValue: profileSection.purpose })}
            </CardDescription>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={section.include}
            disabled={disabled || isRequired}
            onChange={(event) => onChange({ ...section, include: event.target.checked })}
            className="size-4 rounded border-input accent-primary disabled:opacity-50"
          />
          {t("outline.includeSection")}
        </label>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg bg-secondary/50 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-min`} className="text-xs font-medium text-muted-foreground">
              {t("outline.minimumWords")}
            </label>
            <input
              id={`${idPrefix}-min`}
              type="number"
              min={1}
              max={1_000_000}
              step={1}
              disabled={disabled}
              value={section.wordBudget.min}
              onChange={(event) => updateBudget("min", event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-max`} className="text-xs font-medium text-muted-foreground">
              {t("outline.maximumWords")}
            </label>
            <input
              id={`${idPrefix}-max`}
              type="number"
              min={1}
              max={1_000_000}
              step={1}
              disabled={disabled}
              value={section.wordBudget.max}
              onChange={(event) => updateBudget("max", event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
            {t("outline.profileBudgetHint", {
              min: formatNumber(profileSection?.wordBudget.min ?? section.wordBudget.min),
              max: formatNumber(profileSection?.wordBudget.max ?? section.wordBudget.max),
            })}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t("outline.subsectionsTitle")}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t("outline.subsectionsDescription")}</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addSubsection}>
              {t("outline.addSubsection")}
            </Button>
          </div>

          {section.subsections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("outline.noSubsections")}
            </p>
          ) : (
            <ol className="space-y-3">
              {section.subsections.map((subsection, index) => (
                <MotionListItem key={subsection.id} delay={index * 0.025}>
                  <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-2 text-xs font-semibold tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-1.5">
                          <label htmlFor={`${idPrefix}-title-${index}`} className="text-xs font-medium text-muted-foreground">
                            {t("outline.subsectionTitle")}
                          </label>
                          <input
                            id={`${idPrefix}-title-${index}`}
                            value={subsection.title}
                            maxLength={300}
                            disabled={disabled}
                            onChange={(event) => updateSubsection(index, (current) => ({ ...current, title: event.target.value }))}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
                          />
                        </div>
                        <div className="flex items-end gap-1">
                          <Button type="button" size="sm" variant="outline" disabled={disabled || index === 0} aria-label={t("outline.moveUp")} onClick={() => moveSubsection(index, -1)}>
                            <ChevronUpIcon aria-hidden="true" />
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={disabled || index === section.subsections.length - 1} aria-label={t("outline.moveDown")} onClick={() => moveSubsection(index, 1)}>
                            <ChevronDownIcon aria-hidden="true" />
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={disabled} aria-label={t("outline.removeSubsection")} onClick={() => onRemoveSubsection(subsection.id)}>
                            <TrashIcon aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-6">
                      <label htmlFor={`${idPrefix}-purpose-${index}`} className="text-xs font-medium text-muted-foreground">
                        {t("outline.subsectionPurpose")}
                      </label>
                      <textarea
                        id={`${idPrefix}-purpose-${index}`}
                        rows={2}
                        maxLength={1000}
                        disabled={disabled}
                        value={subsection.purpose ?? ""}
                        onChange={(event) => updateSubsection(index, (current) => ({ ...current, purpose: event.target.value.trim() ? event.target.value : null }))}
                        placeholder={t("outline.subsectionPurposePlaceholder")}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
                      />
                    </div>

                    <details className="rounded-md border border-border" open={subsection.claimIds.length > 0}>
                      <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground">
                        {t("outline.claimsInSubsection", { count: subsection.claimIds.length })}
                      </summary>
                      <div className="space-y-3 border-t border-border p-3">
                        <label htmlFor={`${idPrefix}-claim-search-${index}`} className="sr-only">
                          {t("outline.searchClaims")}
                        </label>
                        <input
                          id={`${idPrefix}-claim-search-${index}`}
                          type="search"
                          value={claimFilter}
                          onChange={(event) => setClaimFilter(event.target.value)}
                          disabled={disabled || claimOptions.length === 0}
                          placeholder={t("outline.searchClaims")}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40 disabled:opacity-60"
                        />
                        {claimOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("outline.noClaims")}</p>
                        ) : filteredClaims.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("outline.noMatchingClaims")}</p>
                        ) : (
                          <ul className="max-h-48 space-y-1 overflow-y-auto">
                            {filteredClaims.map((claim, claimIndex) => {
                              const checked = subsection.claimIds.includes(claim.id);
                              const inputId = `${idPrefix}-claim-${index}-${claimIndex}`;
                              return (
                                <li key={claim.id}>
                                  <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/70">
                                    <input
                                      id={inputId}
                                      type="checkbox"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={(event) => updateSubsection(index, (current) => ({
                                        ...current,
                                        claimIds: event.target.checked
                                          ? [...current.claimIds.filter((id) => id !== claim.id), claim.id]
                                          : current.claimIds.filter((id) => id !== claim.id),
                                      }))}
                                      className="mt-0.5 size-4 shrink-0 accent-primary"
                                    />
                                    <span className="break-words text-foreground">{claim.label}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </details>

                    <p className="pl-6 text-xs leading-5 text-muted-foreground">
                      {t("outline.assignedQuestions", {
                        ids: subsection.rqIds.length > 0 ? subsection.rqIds.join(", ") : t("outline.noneAssigned"),
                      })}
                    </p>
                  </div>
                </MotionListItem>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
