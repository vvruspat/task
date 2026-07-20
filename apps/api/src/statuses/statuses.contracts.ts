export type WorkspaceStatus = {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  color: string;
  position: string;
  isDone: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateWorkspaceStatusInput = {
  name: string;
  color: string;
  position: string;
  isDone?: boolean;
};

export type UpdateWorkspaceStatusInput = {
  name?: string;
  color?: string;
  position?: string;
  isDone?: boolean;
};

export type ReorderWorkspaceStatusesInput = {
  statusIds: string[];
};
