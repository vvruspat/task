import type { ProjectDetail, ProjectSummary } from "./projects.contracts.js";

export type ProjectReadStore = {
  listActiveForWorkspace(workspaceId: string, userId: string): Promise<ProjectSummary[] | null>;
  getForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetail | null>;
};
