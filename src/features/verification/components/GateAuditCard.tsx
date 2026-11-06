import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { GateStatus, QualityGateResult, ReviewIssue } from "@/features/verification/model/verification.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const GATE_TITLES: Record<string, { title: string; subtitle: string }> = {
  G1: { title: "Citation Integrity", subtitle: "100% of references strictly map to valid SLR registry entities" },
  G2: { title: "Quote Fidelity", subtitle: "Verbatim quotes audited against cryptographic source hashes" },
  G3: { title: "PRISMA Flow Reconciliation", subtitle: "Reconciles flow of identification, screening, and inclusion" },
  G4: { title: "Ungrounded Numbers", subtitle: "Rejects any numerical claim not grounded in snapshot facts" },
  G5: { title: "Evidence Entailment", subtitle: "NLI entailment verification ensuring evidence supports drafted claims" },
  G6: { title: "Claim Strength & Hedging", subtitle: "Enforces scientific hedging rules and certainty bounds" },
  G7: { title: "RQ Coverage", subtitle: "Verifies all research questions are addressed in manuscript sections" },
};

function statusBadge(status: GateStatus) {
  switch (status) {
    case "PASS":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircleIcon className="size-3.5" /> PASS
        </Badge>
      );
    case "WARNING":
    case "NEEDS_REVIEW":
      return (
        <Badge variant="warning" className="gap-1">
          <ExclamationTriangleIcon className="size-3.5" /> {status.replace("_", " ")}
        </Badge>
      );
    case "FAIL":
      return (
        <Badge variant="destructive" className="gap-1">
          <ExclamationCircleIcon className="size-3.5" /> FAIL
        </Badge>
      );
    case "NOT_RUN":
      // NOT_RUN is never a pass: keep it visibly distinct from PASS.
      return (
        <Badge variant="outline" className="gap-1 border-dashed">
          NOT RUN
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status.replace("_", " ")}</Badge>;
  }
}

export function GateAuditCard({ gate, issues }: { gate: QualityGateResult; issues: ReviewIssue[] }) {
  const meta = GATE_TITLES[gate.gateId] || { title: gate.name, subtitle: "Audit Check" };

  return (
    <Card className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">
              {gate.gateId}
            </span>
            <CardTitle className="text-base font-semibold">{meta.title}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
        <div>{statusBadge(gate.status)}</div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <p className="bg-muted/40 p-2.5 rounded-md border border-border/50 text-foreground leading-relaxed">
          {gate.message}
        </p>

        {gate.details && Object.keys(gate.details).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            {Object.entries(gate.details).map(([k, v]) => (
              <span key={k} className="bg-muted px-2 py-0.5 rounded max-w-full break-all">
                {k}:{" "}
                <strong className="text-foreground">
                  {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}
                </strong>
              </span>
            ))}
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            <span className="font-medium text-foreground block">Issues ({issues.length}):</span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2 rounded border text-[11px] space-y-0.5 ${
                    issue.severity === "BLOCKING"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>
                      {issue.sectionKey} · {issue.target}
                    </span>
                    <Badge
                      variant={issue.severity === "BLOCKING" ? "destructive" : "warning"}
                      className="text-[10px] py-0 px-1.5"
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                  <p>{issue.message}</p>
                  {issue.evidenceExcerpt && <p className="text-[10px] italic opacity-80">&ldquo;{issue.evidenceExcerpt}&rdquo;</p>}
                  {issue.suggestedRemedy && <p className="text-[10px] opacity-80">Remedy: {issue.suggestedRemedy}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
