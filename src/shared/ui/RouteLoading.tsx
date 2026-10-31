import { useTranslation } from "react-i18next";

export function RouteLoading() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
      {t("common.loading")}
    </div>
  );
}

