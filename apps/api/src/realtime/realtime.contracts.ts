export type WorkspaceRealtimeEventKind = "connected" | "changed" | "heartbeat";

export type WorkspaceRealtimeEvent = {
  id: string;
  kind: WorkspaceRealtimeEventKind;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  occurredAt: Date;
};

export type PublishWorkspaceChangeInput = {
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
};
