import type { WorkspaceBootstrap } from "./workspace-contracts";

export type WorkspaceRealtimeConnectionStatus =
  | "connecting"
  | "idle"
  | "live"
  | "offline"
  | "reconnecting";

export type WorkspaceRealtimeConnectionLifecycle = Readonly<{
  hasConnected: boolean;
  status: WorkspaceRealtimeConnectionStatus;
}>;

export type WorkspaceRealtimeOpenTransition = Readonly<{
  lifecycle: WorkspaceRealtimeConnectionLifecycle;
  reconnected: boolean;
}>;

export type WorkspaceRealtimeChange = {
  id: string;
  kind: "changed" | "member_removed" | "member_role_changed";
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  memberId: string | null;
  memberUserId: string | null;
  memberRole: "admin" | "guest" | "member" | "owner" | null;
  occurredAt: string;
};

export function createWorkspaceRealtimeConnectionLifecycle(): WorkspaceRealtimeConnectionLifecycle {
  return { hasConnected: false, status: "connecting" };
}

export function markWorkspaceRealtimeConnected(
  lifecycle: WorkspaceRealtimeConnectionLifecycle,
): WorkspaceRealtimeOpenTransition {
  return {
    lifecycle: { hasConnected: true, status: "live" },
    reconnected: lifecycle.hasConnected,
  };
}

export function markWorkspaceRealtimeInterrupted(
  lifecycle: WorkspaceRealtimeConnectionLifecycle,
  online: boolean,
): WorkspaceRealtimeConnectionLifecycle {
  return {
    ...lifecycle,
    status: online ? "reconnecting" : "offline",
  };
}

export function parseWorkspaceRealtimeChange(value: string): WorkspaceRealtimeChange | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || !hasRealtimeBase(parsed)) return null;
    if (parsed.kind === "changed") {
      if (!hasNullableString(parsed, "projectId") || !hasNullableString(parsed, "taskId")) {
        return null;
      }
      return {
        ...readRealtimeBase(parsed, "changed"),
        projectId: parsed.projectId,
        taskId: parsed.taskId,
        memberId: null,
        memberUserId: null,
        memberRole: null,
      };
    }
    if (parsed.kind !== "member_removed" && parsed.kind !== "member_role_changed") {
      return null;
    }
    if (
      !hasString(parsed, "memberId") ||
      !hasString(parsed, "memberUserId") ||
      !hasWorkspaceMemberRole(parsed, "memberRole")
    ) {
      return null;
    }
    return {
      ...readRealtimeBase(parsed, parsed.kind),
      projectId: null,
      taskId: null,
      memberId: parsed.memberId,
      memberUserId: parsed.memberUserId,
      memberRole: parsed.memberRole,
    };
  } catch {
    return null;
  }
}

export function applyWorkspaceMemberRealtimeChange(
  data: WorkspaceBootstrap,
  change: WorkspaceRealtimeChange,
): WorkspaceBootstrap {
  if (data.workspace.id !== change.workspaceId) return data;
  if (
    change.kind === "member_role_changed" &&
    change.memberId !== null &&
    change.memberRole !== null
  ) {
    const memberRole = change.memberRole;
    return {
      ...data,
      currentMember:
        data.currentMember.id === change.memberId
          ? { ...data.currentMember, role: change.memberRole }
          : data.currentMember,
      workspace: {
        ...data.workspace,
        members: data.workspace.members.map((member) =>
          member.id === change.memberId ? { ...member, role: memberRole } : member,
        ),
      },
    };
  }
  if (change.kind === "member_removed" && change.memberId !== null) {
    return {
      ...data,
      workspace: {
        ...data.workspace,
        members: data.workspace.members.filter((member) => member.id !== change.memberId),
      },
    };
  }
  return data;
}

export function findFallbackWorkspaceId(
  data: WorkspaceBootstrap,
  removedWorkspaceId: string,
): string | null {
  return (
    data.availableWorkspaces.find((workspace) => workspace.id !== removedWorkspaceId)?.id ?? null
  );
}

function readRealtimeBase(
  value: Record<string, unknown>,
  kind: WorkspaceRealtimeChange["kind"],
): Pick<WorkspaceRealtimeChange, "id" | "kind" | "occurredAt" | "workspaceId"> {
  return {
    id: readKnownString(value, "id"),
    kind,
    workspaceId: readKnownString(value, "workspaceId"),
    occurredAt: readKnownString(value, "occurredAt"),
  };
}

function hasRealtimeBase(value: Record<string, unknown>): value is Record<string, unknown> & {
  id: string;
  kind: unknown;
  occurredAt: string;
  workspaceId: string;
} {
  return (
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "occurredAt") &&
    "kind" in value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString<K extends string>(
  value: Record<string, unknown>,
  key: K,
): value is Record<string, unknown> & Record<K, string> {
  return typeof value[key] === "string";
}

function hasNullableString<K extends string>(
  value: Record<string, unknown>,
  key: K,
): value is Record<string, unknown> & Record<K, string | null> {
  return value[key] === null || typeof value[key] === "string";
}

function hasWorkspaceMemberRole<K extends string>(
  value: Record<string, unknown>,
  key: K,
): value is Record<string, unknown> & Record<K, "admin" | "guest" | "member" | "owner"> {
  const role = value[key];
  return role === "owner" || role === "admin" || role === "member" || role === "guest";
}

function readKnownString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  return typeof result === "string" ? result : "";
}
