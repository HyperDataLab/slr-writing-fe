import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import type { ParagraphPlanItem } from "@/features/paragraph-plans/model/paragraph-plan.types";
import { Badge } from "@/shared/ui/badge";

function rhetoricalMoveVariant(move: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (move === "compare_and_synthesize") return "success";
  if (move === "discuss_limitation") return "warning";
  if (move === "theme_overview" || move === "conclude_subtopic") return "secondary";
  return "default";
}

function claimStrengthVariant(strength: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (strength === "strong") return "success";
  if (strength === "qualified") return "warning";
  return "secondary";
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (status === "READY_TO_DRAFT") return "success";
  if (status === "DRAFT") return "secondary";
  return "warning";
}

export function ParagraphPlanCard({
  item,
  index,
  actions,
}: {
  item: ParagraphPlanItem;
  index: number;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <article className="paragraph-plan-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-muted-foreground">#{index + 1}</span>
            <h3 className="text-sm font-semibold text-foreground">{item.id}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("plans.card.section")}:{" "}
            <span className="font-medium text-foreground">{t(`plans.sectionName.${item.sectionKey}`, { defaultValue: item.sectionKey })}</span>
            <span className="font-mono"> · {item.subsectionId}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge variant={statusVariant(item.status)} className="text-[11px]">
            {t(`plans.status.${item.status}`)}
          </Badge>
          <Badge variant={claimStrengthVariant(item.claimStrength)} className="text-[11px]">
            {t(`plans.strength.${item.claimStrength}`)}
          </Badge>
          {actions}
        </div>
      </header>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1">{t("plans.card.rhetoricalMove")}</span>
          <Badge variant={rhetoricalMoveVariant(item.rhetoricalMove)} className="font-mono text-xs font-normal">
            {t(`plans.move.${item.rhetoricalMove}`)}
          </Badge>
          {item.conditionsRequired && (
            <Badge variant="outline" className="ml-1.5 text-[11px] font-normal">{t("plans.card.conditionsRequired")}</Badge>
          )}
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1">{t("plans.card.claimsAndSlots")}</span>
          <p className="text-xs font-mono bg-muted/50 p-2 rounded-md border-0 text-foreground break-all">
            {item.claimIds.length > 0 ? item.claimIds.join(", ") : t("plans.card.noClaim")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{item.sentenceSlots.map((slot) => t(`plans.slot.${slot}`)).join(" → ")}</p>
        </div>

        <div className="draft-plan-targets grid grid-cols-1 gap-2 pt-1 border-t border-border/40 text-xs sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t("plans.card.targetEvidence")} ({item.evidenceIds.length})</span>
            {item.evidenceIds.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.evidenceIds.map((ev) => (
                  <span key={ev} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] font-mono">
                    [{ev}]
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">{t("plans.card.noneAssigned")}</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block mb-1 font-medium">{t("plans.card.targetFindings")} ({item.findingIds.length})</span>
            {item.findingIds.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.findingIds.map((f) => (
                  <span key={f} className="bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded text-[11px] font-mono truncate max-w-[140px]" title={f}>
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">{t("plans.card.noneAssigned")}</span>
            )}
          </div>
        </div>
        {item.limitations.length > 0 && (
          <ul className="list-disc pl-4 text-[11px] text-warning space-y-0.5">
            {item.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

