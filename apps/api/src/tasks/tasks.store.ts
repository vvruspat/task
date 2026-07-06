import type { CreateTaskInput, TaskDetail, TaskSummary } from "./tasks.contracts.js";

export type TaskCreateResult =
  | {
      status: "created";
      task: TaskDetail;
    }
  | {
      status: "project_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "invalid_parent_task";
    };

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
  createForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ): Promise<TaskCreateResult>;
};
