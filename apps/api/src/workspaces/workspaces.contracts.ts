import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceDetail = WorkspaceSummary & {
  members: WorkspaceMember[];
};
