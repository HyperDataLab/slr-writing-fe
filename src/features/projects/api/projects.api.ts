import { apiRequest } from "@/shared/lib/api-client";
import type { CreateProjectInput, ProjectSummary } from "@/features/projects/model/project.types";

export function listProjects(): Promise<ProjectSummary[]> {
  return apiRequest<ProjectSummary[]>("/projects");
}

export function getProject(projectId: string): Promise<ProjectSummary> {
  return apiRequest<ProjectSummary>("/projects/" + encodeURIComponent(projectId));
}

export function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  return apiRequest<ProjectSummary>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

