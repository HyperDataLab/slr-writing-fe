import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/lib/api-client";
import { createProject as createProjectRequest, listProjects } from "@/features/projects/api/projects.api";
import type { CreateProjectInput, ProjectSummary } from "@/features/projects/model/project.types";

export interface ProjectsState {
  projects: ProjectSummary[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  createError: string | null;
}

export function useProjects() {
  const { t } = useTranslation();
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    isLoading: false,
    isCreating: false,
    error: null,
    createError: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const projects = await listProjects();
      setState((current) => ({ ...current, projects, isLoading: false, error: null }));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("projects.loadError");
      setState((current) => ({ ...current, isLoading: false, error: message }));
    }
  }, [t]);

  const create = useCallback(async (input: CreateProjectInput): Promise<ProjectSummary | null> => {
    setState((current) => ({ ...current, isCreating: true, createError: null }));

    try {
      const project = await createProjectRequest(input);
      setState((current) => ({
        ...current,
        projects: [project, ...current.projects.filter((item) => item.id !== project.id)],
        isCreating: false,
        createError: null,
      }));
      return project;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("projects.createError");
      setState((current) => ({ ...current, isCreating: false, createError: message }));
      return null;
    }
  }, [t]);

  return { ...state, load, create };
}

