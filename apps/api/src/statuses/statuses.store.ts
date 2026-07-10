import type {
  CreateWorkspaceStatusInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";

export type StatusesReadStore = {
  listForWorkspace(workspaceId: string, userId: string): Promise<WorkspaceStatus[] | null>;
};

export type StatusMutationResult =
  | { status: "duplicate_name" | "forbidden" | "status_not_found" }
  | { status: "created" | "updated"; workspaceStatus: WorkspaceStatus };

export type StatusesWriteStore = {
  createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<StatusMutationResult>;
  updateForWorkspace(
    workspaceId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<StatusMutationResult>;
  deleteForWorkspace(
    workspaceId: string,
    statusId: string,
    userId: string,
  ): Promise<StatusMutationResult>;
};
