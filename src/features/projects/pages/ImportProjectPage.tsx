import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { createProjectSchema } from "@/features/projects/model/project.schema";
import { useSnapshotImport } from "@/features/snapshots/hooks/use-snapshot-import";
import { SlrRunPicker } from "@/features/snapshots/components/SlrRunPicker";
import { ReadinessSummary } from "@/features/snapshots/components/ReadinessSummary";
import { MotionReveal } from "@/shared/ui/motion";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

const ARTIFACTS = [
  { id: "A1", required: true },
  { id: "A10", required: true },
  { id: "A2", required: false },
  { id: "A7", required: false },
] as const;

export function ImportProjectPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedProjectId = searchParams.get("projectId")
    || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_project_id") : null)
    || "";
  const { projects, isLoading: projectsLoading, isCreating, error: projectsError, createError, load: loadProjects, create } = useProjects();
  const { isImporting, readiness, error: importError, importRun, reset } = useSnapshotImport();
  const [runId, setRunId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [projectsInitialized, setProjectsInitialized] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [slrProjectId, setSlrProjectId] = useState("");
  const [projectValidationError, setProjectValidationError] = useState<string | null>(null);
  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const newProjectMode = searchParams.get("newProject") === "1";

  useEffect(() => {
    let current = true;
    void loadProjects().finally(() => {
      if (current) setProjectsInitialized(true);
    });
    return () => { current = false; };
  }, [loadProjects]);

  useEffect(() => {
    setRunId("");
    setRefreshKey((current) => current + 1);
    reset();
  }, [selectedProjectId, reset]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectValidationError(null);
    const parsed = createProjectSchema(t).safeParse({ name: projectName, slrProjectId });
    if (!parsed.success) {
      setProjectValidationError(parsed.error.issues[0]?.message ?? t("projects.validation.invalid"));
      return;
    }

    const project = await create(parsed.data);
    if (!project) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("slrw_selected_project_id", project.id);
      localStorage.removeItem("slrw_selected_snapshot_id");
    }
    navigate(`/import?projectId=${encodeURIComponent(project.id)}`, { replace: true });
  }
  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || !runId.trim()) return;

    const imported = await importRun(selectedProjectId, runId);
    if (!imported) return;

    const next = new URLSearchParams();
    next.set("projectId", selectedProjectId);
    next.set("snapshotId", imported.snapshot.id);
    navigate("/snapshots?" + next.toString());
  }

  const projectLinkForm = (
    <form onSubmit={handleCreateProject} className="mt-6 w-full max-w-xl space-y-4 text-left">
      <div className="space-y-2">
        <label htmlFor="import-project-name" className="text-sm font-medium text-foreground">
          {t("projects.nameLabel")}
        </label>
        <Input
          id="import-project-name"
          autoComplete="organization"
          maxLength={200}
          required
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="w-full"
          placeholder={t("projects.namePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="import-slr-project-id" className="text-sm font-medium text-foreground">
          {t("projects.slrIdLabel")}
        </label>
        <Input
          id="import-slr-project-id"
          autoComplete="off"
          maxLength={200}
          required
          value={slrProjectId}
          onChange={(event) => setSlrProjectId(event.target.value)}
          className="w-full"
          placeholder={t("projects.slrIdPlaceholder")}
        />
      </div>
      {(projectValidationError || createError) && (
        <p role="alert" className="text-sm text-destructive">{projectValidationError ?? createError}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {activeProject && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/import?projectId=${encodeURIComponent(activeProject.id)}`, { replace: true })}
          >
            {t("projectImport.cancelProjectLink")}
          </Button>
        )}
        <Button type="submit" disabled={isCreating}>
          <PlusIcon aria-hidden="true" />
          {t(isCreating ? "projects.creating" : "projectImport.createAndContinue")}
        </Button>
      </div>
    </form>
  );
  const checklist = t("projectImport.checklist", { returnObjects: true }) as string[];
  const steps = t("projectImport.steps", { returnObjects: true }) as string[];

  return (
    <div className="space-y-7">
      <MotionReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("projectImport.eyebrow")}</p>
            <h1 className="slrw-page-title mt-1">{t("projectImport.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("projectImport.description")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeftIcon aria-hidden="true" />
              {t("projectImport.backOverview")}
            </Link>
          </Button>
        </div>
      </MotionReveal>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.8fr)]">
        <MotionReveal effect="fade">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              {(!projectsInitialized || projectsLoading) ? (
                <div role="status" className="flex min-h-[23rem] items-center justify-center text-sm text-muted-foreground">
                  {t("projectImport.loading")}
                </div>
              ) : projectsError ? (
                <div className="flex min-h-[23rem] flex-col items-center justify-center gap-4 text-center">
                  <p role="alert" className="max-w-lg text-sm text-destructive">{projectsError}</p>
                  <Button variant="outline" onClick={() => void loadProjects()}>{t("common.retry")}</Button>
                </div>
              ) : (projects.length === 0 || newProjectMode) ? (
                <div className="flex min-h-[23rem] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-secondary/25 px-6 py-8 text-center">
                  <FolderOpenIcon className="size-10 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{t("projectImport.createProjectTitle")}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("projectImport.createProjectDescription")}</p>
                  {projectLinkForm}
                </div>
              ) : !activeProject ? (
                <div className="flex min-h-[23rem] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-secondary/25 px-6 py-10 text-center">
                  <FolderOpenIcon className="size-10 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{t("projectImport.chooseProjectTitle")}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("projectImport.chooseProjectBody")}</p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link to="/import?newProject=1">{t("projectImport.linkAnother")}<ArrowRightIcon aria-hidden="true" /></Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleImport} className="space-y-5">
                  <div className="flex min-h-[23rem] flex-col rounded-2xl border border-dashed border-primary/25 bg-secondary/25 px-5 py-6 sm:px-8">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <ArrowUpTrayIcon className="size-7" aria-hidden="true" />
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-lg font-semibold">{t("projectImport.runTitle")}</h3>
                      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                        {t("projectImport.runDescription", { project: activeProject.name })}
                      </p>
                    </div>
                    <div className="mt-5 rounded-xl border border-border bg-card p-4">
                      <SlrRunPicker
                        key={selectedProjectId}
                        projectId={selectedProjectId}
                        selectedRunId={runId}
                        onSelect={setRunId}
                        refreshKey={refreshKey}
                      />
                    </div>
                    <div className="mt-4">
                      <label htmlFor="import-run-id" className="text-sm font-medium text-foreground">
                        {t("projectImport.manualRunLabel")}
                      </label>
                      <Input
                        id="import-run-id"
                        autoComplete="off"
                        maxLength={128}
                        required
                        value={runId}
                        onChange={(event) => setRunId(event.target.value)}
                        placeholder={t("projectImport.manualRunPlaceholder")}
                        className="mt-2 w-full"
                      />
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                        {t("projectImport.manualRunHelp")}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5" aria-label={t("projectImport.artifactsLabel")}>
                        {ARTIFACTS.map((artifact) => (
                          <Badge key={artifact.id} variant="outline" className="font-mono">
                            {artifact.id}{artifact.required ? " · " + t("projectImport.required") : ""}
                          </Badge>
                        ))}
                      </div>
                      <Button type="submit" disabled={isImporting || !runId.trim()}>
                        <DocumentArrowDownIcon aria-hidden="true" />
                        {t(isImporting ? "projectImport.importing" : "projectImport.importAction")}
                      </Button>
                    </div>
                  </div>
                  {importError && (
                    <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {importError}
                    </p>
                  )}
                  {readiness && <ReadinessSummary report={readiness} />}
                </form>
              )}
            </CardContent>
          </Card>
        </MotionReveal>

        <MotionReveal delay={0.06} effect="fade">
          <Card>
            <CardHeader>
              <CardTitle>{t("projectImport.payloadTitle")}</CardTitle>
              <CardDescription>{t("projectImport.payloadDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="my-6 border-t border-border" />
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <ExclamationTriangleIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{t("projectImport.trustTitle")}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("projectImport.trustDescription")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionReveal>
      </div>

      <MotionReveal delay={0.1} effect="fade">
        <Card>
          <CardHeader>
            <CardTitle>{t("projectImport.workflowTitle")}</CardTitle>
            <CardDescription>{t("projectImport.workflowDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-lg bg-muted/35 p-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-6 text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </MotionReveal>
    </div>
  );
}
