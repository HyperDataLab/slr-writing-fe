import { useTranslation } from "react-i18next";
import type { BlueprintIssue } from "@/features/outline/model/outline.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionListItem } from "@/shared/ui/motion";

export function OutlineIssuesPanel({ issues, approvable }: { issues: BlueprintIssue[]; approvable: boolean }) {
  const { t } = useTranslation();
  const blockingCount = issues.filter((issue) => issue.severity === "blocking").length;
  const warningCount = issues.length - blockingCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("outline.issuesTitle")}</CardTitle>
          <Badge variant={approvable ? "default" : "outline"} className={!approvable ? "border-destructive/40 bg-destructive/5 text-destructive" : undefined}>
            {t(approvable ? "outline.approvable" : "outline.blocked")}
          </Badge>
        </div>
        <CardDescription>{t("outline.issuesDescription", { blocking: blockingCount, warning: warningCount })}</CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">{t("outline.noIssues")}</p>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue, index) => (
              <MotionListItem key={`${issue.code}-${issue.ref ?? index}`} delay={index * 0.02}>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{issue.code}</p>
                    <Badge
                      variant="outline"
                      className={issue.severity === "blocking" ? "border-destructive/40 text-destructive" : undefined}
                    >
                      {t(`outline.severity.${issue.severity}`)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{issue.message}</p>
                  {issue.ref && <code className="mt-2 block break-all text-[11px] text-muted-foreground">{issue.ref}</code>}
                </div>
              </MotionListItem>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
