import { CheckCircleIcon, ChevronDownIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import type { ReadinessReport } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapListItem } from "@/shared/ui/gsap-motion";

export function ReadinessSummary({
  report,
  variant = "card",
}: {
  report: ReadinessReport;
  variant?: "card" | "inline";
}) {
  const { t } = useTranslation();
  const isReady = report.status === "READY";
  const blockingCount = report.issues.filter((issue) => issue.severity === "blocking").length;
  const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;
  const counts = (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-foreground">
        {isReady ? (
          <CheckCircleIcon className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <ExclamationTriangleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        {t("snapshots.blockingIssue", { count: blockingCount })}
      </span>
      <span className="rounded-md bg-secondary px-2.5 py-1.5 text-muted-foreground">
        {t("snapshots.warning", { count: warningCount })}
      </span>
    </div>
  );
  const issues = report.issues.length > 0 && (
    <ul className={variant === "inline" ? "space-y-1.5" : "mt-5 divide-y divide-border rounded-lg border border-border"}>
      {report.issues.map((issue, index) => (
        <GsapListItem
          key={issue.code + "-" + index}
          delay={index * 0.035}
          className={variant === "inline" ? "flex items-start gap-3" : "flex items-start gap-3 px-4 py-3"}
        >
          <span
            className={
              issue.severity === "blocking"
                ? "mt-1 size-2 shrink-0 rounded-full bg-foreground"
                : "mt-1 size-2 shrink-0 rounded-full bg-muted-foreground"
            }
            aria-hidden="true"
          />
          <div className={variant === "inline" ? "flex min-w-0 flex-wrap items-baseline gap-x-2" : undefined}>
            <p className={variant === "inline" ? "text-xs font-semibold" : "text-sm font-medium"}>{issue.code}</p>
            {issue.message && (
              <p className={variant === "inline" ? "text-xs leading-5 text-muted-foreground" : "mt-1 text-sm leading-5 text-muted-foreground"}>{issue.message}</p>
            )}
          </div>
        </GsapListItem>
      ))}
    </ul>
  );
  const issueDetails = report.issues.length > 0 && (
    <details open={report.status === "BLOCKED"} className="group min-w-0 text-xs text-muted-foreground">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="rounded-md bg-secondary px-2 py-1 text-foreground">
          {t("snapshots.blockingIssue", { count: blockingCount })}
        </span>
        <span className="rounded-md bg-secondary px-2 py-1 text-muted-foreground">
          {t("snapshots.warning", { count: warningCount })}
        </span>
        <ChevronDownIcon className="size-3 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2">{issues}</div>
    </details>
  );

  if (variant === "inline") {
    return (
      <section aria-labelledby="snapshot-readiness-heading" className="space-y-2.5 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h3 id="snapshot-readiness-heading" className="text-sm font-semibold text-foreground">
            {t("snapshots.checksTitle")}
          </h3>
          {issueDetails || counts}
        </div>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{t("snapshots.reportTitle")}</CardTitle>
          <CardDescription>{t(isReady ? "snapshots.readyDescription" : "snapshots.blockedDescription")}</CardDescription>
        </div>
        <Badge variant={isReady ? "default" : "outline"}>
          {t(isReady ? "snapshots.ready" : "snapshots.blocked")}
        </Badge>
      </CardHeader>
      <CardContent>
        {counts}
        {issues}
      </CardContent>
    </Card>
  );
}

