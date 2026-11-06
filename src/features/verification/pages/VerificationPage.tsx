import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { WorkflowPageShell } from "@/features/projects/components/WorkflowPageShell";
import { VerificationWorkspace } from "@/features/verification/components/VerificationWorkspace";

export function VerificationPage() {
  const { t } = useTranslation();

  return (
    <WorkflowPageShell
      title={t("verify.pageTitle")}
      description={t("verify.pageDescription")}
      emptyIcon={ShieldCheckIcon}
      selectProjectHint={t("verify.selectProjectHint")}
    >
      {(projectId, snapshot) => <VerificationWorkspace projectId={projectId} snapshot={snapshot} />}
    </WorkflowPageShell>
  );
}
