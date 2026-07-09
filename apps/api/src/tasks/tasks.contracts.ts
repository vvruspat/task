export type TaskSummary = {
  id: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeUserId: string | null;
  createdByUserId: string;
  position: string;
  dueAt: Date | null;
  sourceSkillId: string | null;
  sourceSkillVersionId: string | null;
  metadata: Record<string, unknown>;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskDetail = TaskSummary;

export type CreateTaskInput = {
  title: string;
  parentTaskId?: string | null;
  description?: string | null;
  position?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type AddTaskSubtaskInput = {
  title: string;
  description?: string | null;
  position?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type AddTaskSubtasksInput = {
  subtasks: AddTaskSubtaskInput[];
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export type MoveTaskInput = {
  parentTaskId: string | null;
  position: string;
};

export type UpdateTaskStatusInput = {
  statusId: string | null;
};

export type UpdateTaskAssigneeInput = {
  assigneeUserId: string | null;
};

export type UpdateTaskDueDateInput = {
  dueAt: string | null;
};

export const taskTableSortFields = ["title", "status", "assignee", "dueAt", "createdAt", "updatedAt"] as const;
export type TaskTableSortField = (typeof taskTableSortFields)[number];
export type TaskTableSortDirection = "asc" | "desc";

export type ListTaskTableInput = {
  search?: string;
  statusId?: string;
  statusFilter?: "unassigned";
  assigneeUserId?: string;
  assigneeFilter?: "unassigned";
  dueFrom?: string;
  dueTo?: string;
  sortBy: TaskTableSortField;
  sortDirection: TaskTableSortDirection;
  page: number;
  pageSize: number;
};

export type TaskTablePage = {
  items: TaskSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type BulkUpdateTasksInput = {
  taskIds: string[];
  statusId?: string | null;
  assigneeUserId?: string | null;
  dueAt?: string | null;
};
