import type {
  CreateTaskSkillInput,
  TaskSkillDetail,
  TaskSkillSummary,
} from "./task-skills.contracts.js";

export type TaskSkillCreateResult =
  | {
      status: "created";
      taskSkill: TaskSkillDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "duplicate_name";
    };

export type TaskSkillsReadStore = {
  listActiveForWorkspace(workspaceId: string, userId: string): Promise<TaskSkillSummary[] | null>;
  getActiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillDetail | null>;
  createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateTaskSkillInput,
  ): Promise<TaskSkillCreateResult>;
};
