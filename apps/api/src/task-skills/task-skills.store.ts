import type { TaskSkillDetail, TaskSkillSummary } from "./task-skills.contracts.js";

export type TaskSkillsReadStore = {
  listActiveForWorkspace(workspaceId: string, userId: string): Promise<TaskSkillSummary[] | null>;
  getActiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillDetail | null>;
};
