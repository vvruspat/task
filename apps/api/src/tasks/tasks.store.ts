import type { ParsedIssueIdentifier } from "./issue-identifier.js";
import type {
  AddTaskSubtasksInput,
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTaskTableInput,
  MoveTaskInput,
  TaskDetail,
  TaskSummary,
  TaskTablePage,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
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
    }
  | {
      status: "invalid_assignee";
    }
  | {
      status: "invalid_status";
    };

export type TaskAddSubtasksResult =
  | {
      status: "created";
      tasks: TaskDetail[];
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
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

export type TaskUpdateResult =
  | {
      status: "updated";
      task: TaskDetail;
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    };

export type TaskMoveResult =
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
      status: "invalid_parent_task";
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

export type TaskUpdateDueDateResult =
  | {
      status: "updated";
      task: TaskDetail;
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    };

export type TaskArchiveResult =
  | {
      status: "archived";
      task: TaskDetail;
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    };

export type TaskBulkUpdateResult =
  | { status: "updated"; tasks: TaskDetail[] }
  | { status: "project_not_found" }
  | { status: "forbidden" }
  | { status: "invalid_task" }
  | { status: "invalid_status" }
  | { status: "invalid_assignee" };

export type TaskReadStore = {
  getByIdForWorkspace?(
    workspaceId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetail | null>;
  getByIdentifierForWorkspace(
    workspaceId: string,
    identifier: ParsedIssueIdentifier,
    userId: string,
  ): Promise<TaskDetail | null>;
  listActiveForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskSummary[] | null>;
  listTableForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: ListTaskTableInput,
  ): Promise<TaskTablePage | null>;
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
  addSubtasksForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: AddTaskSubtasksInput,
  ): Promise<TaskAddSubtasksResult>;
  updateForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ): Promise<TaskUpdateResult>;
  moveForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: MoveTaskInput,
  ): Promise<TaskMoveResult>;
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
  updateDueDateForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskDueDateInput,
  ): Promise<TaskUpdateDueDateResult>;
  archiveForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskArchiveResult>;
  bulkUpdateForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: BulkUpdateTasksInput,
  ): Promise<TaskBulkUpdateResult>;
};
