import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";

export type TaskCommentCreateResult =
  | {
      comment: TaskComment;
      status: "created";
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    };

export type TaskCommentsStore = {
  listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskComment[] | null>;
  createForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskCommentInput,
  ): Promise<TaskCommentCreateResult>;
};
