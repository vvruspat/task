import type { TaskActivityEvent } from "./activity.contracts.js";

export type TaskActivityStore = {
  listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskActivityEvent[] | null>;
};
