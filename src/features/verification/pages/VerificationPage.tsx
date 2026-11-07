import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Navigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { WorkflowPageShell } from "@/features/projects/components/WorkflowPageShell";
import { VerificationWorkspace } from "@/features/verification/components/VerificationWorkspace";

export function VerificationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  if (searchParams.get("tab") === "manifest") {
    const params = new URLSearchParams(searchParams);
    return <Navigate to={"/evidence?" + params.toString()} replace />;
  }

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
