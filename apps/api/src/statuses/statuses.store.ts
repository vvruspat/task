import type { WorkspaceStatus } from "./statuses.contracts.js";

export type StatusesReadStore = {
  listForWorkspace(workspaceId: string, userId: string): Promise<WorkspaceStatus[] | null>;
};
