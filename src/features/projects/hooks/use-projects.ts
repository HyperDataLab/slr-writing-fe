import { useCallback, useState } from "react";
import { ApiError } from "@/shared/lib/api-client";
import { listProjects } from "@/features/projects/api/projects.api";
import type { ProjectSummary } from "@/features/projects/model/project.types";

export interface ProjectsState {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
}

export function useProjects() {
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
          : "Không thể tải danh sách project. Vui lòng thử lại.";
      setState((current) => ({ ...current, isLoading: false, error: message }));
    }
  }, []);

  return { ...state, load };
}

