import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="px-6 py-12 text-center sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">404</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Không tìm thấy trang</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Đường dẫn này không tồn tại hoặc đã được thay đổi.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Về tổng quan</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

