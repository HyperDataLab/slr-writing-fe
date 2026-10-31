import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ReadinessReport } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function ReadinessSummary({ report }: { report: ReadinessReport }) {
  const isReady = report.status === "READY";
  const blockingCount = report.issues.filter((issue) => issue.severity === "blocking").length;
  const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Readiness report</CardTitle>
          <CardDescription>
            {isReady
              ? "Snapshot đã vượt qua các điều kiện chặn hiện tại."
              : "Cần xử lý các lỗi chặn trước khi tiếp tục."}
          </CardDescription>
        </div>
        <Badge variant={isReady ? "default" : "outline"}>
          {isReady ? "READY" : "BLOCKED"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-foreground">
            {isReady ? (
              <CheckCircleIcon className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            {blockingCount} lỗi chặn
          </span>
          <span className="rounded-md bg-secondary px-2.5 py-1.5 text-muted-foreground">
            {warningCount} cảnh báo
          </span>
        </div>
        {report.issues.length > 0 && (
          <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
            {report.issues.map((issue, index) => (
              <li key={issue.code + "-" + index} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={
                    issue.severity === "blocking"
                      ? "mt-1 size-2 shrink-0 rounded-full bg-foreground"
                      : "mt-1 size-2 shrink-0 rounded-full bg-muted-foreground"
                  }
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">{issue.code}</p>
                  {issue.message && (
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{issue.message}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

