import type { TaskDetail } from "../tasks/tasks.contracts.js";

export type TaskSkillSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  aliases: string[];
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskSkillVersionSummary = {
  id: string;
  workspaceId: string;
  taskSkillId: string;
  version: number;
  definition: TaskSkillDefinition;
  createdByUserId: string;
  createdAt: Date;
};

export type TaskSkillSubtaskDefinition = {
  title: string;
  description?: string | null;
  assigneeUserId?: string | null;
  labels?: string[];
};

export type TaskSkillDefinition = {
  subtasks: TaskSkillSubtaskDefinition[];
};

export type TaskSkillDetail = TaskSkillSummary & {
  versions: TaskSkillVersionSummary[];
};

export type CreateTaskSkillInput = {
  name: string;
  description?: string | null;
  aliases?: string[];
  definition: TaskSkillDefinition;
};

export type CloneTaskSkillInput = {
  name: string;
  description?: string | null;
  aliases?: string[];
};

export type UpdateTaskSkillMetadataInput = {
  name?: string;
  description?: string | null;
  aliases?: string[];
};

export type UpdateTaskSkillDefinitionInput = {
  definition: TaskSkillDefinition;
};

export type TaskSkillApplyPreviewSubtaskSource = "skill" | "added";

export type TaskSkillApplyPreviewSubtask = {
  title: string;
  description: string | null;
  assigneeUserId: string | null;
  labels: string[];
  source: TaskSkillApplyPreviewSubtaskSource;
};

export type TaskSkillApplyPreview = {
  workspaceId: string;
  projectId: string;
  taskSkillId: string;
  taskSkillVersionId: string;
  taskSkillVersion: number;
  rootTaskTitle: string;
  subtasks: TaskSkillApplyPreviewSubtask[];
};

export type TaskSkillApplyResult = {
  workspaceId: string;
  projectId: string;
  taskSkillId: string;
  taskSkillVersionId: string;
  taskSkillVersion: number;
  rootTask: TaskDetail;
  subtasks: TaskDetail[];
};

export type PreviewTaskSkillApplyOverrides = {
  removeSubtasks?: string[];
  addSubtasks?: string[];
};

export type PreviewTaskSkillApplyInput = {
  projectId: string;
  rootTaskTitle: string;
  overrides?: PreviewTaskSkillApplyOverrides;
};
