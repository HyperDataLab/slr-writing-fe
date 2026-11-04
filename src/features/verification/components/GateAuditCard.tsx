import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { GateResultView, GateStatus } from "@/features/verification/model/verification.types";
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
    case "WARN":
      return (
        <Badge variant="warning" className="gap-1">
          <ExclamationTriangleIcon className="size-3.5" /> WARN
        </Badge>
      );
    case "FAIL":
      return (
        <Badge variant="destructive" className="gap-1">
          <ExclamationCircleIcon className="size-3.5" /> FAIL
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function GateAuditCard({ gate }: { gate: GateResultView }) {
  const meta = GATE_TITLES[gate.gateId] || { title: `Gate ${gate.gateId}`, subtitle: "Audit Check" };
  const hasIssues = gate.issues && gate.issues.length > 0;

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
        {/* Message */}
        <p className="bg-muted/40 p-2.5 rounded-md border border-border/50 text-foreground leading-relaxed">
          {gate.message}
        </p>

        {/* Metrics */}
        {gate.metrics && Object.keys(gate.metrics).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            {Object.entries(gate.metrics).map(([k, v]) => (
              <span key={k} className="bg-muted px-2 py-0.5 rounded">
                {k}: <strong className="text-foreground">{String(v)}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Issues List */}
        {hasIssues && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            <span className="font-medium text-destructive block">Issues Detected ({gate.issues.length}):</span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {gate.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{issue.code}</span>
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                      {issue.severity}
                    </Badge>
                  </div>
                  <p>{issue.message}</p>
                  {issue.location && <p className="text-[10px] font-mono opacity-80">Location: {issue.location}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
