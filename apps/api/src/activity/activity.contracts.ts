export type TaskActivityEvent = {
  id: string;
  actorUserId: string | null;
  eventType: string;
  entityId: string;
  entityType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};
