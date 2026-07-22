import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type { WorkspaceMember, WorkspaceSummary } from "../workspaces/workspaces.contracts.js";

export type InvitationRole = Exclude<WorkspaceMemberRole, "owner">;
export type InvitationStatus = "expired" | "pending" | "revoked" | "used";

export type CreateWorkspaceInvitationInput = {
  email: string;
  role: InvitationRole;
};

export type WorkspaceInvitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
};

export type InvitationPreview = {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date;
};

export type AcceptInvitationResult = {
  workspace: WorkspaceSummary;
  member: WorkspaceMember;
};

export type SendInvitationEmailInput = {
  email: string;
  inviterName: string;
  role: InvitationRole;
  token: string;
  workspaceName: string;
};
