export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "guest";

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

export type StatusRecord = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  position: string;
  isDone: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string | null;
  position: string | null;
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
