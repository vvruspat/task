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
