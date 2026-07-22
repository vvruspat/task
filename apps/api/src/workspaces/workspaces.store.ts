import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";

export type WorkspaceReadStore = {
  listForUser(userId: string): Promise<WorkspaceSummary[]>;
  getRoleForUser(workspaceId: string, userId: string): Promise<WorkspaceMember["role"] | null>;
  getForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null>;
  listMembersForUser(workspaceId: string, userId: string): Promise<WorkspaceMember[] | null>;
};

export type WorkspaceMemberRoleUpdateResult =
  | { status: "forbidden" | "member_not_found" }
  | { member: WorkspaceMember; status: "updated" };

export type WorkspaceMemberRemovalResult =
  | { status: "forbidden" | "member_not_found" }
  | { member: WorkspaceMember; status: "removed" };

export type WorkspaceMemberManagementStore = {
  removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<WorkspaceMemberRemovalResult>;
  updateMemberRole(
    workspaceId: string,
    memberId: string,
    userId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberRoleUpdateResult>;
};

export type WorkspaceUpdateResult =
  | { status: "forbidden" | "workspace_not_found" }
  | { status: "updated"; workspace: WorkspaceDetail };

export type WorkspaceDeleteResult =
  | { status: "forbidden" | "workspace_not_found" }
  | { status: "deleted"; workspace: WorkspaceSummary };

export type WorkspaceManagementStore = {
  createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceDetail | null>;
  deleteWorkspace(workspaceId: string, userId: string): Promise<WorkspaceDeleteResult>;
  updateWorkspace(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceUpdateResult>;
};
