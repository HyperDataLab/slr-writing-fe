import { FolderPlusIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";

export function ProjectEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center sm:py-16">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <FolderPlusIcon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-foreground">{t("projects.emptyTitle")}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {t("projects.emptyDescription")}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">
          {t("projects.learnWorkflow")}
          <span aria-hidden="true">→</span>
        </Link>
      </Button>
    </div>
  );
}

