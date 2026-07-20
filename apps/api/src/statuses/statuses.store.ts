import type {
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";

export type StatusesReadStore = {
  listForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<WorkspaceStatus[] | null>;
};

export type StatusMutationResult =
  | { status: "duplicate_name" | "forbidden" | "invalid_order" | "status_not_found" }
  | { status: "created" | "updated"; workspaceStatus: WorkspaceStatus };

export type StatusReorderResult =
  | { status: "forbidden" | "invalid_order" }
  | { status: "reordered"; workspaceStatuses: WorkspaceStatus[] };

export type StatusesWriteStore = {
  createForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<StatusMutationResult>;
  updateForProject(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<StatusMutationResult>;
  deleteForProject(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
  ): Promise<StatusMutationResult>;
  reorderForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: ReorderWorkspaceStatusesInput,
  ): Promise<StatusReorderResult>;
};
