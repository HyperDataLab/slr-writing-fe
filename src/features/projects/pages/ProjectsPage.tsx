import { useEffect, useState, type FormEvent } from "react";
import { FolderIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ProjectEmptyState } from "@/features/projects/components/ProjectEmptyState";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { createProjectSchema } from "@/features/projects/model/project.schema";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionListItem, MotionReveal } from "@/shared/ui/motion";

export function ProjectsPage() {
  const { t } = useTranslation();
  const { projects, isLoading, isCreating, error, createError, load, create } = useProjects();
  const [name, setName] = useState("");
  const [slrProjectId, setSlrProjectId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const parsed = createProjectSchema(t).safeParse({ name, slrProjectId });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? t("projects.validation.invalid"));
      return;
    }

    const project = await create(parsed.data);
    if (project) {
      setName("");
      setSlrProjectId("");
    }
  }

  return (
    <div className="space-y-6">
      <MotionReveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("projects.sectionLabel")}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("projects.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("projects.description")}
            </p>
          </div>
          <Link
            to="/snapshots"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("projects.snapshotWorkflow")}
            <FolderIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </MotionReveal>

      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
        <MotionReveal>
        <Card>
          <CardHeader>
            <CardTitle>{t("projects.createTitle")}</CardTitle>
            <CardDescription>{t("projects.createDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-sm font-medium text-foreground">
                  {t("projects.nameLabel")}
                </label>
                <input
                  id="project-name"
                  autoComplete="organization"
                  maxLength={200}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/40"
                  placeholder={t("projects.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="slr-project-id" className="text-sm font-medium text-foreground">
                  {t("projects.slrIdLabel")}
                </label>
                <input
                  id="slr-project-id"
                  autoComplete="off"
                  maxLength={200}
                  required
                  value={slrProjectId}
                  onChange={(event) => setSlrProjectId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/40"
                  placeholder={t("projects.slrIdPlaceholder")}
                />
              </div>
              {(validationError || createError) && (
                <p role="alert" className="text-sm text-destructive">
                  {validationError ?? createError}
                </p>
              )}
              <Button type="submit" disabled={isCreating}>
                {t(isCreating ? "projects.creating" : "projects.createAction")}
              </Button>
            </form>
          </CardContent>
        </Card>
        </MotionReveal>

        <MotionReveal delay={0.06} effect="fade">
        <Card>
          <CardHeader>
            <CardTitle>{t("projects.listTitle")}</CardTitle>
            <CardDescription>{t("projects.listDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p role="status" className="py-8 text-center text-sm text-muted-foreground">
                {t("projects.loading")}
              </p>
            ) : error ? (
              <div className="space-y-3 py-5 text-center">
                <p role="alert" className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <ProjectEmptyState />
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((project, index) => (
                  <MotionListItem key={project.id} delay={index * 0.035} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t("projects.linkedSlrProject", { id: project.slrProjectId })}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/snapshots?projectId=${encodeURIComponent(project.id)}`}>
                        {t("projects.openSnapshots")}
                        <FolderIcon aria-hidden="true" />
                      </Link>
                    </Button>
                  </MotionListItem>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        </MotionReveal>
      </div>
    </div>
  );
}

