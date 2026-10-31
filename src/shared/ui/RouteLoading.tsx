export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
      Đang mở nội dung…
    </div>
  );
}

