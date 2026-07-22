import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";

export type WorkspaceRealtimeEventKind =
  | "connected"
  | "changed"
  | "heartbeat"
  | "member_removed"
  | "member_role_changed";

export type WorkspaceRealtimeEvent = {
  id: string;
  kind: WorkspaceRealtimeEventKind;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  memberId: string | null;
  memberUserId: string | null;
  memberRole: WorkspaceMemberRole | null;
  occurredAt: Date;
};

export type PublishWorkspaceMemberChangeInput = {
  workspaceId: string;
  memberId: string;
  memberUserId: string;
  memberRole: WorkspaceMemberRole;
};

export type PublishWorkspaceChangeInput = {
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
};
