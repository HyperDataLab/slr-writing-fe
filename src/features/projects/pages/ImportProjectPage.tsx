import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { createProjectSchema } from "@/features/projects/model/project.schema";
import { useSnapshotImport } from "@/features/snapshots/hooks/use-snapshot-import";
import { ReadinessSummary } from "@/features/snapshots/components/ReadinessSummary";
import { GsapReveal } from "@/shared/ui/gsap-motion";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ARTIFACTS = [
  { id: "A1", required: true },
  { id: "A10", required: true },
  { id: "A2", required: false },
  { id: "A7", required: false },
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function formatFileSize(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportProjectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bundleRef = useRef<Record<string, unknown> | null>(null);
  const { projects, isLoading: projectsLoading, isCreating, error: projectsError, createError, load: loadProjects, create } = useProjects();
  const { isImporting, readiness, error: importError, importBundle, reset } = useSnapshotImport();
  const [projectsInitialized, setProjectsInitialized] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bundleProjectId, setBundleProjectId] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isPreparingProject, setIsPreparingProject] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let current = true;
    void loadProjects().finally(() => {
      if (current) setProjectsInitialized(true);
    });
    return () => { current = false; };
  }, [loadProjects]);

  const fileProjectName = selectedFile?.name.replace(/\.json$/i, "").trim().slice(0, 200) ?? "";
  const existingProject = projects.find((project) => project.slrProjectId === bundleProjectId);
  const isBusy = isReadingFile || isPreparingProject || isCreating || isImporting;

  async function readBundleFile(file: File | null) {
    setSelectedFile(file);
    setBundleProjectId("");
    setFileError(null);
    bundleRef.current = null;
    reset();

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setFileError(t("projectImport.invalidFileType"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(t("projectImport.fileTooLarge"));
      return;
    }

    setIsReadingFile(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const root = asRecord(parsed);
      const run = asRecord(root?.run);
      const corpus = asRecord(root?.corpus);
      const artifacts = asRecord(root?.artifacts);
      const runProjectId = run?.project_id;
      const corpusProjectId = corpus?.project_id;

      if (typeof run?.run_id !== "string" || !run.run_id.trim()
        || typeof runProjectId !== "string" || !runProjectId.trim()
        || typeof corpusProjectId !== "string" || !corpusProjectId.trim()
        || !artifacts) {
        setFileError(t("projectImport.invalidBundle"));
        return;
      }
      if (runProjectId !== corpusProjectId) {
        setFileError(t("projectImport.projectIdMismatch"));
        return;
      }

      const projectInput = createProjectSchema(t).safeParse({ name: file.name.replace(/\.json$/i, "").trim().slice(0, 200), slrProjectId: runProjectId });
      if (!projectInput.success) {
        setFileError(projectInput.error.issues[0]?.message ?? t("projectImport.invalidBundle"));
        return;
      }

      if (!root) {
        setFileError(t("projectImport.invalidBundle"));
        return;
      }
      bundleRef.current = root;
      setBundleProjectId(runProjectId);
    } catch {
      setFileError(t("projectImport.invalidJson"));
    } finally {
      setIsReadingFile(false);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setBundleProjectId("");
    setFileError(null);
    bundleRef.current = null;
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isBusy) return;
    void readBundleFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bundle = bundleRef.current;
    if (!selectedFile || !bundle || !bundleProjectId) {
      setFileError(t("projectImport.fileRequired"));
      return;
    }

    const parsedProject = createProjectSchema(t).safeParse({ name: fileProjectName, slrProjectId: bundleProjectId });
    if (!parsedProject.success) {
      setFileError(parsedProject.error.issues[0]?.message ?? t("projectImport.invalidBundle"));
      return;
    }

    setFileError(null);
    setIsPreparingProject(true);
    try {
      const project = existingProject ?? await create(parsedProject.data);
      if (!project) return;

      localStorage.setItem("slrw_selected_project_id", project.id);
      localStorage.removeItem("slrw_selected_snapshot_id");

      const result = await importBundle(project.id, bundle);
      if (!result) return;

      const next = new URLSearchParams({ projectId: project.id, snapshotId: result.snapshot.id });
      navigate("/snapshots?" + next.toString());
    } finally {
      setIsPreparingProject(false);
    }
  }

  const checklist = t("projectImport.checklist", { returnObjects: true }) as string[];
  const steps = t("projectImport.steps", { returnObjects: true }) as string[];

  return (
    <div className="space-y-7">
      <GsapReveal>
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
      </GsapReveal>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.8fr)]">
        <GsapReveal effect="fade">
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
              ) : (
                <form onSubmit={handleImport} className="space-y-5">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-2xl border border-dashed text-center transition-colors ${
                      isDragging ? "border-primary/50 bg-secondary/45" : "border-primary/25 bg-secondary/20"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      id={fileInputId}
                      type="file"
                      accept=".json,application/json"
                      aria-describedby={`${fileInputId}-help`}
                      className="peer sr-only"
                      disabled={isBusy}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        event.currentTarget.value = "";
                        void readBundleFile(file);
                      }}
                    />
                    <label
                      htmlFor={fileInputId}
                      className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl px-5 py-7 outline-none transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring sm:px-8 ${
                        isBusy ? "cursor-wait" : "hover:bg-background/60"
                      }`}
                    >
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                        <ArrowUpTrayIcon className="size-7" aria-hidden="true" />
                      </span>
                      <span className="mt-4 hidden text-base font-semibold text-foreground [@media(hover:hover)]:inline">
                        {isDragging ? t("projectImport.dropFileHere") : t("projectImport.dropzoneTitle")}
                      </span>
                      <span id={`${fileInputId}-help`} className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                        {t("projectImport.dropzoneDescription")}
                      </span>
                      <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground">
                        <DocumentTextIcon className="size-4" aria-hidden="true" />
                        {t("projectImport.chooseFile")}
                      </span>
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                        <DocumentTextIcon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={clearSelectedFile} aria-label={t("projectImport.removeFile")} disabled={isBusy}>
                        <XMarkIcon aria-hidden="true" />
                      </Button>
                    </div>
                  )}

                  {isReadingFile && <p role="status" className="text-sm text-muted-foreground">{t("projectImport.readingFile")}</p>}
                  {fileError && <p role="alert" className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">{fileError}</p>}
                  {createError && <p role="alert" className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">{createError}</p>}
                  {importError && <p role="alert" className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">{importError}</p>}

                  {bundleProjectId && !fileError && (
                    <div className="rounded-xl bg-muted/35 px-4 py-3 text-sm">
                      <p className="font-medium text-foreground">{t("projectImport.detectedProjectId", { id: bundleProjectId })}</p>
                      <p className="mt-1 text-muted-foreground">
                        {existingProject
                          ? t("projectImport.reuseProject", { name: existingProject.name })
                          : t("projectImport.createFromFile", { name: fileProjectName })}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5" aria-label={t("projectImport.artifactsLabel")}>
                      {ARTIFACTS.map((artifact) => (
                        <Badge key={artifact.id} variant="outline" className="font-mono">
                          {artifact.id}{artifact.required ? " · " + t("projectImport.required") : ""}
                        </Badge>
                      ))}
                    </div>
                    <Button type="submit" disabled={isBusy || !bundleProjectId || !bundleRef.current}>
                      <DocumentArrowDownIcon aria-hidden="true" />
                      {isBusy ? t("projectImport.processing") : t(existingProject ? "projectImport.importIntoProject" : "projectImport.importAndCreate")}
                    </Button>
                  </div>
                  {readiness && <ReadinessSummary report={readiness} />}
                </form>
              )}
            </CardContent>
          </Card>
        </GsapReveal>

        <GsapReveal delay={0.06} effect="fade">
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
        </GsapReveal>
      </div>

      <GsapReveal delay={0.1} effect="fade">
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
      </GsapReveal>
    </div>
  );
}
