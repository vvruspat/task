import type { TaskSkillSummary } from "./task-skills.contracts.js";

export type TaskSkillsReadStore = {
  listActiveForWorkspace(workspaceId: string, userId: string): Promise<TaskSkillSummary[] | null>;
};
