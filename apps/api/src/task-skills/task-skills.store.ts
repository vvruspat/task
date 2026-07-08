import type {
  CloneTaskSkillInput,
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  TaskSkillApplyPreview,
  TaskSkillApplyResult,
  TaskSkillDetail,
  TaskSkillSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
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

export type TaskSkillCloneResult =
  | {
      status: "cloned";
      taskSkill: TaskSkillDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "task_skill_not_found";
    }
  | {
      status: "duplicate_name";
    };

export type TaskSkillMetadataUpdateResult =
  | {
      status: "updated";
      taskSkill: TaskSkillDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "task_skill_not_found";
    }
  | {
      status: "duplicate_name";
    };

export type TaskSkillDefinitionUpdateResult =
  | {
      status: "updated";
      taskSkill: TaskSkillDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "task_skill_not_found";
    };

export type TaskSkillArchiveResult =
  | {
      status: "archived";
      taskSkill: TaskSkillDetail;
    }
  | {
      status: "workspace_not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "task_skill_not_found";
    };

export type TaskSkillApplyPreviewResult =
  | {
      status: "previewed";
      preview: TaskSkillApplyPreview;
    }
  | {
      status: "not_found";
    }
  | {
      status: "invalid_definition";
    };

export type TaskSkillApplyForWorkspaceResult =
  | {
      status: "applied";
      result: TaskSkillApplyResult;
    }
  | {
      status: "not_found";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "invalid_definition";
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
  cloneForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: CloneTaskSkillInput,
  ): Promise<TaskSkillCloneResult>;
  updateMetadataForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: UpdateTaskSkillMetadataInput,
  ): Promise<TaskSkillMetadataUpdateResult>;
  updateDefinitionForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: UpdateTaskSkillDefinitionInput,
  ): Promise<TaskSkillDefinitionUpdateResult>;
  archiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillArchiveResult>;
  previewApplyForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyPreviewResult>;
  applyForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyForWorkspaceResult>;
};
