import type { ProjectMatrix } from "./project-matrix.contracts.js";

export type ProjectMatrixReadStore = {
  getForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectMatrix | null>;
};
