import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { GsapReveal } from "@/shared/ui/motion";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <GsapReveal className="mx-auto max-w-xl">
      <Card>
        <CardContent className="px-6 py-12 text-center sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">404</p>
          <h2 className="mt-3 text-2xl font-semibold">{t("common.notFoundTitle")}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {t("common.notFoundDescription")}
          </p>
          <Button asChild className="mt-6">
            <Link to="/">{t("common.goToOverview")}</Link>
          </Button>
        </CardContent>
      </Card>
    </GsapReveal>
  );
}

