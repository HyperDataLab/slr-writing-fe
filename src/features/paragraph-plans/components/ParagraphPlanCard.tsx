import type { ParagraphPlanItemView } from "@/features/paragraph-plans/model/paragraph-plan.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

function rhetoricalMoveVariant(move: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (move.includes("synthesize") || move.includes("comparison")) return "success";
  if (move.includes("limitation") || move.includes("implication")) return "warning";
  if (move.includes("hypothesis") || move.includes("prior_work")) return "secondary";
  return "default";
}

function claimStrengthVariant(strength: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (strength === "DEFINITIVE") return "success";
  if (strength === "PROBABILISTIC") return "secondary";
  return "warning";
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (status === "READY") return "success";
  if (status === "PLANNED") return "secondary";
  return "warning";
}

export function ParagraphPlanCard({ item, index }: { item: ParagraphPlanItemView; index: number }) {
  return (
    <Card className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-muted-foreground">#{index + 1}</span>
            <CardTitle className="text-base font-semibold">{item.paragraphKey}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Section: <span className="font-medium text-foreground">{item.sectionKey}</span></p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge variant={statusVariant(item.status)} className="text-[11px]">
            {item.status}
          </Badge>
          <Badge variant={claimStrengthVariant(item.claimStrength)} className="text-[11px]">
            {item.claimStrength}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1">Rhetorical Move</span>
          <Badge variant={rhetoricalMoveVariant(item.rhetoricalMove)} className="font-mono text-xs font-normal">
            {item.rhetoricalMove}
          </Badge>
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1">Claim Slot</span>
          <p className="text-xs font-mono bg-muted/50 p-2 rounded-md border border-border/50 text-foreground break-all">
            {item.claimSlot || "(No slot constraint)"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          <div>
            <span className="text-muted-foreground block mb-1 font-medium">Target Evidence ({item.targetEvidence.length})</span>
            {item.targetEvidence.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.targetEvidence.map((ev) => (
                  <span key={ev} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] font-mono">
                    {ev}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">None assigned</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block mb-1 font-medium">Target Findings ({item.targetFindings.length})</span>
            {item.targetFindings.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {item.targetFindings.map((f) => (
                  <span key={f} className="bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded text-[11px] font-mono truncate max-w-[140px]" title={f}>
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">None assigned</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

