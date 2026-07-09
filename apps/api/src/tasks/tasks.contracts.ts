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

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
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
