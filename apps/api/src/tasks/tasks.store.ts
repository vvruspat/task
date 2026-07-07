import type {
  CreateTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskAssigneeInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";

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

export type TaskUpdateStatusResult =
  | {
      status: "updated";
      task: TaskDetail;
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "invalid_status";
    };

export type TaskUpdateAssigneeResult =
  | {
      status: "updated";
      task: TaskDetail;
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "invalid_assignee";
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
  updateStatusForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskStatusInput,
  ): Promise<TaskUpdateStatusResult>;
  updateAssigneeForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskAssigneeInput,
  ): Promise<TaskUpdateAssigneeResult>;
};
