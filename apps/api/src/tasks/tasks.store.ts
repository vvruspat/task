import type { TaskDetail, TaskSummary } from "./tasks.contracts.js";

export type TaskReadStore = {
  listActiveForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskSummary[] | null>;
  getForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetail | null>;
};
