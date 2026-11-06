export interface ProjectSummary {
  id: string;
  name: string;
  slrProjectId: string;
  ownerId?: string;
  createdAt?: string;
}

export interface CreateProjectInput {
  name: string;
  slrProjectId: string;
}

