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
  definition: Record<string, unknown>;
  createdByUserId: string;
  createdAt: Date;
};

export type TaskSkillDetail = TaskSkillSummary & {
  versions: TaskSkillVersionSummary[];
};

export type CreateTaskSkillInput = {
  name: string;
  description?: string | null;
  aliases?: string[];
  definition: Record<string, unknown>;
};

export type UpdateTaskSkillMetadataInput = {
  name?: string;
  description?: string | null;
  aliases?: string[];
};
