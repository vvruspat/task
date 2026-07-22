import type {
  AcceptInvitationResult,
  InvitationPreview,
  WorkspaceInvitation,
} from "@task/api-client";

export function isWorkspaceInvitations(value: unknown): value is WorkspaceInvitation[] {
  return Array.isArray(value) && value.every(isWorkspaceInvitation);
}

export function isWorkspaceInvitation(value: unknown): value is WorkspaceInvitation {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "email") &&
    isInvitationRole(value["role"]) &&
    isInvitationStatus(value["status"]) &&
    hasString(value, "expiresAt") &&
    hasString(value, "createdAt")
  );
}

export function isInvitationPreview(value: unknown): value is InvitationPreview {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "workspaceId") &&
    hasString(value, "workspaceName") &&
    hasString(value, "email") &&
    isInvitationRole(value["role"]) &&
    isInvitationStatus(value["status"]) &&
    hasString(value, "expiresAt")
  );
}

export function isAcceptInvitationResult(value: unknown): value is AcceptInvitationResult {
  if (!isRecord(value)) return false;
  const workspace = value["workspace"];
  const member = value["member"];
  return isWorkspaceSummary(workspace) && isWorkspaceMember(member);
}

function isWorkspaceSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "slug") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isWorkspaceMember(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const email = value["email"];
  const avatarUrl = value["avatarUrl"];
  const role = value["role"];
  return (
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "userId") &&
    (role === "owner" || isInvitationRole(role)) &&
    hasString(value, "displayName") &&
    (email === null || typeof email === "string") &&
    (avatarUrl === null || typeof avatarUrl === "string") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isInvitationRole(value: unknown): value is WorkspaceInvitation["role"] {
  return value === "admin" || value === "member" || value === "guest";
}

function isInvitationStatus(value: unknown): value is WorkspaceInvitation["status"] {
  return value === "pending" || value === "expired" || value === "used" || value === "revoked";
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
