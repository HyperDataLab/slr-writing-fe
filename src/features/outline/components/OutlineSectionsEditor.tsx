import { useTranslation } from "react-i18next";
import type { JournalProfile, JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import type { BlueprintContent, BlueprintSection } from "@/features/outline/model/outline.types";
import type { ClaimOption } from "@/features/outline/utils/outline.helpers";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapReveal } from "@/shared/ui/gsap-motion";
import { OutlineSectionEditor } from "@/features/outline/components/OutlineSectionEditor";

function replaceSection(content: BlueprintContent, section: BlueprintSection): BlueprintContent {
  return {
    ...content,
    sections: content.sections.some((item) => item.key === section.key)
      ? content.sections.map((item) => item.key === section.key ? section : item)
      : [...content.sections, section],
  };
}

function removeCoverageIds(content: BlueprintContent, ids: string[]): BlueprintContent {
  const removed = new Set(ids);
  return {
    ...content,
    coverage: content.coverage.map((entry) => ({
      ...entry,
      subsectionIds: entry.subsectionIds.filter((id) => !removed.has(id)),
    })),
  };
}

export function OutlineSectionsEditor({
  content,
  profile,
  claimOptions,
  disabled,
  locale,
  onChange,
}: {
  content: BlueprintContent;
  profile?: JournalProfile;
  claimOptions: ClaimOption[];
  disabled: boolean;
  locale: string;
  onChange: (content: BlueprintContent) => void;
}) {
  const { t } = useTranslation();
  const profileSections = [...(profile?.sections ?? [])].sort((left, right) => left.order - right.order);
  const orderedBlueprintSections = profileSections
    .map((profileSection) => ({ profileSection, section: content.sections.find((item) => item.key === profileSection.key) }));
  const unknownSections = content.sections.filter((section) => !profileSections.some((item) => item.key === section.key));

  function handleSectionChange(section: BlueprintSection) {
    const previous = content.sections.find((item) => item.key === section.key);
    const next = replaceSection(content, section);
    if (previous?.include && !section.include) {
      onChange(removeCoverageIds(next, previous.subsections.map((subsection) => subsection.id)));
      return;
    }
    onChange(next);
  }

  function removeSubsection(sectionKey: string, subsectionId: string) {
    const section = content.sections.find((item) => item.key === sectionKey);
    if (!section) return;
    const next = replaceSection(content, {
      ...section,
      subsections: section.subsections.filter((subsection) => subsection.id !== subsectionId),
    });
    onChange(removeCoverageIds(next, [subsectionId]));
  }

  function restoreSection(profileSection: JournalProfileSection) {
    onChange(replaceSection(content, {
      key: profileSection.key,
      include: true,
      wordBudget: { min: profileSection.wordBudget.min, max: profileSection.wordBudget.max },
      subsections: [],
    }));
  }

  function removeUnknownSection(sectionKey: string) {
    const section = content.sections.find((item) => item.key === sectionKey);
    if (!section) return;
    const next = { ...content, sections: content.sections.filter((item) => item.key !== sectionKey) };
    onChange(removeCoverageIds(next, section.subsections.map((subsection) => subsection.id)));
  }

  return (
    <Card className="outline-sections-card">
      <CardHeader className="outline-sections-header">
        <div>
          <CardTitle>{t("outline.sectionsTitle")}</CardTitle>
          <CardDescription>{t("outline.sectionsDescription")}</CardDescription>
        </div>
        <span className="outline-sections-count">{t("outline.sectionCount", { count: profileSections.length + unknownSections.length })}</span>
      </CardHeader>
      <CardContent className="outline-sections-list">
        {orderedBlueprintSections.map(({ profileSection, section }, index) => section ? (
          <GsapReveal key={section.key} delay={index * 0.035} effect="fade">
            <OutlineSectionEditor
              section={section}
              sectionIndex={index}
              profileSection={profileSection}
              claimOptions={claimOptions}
              disabled={disabled}
              locale={locale}
              onChange={handleSectionChange}
              onRemoveSubsection={(subsectionId) => removeSubsection(section.key, subsectionId)}
            />
          </GsapReveal>
        ) : (
          <GsapReveal key={profileSection.key} delay={index * 0.035} effect="fade">
            <Card className="outline-section-card outline-missing-section">
              <CardHeader className="outline-section-card-header">
                <div className="outline-section-title-group">
                  <span className="outline-section-number" aria-hidden="true">{String(index).padStart(2, "0")}</span>
                  <div>
                    <CardTitle>{t(`journalProfiles.sectionTitles.${profileSection.key}`, { defaultValue: profileSection.title })}</CardTitle>
                    <CardDescription>{t("outline.missingSectionDescription")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => restoreSection(profileSection)}>
                  {t("outline.restoreSection")}
                </Button>
              </CardContent>
            </Card>
          </GsapReveal>
        ))}

        {unknownSections.map((section, index) => (
          <GsapReveal key={section.key} delay={(orderedBlueprintSections.length + index) * 0.035} effect="fade">
            <div className="outline-unknown-section">
              <OutlineSectionEditor
                section={section}
                sectionIndex={orderedBlueprintSections.length + index}
                claimOptions={claimOptions}
                disabled={disabled}
                locale={locale}
                onChange={handleSectionChange}
                onRemoveSubsection={(subsectionId) => removeSubsection(section.key, subsectionId)}
              />
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => removeUnknownSection(section.key)}>
                {t("outline.removeUnknownSection")}: {section.key}
              </Button>
            </div>
          </GsapReveal>
        ))}
      </CardContent>
    </Card>
  );
}
