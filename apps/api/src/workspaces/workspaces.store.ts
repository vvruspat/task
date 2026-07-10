import type {
  UpdateWorkspaceMemberRoleInput,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from "./workspaces.contracts.js";

export type WorkspaceReadStore = {
  listForUser(userId: string): Promise<WorkspaceSummary[]>;
  getForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null>;
  listMembersForUser(workspaceId: string, userId: string): Promise<WorkspaceMember[] | null>;
};

export type WorkspaceMemberRoleUpdateResult =
  | { status: "forbidden" | "member_not_found" }
  | { member: WorkspaceMember; status: "updated" };

export type WorkspaceMemberManagementStore = {
  updateMemberRole(
    workspaceId: string,
    memberId: string,
    userId: string,
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberRoleUpdateResult>;
};
