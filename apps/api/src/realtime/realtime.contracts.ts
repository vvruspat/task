import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";

export type WorkspaceRealtimeEventKind =
  | "connected"
  | "changed"
  | "heartbeat"
  | "member_removed"
  | "member_role_changed";

export type WorkspaceMutationKind = "created" | "deleted" | "updated";

export type WorkspaceRealtimeEvent = {
  id: string;
  kind: WorkspaceRealtimeEventKind;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  memberId: string | null;
  memberUserId: string | null;
  memberRole: WorkspaceMemberRole | null;
  mutationKind: WorkspaceMutationKind | null;
  occurredAt: Date;
};

export type PublishWorkspaceMemberChangeInput = {
  workspaceId: string;
  memberId: string;
  memberUserId: string;
  memberRole: WorkspaceMemberRole;
};

export type PublishWorkspaceChangeInput = {
  mutationKind: WorkspaceMutationKind;
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
};

export function workspaceMutationKindForMethod(method: string): WorkspaceMutationKind {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "POST") return "created";
  if (normalizedMethod === "DELETE") return "deleted";
  return "updated";
}
