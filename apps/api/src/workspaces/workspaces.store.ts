import type { WorkspaceDetail, WorkspaceMember, WorkspaceSummary } from "./workspaces.contracts.js";

export type WorkspaceReadStore = {
  listForUser(userId: string): Promise<WorkspaceSummary[]>;
  getForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null>;
  listMembersForUser(workspaceId: string, userId: string): Promise<WorkspaceMember[] | null>;
};
