import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { ExportWorkspace } from "@/features/export/components/ExportWorkspace";
import { WorkflowPageShell } from "@/features/projects/components/WorkflowPageShell";

export function ExportPage() {
  const { t } = useTranslation();

  return (
    <WorkflowPageShell
      title={t("exportPkg.pageTitle")}
      description={t("exportPkg.pageDescription")}
      emptyIcon={ArrowDownTrayIcon}
      selectProjectHint={t("exportPkg.selectProjectHint")}
    >
      {(projectId, snapshot) => <ExportWorkspace projectId={projectId} snapshot={snapshot} />}
    </WorkflowPageShell>
  );
}
