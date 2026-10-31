import { ArrowRightIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const readinessRequirements = [
  "Research questions and included studies are present",
  "Required A1 and A10 artifacts are approved",
  "Run and corpus hashes agree",
  "PRISMA counts and study references are checked",
];

export function SnapshotReadinessPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Step 01</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Import & readiness</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Import a reviewed SLR run as an immutable snapshot. Readiness issues are shown before any
          writing step can continue.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <Card className="flex min-h-[20rem] items-center justify-center">
          <CardContent className="mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <DocumentArrowUpIcon className="size-7" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">Chọn project để bắt đầu</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Snapshot luôn thuộc về một writing project. Chọn project trước, sau đó nhập run đã
              được duyệt từ SLR.
            </p>
            <Button asChild className="mt-6">
              <Link to="/projects">
                Mở danh sách project
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness checks</CardTitle>
            <CardDescription>
              Các kiểm tra nền trước khi snapshot được dùng để soạn thảo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {readinessRequirements.map((requirement, index) => (
                <li key={requirement} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-5 text-muted-foreground">{requirement}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-primary/15 bg-secondary/60 p-3.5">
              <p className="text-xs leading-5 text-muted-foreground">
                Thiếu dữ liệu sẽ được ghi là missing; lỗi chặn sẽ ngăn bước viết tiếp theo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

