import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/lib/api-client";
import { listProjects } from "@/features/projects/api/projects.api";
import type { ProjectSummary } from "@/features/projects/model/project.types";

export interface ProjectsState {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
}

export function useProjects() {
  const { t } = useTranslation();
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    isLoading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const projects = await listProjects();
      setState({ projects, isLoading: false, error: null });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("projects.loadError");
      setState((current) => ({ ...current, isLoading: false, error: message }));
    }
  }, [t]);

  return { ...state, load };
}

