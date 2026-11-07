import { ListBulletIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { ParagraphPlansWorkspace } from "@/features/paragraph-plans/components/ParagraphPlansWorkspace";
import { WorkflowPageShell } from "@/features/projects/components/WorkflowPageShell";

export function ParagraphPlansPage() {
  const { t } = useTranslation();

  return (
    <WorkflowPageShell
      title={t("plans.pageTitle")}
      description={t("plans.pageDescription")}
      emptyIcon={ListBulletIcon}
      selectProjectHint={t("plans.selectProjectHint")}
    >
      {(projectId, snapshot) => <ParagraphPlansWorkspace projectId={projectId} snapshot={snapshot} />}
    </WorkflowPageShell>
  );
}
