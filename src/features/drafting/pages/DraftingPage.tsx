import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { DraftingWorkspace } from "@/features/drafting/components/DraftingWorkspace";
import { WorkflowPageShell } from "@/features/projects/components/WorkflowPageShell";

export function DraftingPage() {
  const { t } = useTranslation();

  return (
    <WorkflowPageShell
      title={t("draft.pageTitle")}
      description={t("draft.pageDescription")}
      emptyIcon={DocumentTextIcon}
      selectProjectHint={t("draft.selectProjectHint")}
    >
      {(projectId, snapshot) => <DraftingWorkspace projectId={projectId} snapshot={snapshot} />}
    </WorkflowPageShell>
  );
}
