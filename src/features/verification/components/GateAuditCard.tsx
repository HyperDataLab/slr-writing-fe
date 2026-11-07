import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { GateStatus, QualityGateResult, ReviewIssue } from "@/features/verification/model/verification.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const GATE_KEYS: Record<string, true> = { G1: true, G2: true, G3: true, G4: true, G5: true, G6: true, G7: true };

function statusBadge(status: GateStatus, t: TFunction) {
  switch (status) {
    case "PASS":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircleIcon className="size-3.5" /> {t("verify.gateStatus.PASS")}
        </Badge>
      );
    case "WARNING":
    case "NEEDS_REVIEW":
      return (
        <Badge variant="warning" className="gap-1">
          <ExclamationTriangleIcon className="size-3.5" /> {t(`verify.gateStatus.${status}`)}
        </Badge>
      );
    case "FAIL":
      return (
        <Badge variant="destructive" className="gap-1">
          <ExclamationCircleIcon className="size-3.5" /> {t("verify.gateStatus.FAIL")}
        </Badge>
      );
    case "NOT_RUN":
      // NOT_RUN is never a pass: keep it visibly distinct from PASS.
      return (
        <Badge variant="outline" className="gap-1 border-dashed">
          {t("verify.gateStatus.NOT_RUN")}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{t(`verify.gateStatus.${status}`)}</Badge>;
  }
}

export function GateAuditCard({ gate, issues }: { gate: QualityGateResult; issues: ReviewIssue[] }) {
  const { t } = useTranslation();
  const hasMeta = gate.gateId in GATE_KEYS;

  return (
    <Card className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">
              {gate.gateId}
            </span>
            <CardTitle className="text-base font-semibold">{hasMeta ? t(`verify.gate.${gate.gateId}.title`) : gate.name}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasMeta ? t(`verify.gate.${gate.gateId}.subtitle`) : t("verify.gate.auditCheck")}
          </p>
        </div>
        <div>{statusBadge(gate.status, t)}</div>
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
            <span className="font-medium text-foreground block">{t("verify.issues")} ({issues.length}):</span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2 rounded border text-[11px] space-y-0.5 ${
                    issue.severity === "BLOCKING"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-warning-soft border-warning-border text-warning"
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
                      {t(`verify.severity.${issue.severity}`)}
                    </Badge>
                  </div>
                  <p>{issue.message}</p>
                  {issue.evidenceExcerpt && <p className="text-[10px] italic opacity-80">&ldquo;{issue.evidenceExcerpt}&rdquo;</p>}
                  {issue.suggestedRemedy && <p className="text-[10px] opacity-80">{t("verify.remedy")}: {issue.suggestedRemedy}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
