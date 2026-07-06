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
