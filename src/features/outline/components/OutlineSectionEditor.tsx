import { useId, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import type { JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import type { BlueprintSection } from "@/features/outline/model/outline.types";
import type { ClaimOption } from "@/features/outline/utils/outline.helpers";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { GsapListItem } from "@/shared/ui/gsap-motion";

interface OutlineSectionEditorProps {
  section: BlueprintSection;
  sectionIndex: number;
  profileSection?: JournalProfileSection;
  claimOptions: ClaimOption[];
  disabled: boolean;
  locale: string;
  onChange: (section: BlueprintSection) => void;
  onRemoveSubsection: (subsectionId: string) => void;
}

export function OutlineSectionEditor({
  section,
  sectionIndex,
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
    <Card className="outline-section-card">
      <CardHeader className="outline-section-card-header">
        <div className="outline-section-title-group">
          <span className="outline-section-number" aria-hidden="true">{String(sectionIndex).padStart(2, "0")}</span>
          <div className="outline-section-heading">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{sectionTitle}</CardTitle>
              <span className="outline-section-requirement">
                {t(isRequired ? "outline.required" : "outline.optional")}
              </span>
            </div>
            {profileSection?.purpose && (
              <CardDescription className="outline-section-purpose">
                {t(`journalProfiles.purposes.${section.key}`, { defaultValue: profileSection.purpose })}
              </CardDescription>
            )}
          </div>
        </div>
        {!section.include && <Badge variant="secondary">{t("outline.excluded")}</Badge>}
      </CardHeader>
      <CardContent className="outline-section-card-content">
        {section.subsections.length > 0 && (
          <ol className="outline-subsection-preview">
            {section.subsections.map((subsection, index) => (
              <li key={subsection.id}>
                <span className="outline-subsection-number" aria-hidden="true">{sectionIndex}.{index + 1}</span>
                <span className="outline-subsection-preview-title">{subsection.title || t("outline.untitledSubsection")}</span>
                {subsection.rqIds.length > 0 && (
                  <span className="outline-subsection-preview-rqs" aria-label={t("outline.assignedQuestions", { ids: subsection.rqIds.join(", ") })}>
                    {subsection.rqIds.join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}

        <details className="outline-section-edit">
          <summary>
            <span>{t("outline.editSection")}</span>
          </summary>
          <div className="outline-section-edit-content">
            <label className="outline-section-toggle">
              <input
                type="checkbox"
                checked={section.include}
                disabled={disabled || isRequired}
                onChange={(event) => onChange({ ...section, include: event.target.checked })}
                className="size-4 rounded border-input accent-primary disabled:opacity-50"
              />
              {t("outline.includeSection")}
            </label>

            <details className="outline-budget-details">
              <summary>{t("outline.wordBudget", { min: formatNumber(section.wordBudget.min), max: formatNumber(section.wordBudget.max) })}</summary>
              <div className="outline-budget-fields">
                <div className="space-y-1.5">
                  <label htmlFor={`${idPrefix}-min`} className="text-xs font-medium text-muted-foreground">{t("outline.minimumWords")}</label>
                  <Input id={`${idPrefix}-min`} type="number" min={1} max={1_000_000} step={1} disabled={disabled} value={section.wordBudget.min} onChange={(event) => updateBudget("min", event.target.value)} className="w-full disabled:opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${idPrefix}-max`} className="text-xs font-medium text-muted-foreground">{t("outline.maximumWords")}</label>
                  <Input id={`${idPrefix}-max`} type="number" min={1} max={1_000_000} step={1} disabled={disabled} value={section.wordBudget.max} onChange={(event) => updateBudget("max", event.target.value)} className="w-full disabled:opacity-60" />
                </div>
                <p className="outline-budget-hint">
                  {t("outline.profileBudgetHint", {
                    min: formatNumber(profileSection?.wordBudget.min ?? section.wordBudget.min),
                    max: formatNumber(profileSection?.wordBudget.max ?? section.wordBudget.max),
                  })}
                </p>
              </div>
            </details>

            <div className="outline-subsection-edit-list">
              <div className="outline-subsection-edit-heading">
                <h4>{t("outline.subsectionsTitle")}</h4>
                <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addSubsection}>
                  {t("outline.addSubsection")}
                </Button>
              </div>

              {section.subsections.length === 0 ? (
                <p className="outline-no-subsections">{t("outline.noSubsections")}</p>
              ) : (
                <ol className="outline-subsection-edit-items">
                  {section.subsections.map((subsection, index) => (
                    <GsapListItem key={subsection.id} delay={index * 0.025}>
                      <div className="outline-subsection-editor">
                        <div className="outline-subsection-title-row">
                          <span className="outline-subsection-number" aria-hidden="true">{sectionIndex}.{index + 1}</span>
                          <div className="outline-subsection-title-field">
                            <label htmlFor={`${idPrefix}-title-${index}`} className="sr-only">{t("outline.subsectionTitle")}</label>
                            <Input id={`${idPrefix}-title-${index}`} value={subsection.title} maxLength={300} disabled={disabled} onChange={(event) => updateSubsection(index, (current) => ({ ...current, title: event.target.value }))} className="w-full disabled:opacity-60" />
                          </div>
                          <div className="outline-subsection-actions">
                            <Button type="button" size="sm" variant="outline" disabled={disabled || index === 0} aria-label={t("outline.moveUp")} onClick={() => moveSubsection(index, -1)}><ChevronUpIcon aria-hidden="true" /></Button>
                            <Button type="button" size="sm" variant="outline" disabled={disabled || index === section.subsections.length - 1} aria-label={t("outline.moveDown")} onClick={() => moveSubsection(index, 1)}><ChevronDownIcon aria-hidden="true" /></Button>
                            <Button type="button" size="sm" variant="outline" disabled={disabled} aria-label={t("outline.removeSubsection")} onClick={() => onRemoveSubsection(subsection.id)}><TrashIcon aria-hidden="true" /></Button>
                          </div>
                        </div>

                        {subsection.rqIds.length > 0 && <p className="outline-assigned-rqs">{t("outline.assignedQuestions", { ids: subsection.rqIds.join(", ") })}</p>}

                        <details className="outline-subsection-details">
                          <summary>{t("outline.subsectionPurpose")}</summary>
                          <div className="outline-subsection-purpose">
                            <textarea id={`${idPrefix}-purpose-${index}`} rows={2} maxLength={1000} disabled={disabled} value={subsection.purpose ?? ""} onChange={(event) => updateSubsection(index, (current) => ({ ...current, purpose: event.target.value.trim() ? event.target.value : null }))} placeholder={t("outline.subsectionPurposePlaceholder")} aria-label={t("outline.subsectionPurpose")} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
                          </div>
                        </details>

                        <details className="outline-claim-details">
                          <summary>{t("outline.claimsInSubsection", { count: subsection.claimIds.length })}</summary>
                          <div className="outline-claim-content">
                            <label htmlFor={`${idPrefix}-claim-search-${index}`} className="sr-only">{t("outline.searchClaims")}</label>
                            <Input id={`${idPrefix}-claim-search-${index}`} type="search" value={claimFilter} onChange={(event) => setClaimFilter(event.target.value)} disabled={disabled || claimOptions.length === 0} placeholder={t("outline.searchClaims")} className="w-full disabled:opacity-60" />
                            {claimOptions.length === 0 ? <p className="text-sm text-muted-foreground">{t("outline.noClaims")}</p> : filteredClaims.length === 0 ? <p className="text-sm text-muted-foreground">{t("outline.noMatchingClaims")}</p> : (
                              <ul className="max-h-48 space-y-1 overflow-y-auto">
                                {filteredClaims.map((claim, claimIndex) => {
                                  const checked = subsection.claimIds.includes(claim.id);
                                  const inputId = `${idPrefix}-claim-${index}-${claimIndex}`;
                                  return (
                                    <li key={claim.id}>
                                      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/70">
                                        <input id={inputId} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => updateSubsection(index, (current) => ({ ...current, claimIds: event.target.checked ? [...current.claimIds.filter((id) => id !== claim.id), claim.id] : current.claimIds.filter((id) => id !== claim.id) }))} className="mt-0.5 size-4 shrink-0 accent-primary" />
                                        <span className="break-words text-foreground">{claim.label}</span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </details>
                      </div>
                    </GsapListItem>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
